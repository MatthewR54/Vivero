import { supabase } from './supabaseClient';

// ============================================================
// Mapeo de ventas: BD (sales + sale_items) -> forma que usan las páginas
// ============================================================

export function saleFromDb(row) {
  return {
    id: row.id,
    date: row.sale_date,
    time: (row.sale_time ?? '').slice(0, 5),
    customer: {
      name: row.customer_name,
      document: row.customer_document ?? '',
      phone: row.customer_phone ?? '',
      email: row.customer_email ?? ''
    },
    items: (row.sale_items ?? []).map(i => ({
      productId: i.product_id,
      name: i.product_name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      unitCost: Number(i.unit_cost),
      subtotal: Number(i.subtotal)
    })),
    paymentMethod: row.payment_method,
    channel: row.sale_channel ?? 'PRESENCIAL',
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total)
  };
}

export function customMerchOrderFromDb(row) {
  const specs = row.custom_specifications ?? {};
  const units = Number(row.units) || 1;
  const baseCost = Number(specs.baseCost ?? row.base_price) || 0;
  const customCost = Number(specs.customCost ?? row.custom_costs) || 0;
  const totalUnitCost = Number(specs.totalUnitCost ?? (baseCost + customCost));
  const finalUnitPrice = Number(row.final_sale_price) || 0;
  const unitProfit = finalUnitPrice - totalUnitCost;
  const estimatedProfit = Number(row.estimated_profit ?? (unitProfit * units));
  const marginPercent = finalUnitPrice > 0
    ? Math.round((unitProfit / finalUnitPrice) * 1000) / 10
    : 0;
  const createdAt = row.created_at ?? new Date().toISOString();

  return {
    id: row.id,
    saleId: row.sale_id ?? '',
    baseProductId: row.base_product_id ?? '',
    productName: specs.productName || row.products?.name || 'Merchandising Personalizado',
    customerName: row.customer_name || 'Consumidor Final',
    units,
    baseCost,
    customCost,
    totalUnitCost,
    finalUnitPrice,
    totalSaleAmount: finalUnitPrice * units,
    unitProfit,
    estimatedProfit,
    marginPercent,
    size: specs.size || 'Estándar',
    color: specs.color || '',
    technique: specs.technique || 'Personalización Social',
    designNotes: specs.designNotes || '',
    status: row.status || 'ENTREGADO',
    date: specs.date || createdAt.slice(0, 10),
    createdAt
  };
}

export async function fetchSales() {
  const { data, error } = await supabase
    .from('sales')
    .select('*, sale_items(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] No se pudieron cargar las ventas:', error);
    throw new Error(error.message);
  }
  return data.map(saleFromDb);
}

export async function fetchCustomMerchOrders() {
  const { data, error } = await supabase
    .from('custom_merch_orders')
    .select('*, products(name, sku)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] No se pudieron cargar los pedidos de merchandising personalizado:', error);
    throw new Error(error.message);
  }
  return data.map(customMerchOrderFromDb);
}

/**
 * RF-61 a RF-70 y RF-51 a RF-60: registra la venta en una sola transacción en PostgreSQL
 * (función process_sale_transaction). Si la venta incluye artículos personalizados de
 * merchandising, guarda el detalle en custom_merch_orders y actualiza sale_items con
 * la especificación del comprobante y el costo real de personalización.
 */
export async function createSale(saleData) {
  const payload = {
    customer: saleData.customer,
    items: saleData.items.map(i => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice
    })),
    paymentMethod: saleData.paymentMethod,
    channel: saleData.channel ?? 'PRESENCIAL',
    discount: Number(saleData.discount) || 0
  };

  const { data, error } = await supabase.rpc('process_sale_transaction', { payload });

  if (error) {
    console.error('[Supabase] Error al registrar la venta:', error);
    throw new Error(error.message);
  }

  // Persistir órdenes de merchandising personalizado (RF-53 a RF-60)
  const customItems = (saleData.items ?? []).filter(i => Boolean(i.customization));
  if (customItems.length > 0 && data?.saleId) {
    const customRows = customItems.map(item => {
      const cust = item.customization;
      const baseCost = Number(cust.baseCost) || 0;
      const customCost = Number(cust.customCost) || 0;
      const totalUnitCost = Number(cust.totalUnitCost ?? (baseCost + customCost));
      const finalUnitPrice = Number(item.unitPrice) || 0;
      const unitProfit = finalUnitPrice - totalUnitCost;
      const totalProfit = unitProfit * Number(item.quantity);

      return {
        base_product_id: item.productId,
        sale_id: data.saleId,
        customer_name: saleData.customer?.name?.trim() || 'Consumidor Final',
        units: Number(item.quantity),
        base_price: baseCost,
        custom_costs: customCost,
        final_sale_price: finalUnitPrice,
        estimated_profit: totalProfit,
        custom_specifications: {
          ...cust,
          productName: item.baseName || item.name,
          date: data.date
        },
        status: cust.status || 'ENTREGADO'
      };
    });

    const { error: merchErr } = await supabase
      .from('custom_merch_orders')
      .insert(customRows);

    if (merchErr) {
      console.error('[Supabase] Aviso: no se pudo guardar en custom_merch_orders:', merchErr);
    }

    // Actualizar nombre con especificaciones y costo unitario real en sale_items (RF-58, RF-60)
    for (const item of customItems) {
      const cust = item.customization;
      const totalUnitCost = Number(cust.totalUnitCost ?? ((Number(cust.baseCost) || 0) + (Number(cust.customCost) || 0)));
      await supabase
        .from('sale_items')
        .update({
          product_name: item.name.slice(0, 200),
          unit_cost: totalUnitCost
        })
        .eq('sale_id', data.saleId)
        .eq('product_id', item.productId)
        .eq('unit_price', item.unitPrice);
    }
  }

  return data; // { success, saleId, date, time, subtotal, discount, total }
}
