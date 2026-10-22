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
    channel: row.sale_channel,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total)
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

/**
 * RF-61 a RF-70: registra la venta en una sola transacción en PostgreSQL
 * (función process_sale_transaction). La BD genera el número VTA-XXXX,
 * recalcula totales, descuenta stock, escribe el Kardex y suma el dinero
 * a la cuenta del medio de pago. Si algo falla, no se guarda nada.
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
    discount: saleData.discount ?? 0
  };

  const { data, error } = await supabase.rpc('process_sale_transaction', { payload });

  if (error) {
    console.error('[Supabase] Error al registrar la venta:', error);
    throw new Error(error.message);
  }
  return data; // { success, saleId, date, time, subtotal, discount, total }
}
