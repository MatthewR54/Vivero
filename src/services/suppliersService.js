import { supabase } from './supabaseClient';
import { calculateWeightedAverageCost, getTodayString } from '../utils/calculations';

// ============================================================
// Mapeo entre la base de datos (snake_case) y el frontend (camelCase)
// Tablas: public.suppliers y public.purchases (RF-10 a RF-22)
// ============================================================

export function supplierFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name ?? '',
    phone: row.phone ?? '',
    email: row.email ?? '',
    address: row.address ?? '',
    active: row.active !== false,
    createdAt: row.created_at
  };
}

export function supplierToDb(supplier) {
  const map = {
    name: 'name',
    contactName: 'contact_name',
    phone: 'phone',
    email: 'email',
    address: 'address',
    active: 'active'
  };
  const row = {};
  for (const [front, db] of Object.entries(map)) {
    if (supplier[front] !== undefined) {
      row[db] = supplier[front];
    }
  }
  return row;
}

export function purchaseFromDb(row) {
  const items = (row.purchase_items || []).map(item => ({
    id: item.id,
    productId: item.product_id,
    productName: item.products?.name ?? item.product_id,
    sku: item.products?.sku ?? item.product_id,
    quantity: Number(item.quantity),
    unitCost: Number(item.unit_cost),
    subtotal: Number(item.subtotal)
  }));

  return {
    id: row.id,
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.name ?? '',
    invoiceNumber: row.invoice_number ?? '',
    date: row.purchase_date,
    totalCost: Number(row.total_cost),
    accountId: row.account_id,
    accountName: row.accounts?.name ?? '',
    notes: row.notes ?? '',
    items,
    createdAt: row.created_at
  };
}

function fail(error, context) {
  console.error(`[Supabase] ${context}:`, error);
  throw new Error(error.message || context);
}

// ============================================================
// Consultas y Mutaciones de Proveedores (RF-10 a RF-14)
// ============================================================

export async function fetchSuppliers() {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('id', { ascending: true });

  if (error) fail(error, 'No se pudieron cargar los proveedores');
  return (data || []).map(supplierFromDb);
}

export async function createSupplier(supplier) {
  const row = supplierToDb({
    name: supplier.name?.trim(),
    contactName: supplier.contactName?.trim() || null,
    phone: supplier.phone?.trim() || null,
    email: supplier.email?.trim() || null,
    address: supplier.address?.trim() || null,
    active: supplier.active !== false
  });

  const { data, error } = await supabase
    .from('suppliers')
    .insert(row)
    .select('*')
    .single();

  if (error) fail(error, 'No se pudo registrar el proveedor');
  return supplierFromDb(data);
}

export async function updateSupplierInDb({ id, updates }) {
  const row = {
    ...supplierToDb(updates),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('suppliers')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();

  if (error) fail(error, 'No se pudo actualizar el proveedor');
  return supplierFromDb(data);
}

// ============================================================
// Consultas y Mutaciones de Compras (RF-15 a RF-22, RF-33, RF-96)
// ============================================================

export async function fetchPurchases() {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, suppliers(name), accounts(name), purchase_items(*, products(name, sku))')
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) fail(error, 'No se pudo cargar el historial de compras');
  return (data || []).map(purchaseFromDb);
}

export async function createPurchase({
  supplierId,
  supplierName,
  invoiceNumber,
  purchaseDate,
  accountId,
  notes,
  items,
  productsById,
  accountsById
}) {
  if (!supplierId) {
    throw new Error('Selecciona el proveedor de la compra');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('La compra debe incluir al menos un producto');
  }

  const normalizedItems = items.map(item => {
    const qty = Math.floor(Number(item.quantity));
    const unitCost = Number(item.unitCost);
    if (!item.productId || !qty || qty <= 0) {
      throw new Error('Todas las líneas deben tener una cantidad válida mayor a 0');
    }
    if (Number.isNaN(unitCost) || unitCost < 0) {
      throw new Error('El costo unitario de compra no puede ser negativo');
    }
    return {
      productId: item.productId,
      quantity: qty,
      unitCost,
      subtotal: qty * unitCost
    };
  });

  const totalCost = normalizedItems.reduce((sum, it) => sum + it.subtotal, 0);
  const dateStr = purchaseDate || getTodayString();
  const cleanInvoice = invoiceNumber?.trim() || `CMP-${Date.now().toString().slice(-6)}`;

  // 1. Insertar encabezado de compra en public.purchases
  const { data: purchaseRow, error: purErr } = await supabase
    .from('purchases')
    .insert({
      supplier_id: Number(supplierId),
      invoice_number: cleanInvoice,
      purchase_date: dateStr,
      total_cost: totalCost,
      account_id: accountId ? Number(accountId) : null,
      notes: notes?.trim() || null
    })
    .select('*')
    .single();

  if (purErr) fail(purErr, 'No se pudo registrar el encabezado de la compra');

  // 2. Insertar detalle en public.purchase_items
  const itemsPayload = normalizedItems.map(it => ({
    purchase_id: purchaseRow.id,
    product_id: it.productId,
    quantity: it.quantity,
    unit_cost: it.unitCost,
    subtotal: it.subtotal
  }));

  const { error: itemsErr } = await supabase
    .from('purchase_items')
    .insert(itemsPayload);

  if (itemsErr) fail(itemsErr, 'No se pudo registrar el detalle de productos comprados');

  // 3. Actualizar stock, costo promedio ponderado (RF-33) y Kardex (RF-24) por cada producto
  for (const it of normalizedItems) {
    const currentProd = productsById?.get(it.productId);
    const previousStock = Number(currentProd?.stock) || 0;
    const currentCost = Number(currentProd?.cost) || 0;
    const resultingStock = previousStock + it.quantity;
    const newAverageCost = calculateWeightedAverageCost(
      previousStock,
      currentCost,
      it.quantity,
      it.unitCost
    );

    const productUpdates = {
      current_stock: resultingStock,
      base_cost: newAverageCost
    };
    if (!currentProd?.supplierId) {
      productUpdates.supplier_id = Number(supplierId);
    }

    const { error: prodUpdateErr } = await supabase
      .from('products')
      .update(productUpdates)
      .eq('id', it.productId);

    if (prodUpdateErr) fail(prodUpdateErr, `Error al actualizar stock del producto ${it.productId}`);

    const { error: movErr } = await supabase
      .from('inventory_movements')
      .insert({
        product_id: it.productId,
        movement_type: 'ENTRADA_COMPRA',
        quantity: it.quantity,
        previous_stock: previousStock,
        resulting_stock: resultingStock,
        reason: `Compra a ${supplierName || 'proveedor'} (Factura ${cleanInvoice}) a $${it.unitCost.toLocaleString('es-CO')}/ud`,
        reference_id: cleanInvoice
      });

    if (movErr) fail(movErr, 'Error al registrar entrada por compra en Kardex');
  }

  // 4. Descontar dinero de la cuenta seleccionada y registrar movimiento EGRESO_COMPRA (RF-96)
  if (accountId && totalCost > 0) {
    const targetAcc = accountsById?.get(Number(accountId));
    const currentBalance = Number(targetAcc?.balance) || 0;
    const newBalance = currentBalance - totalCost;

    const { error: accErr } = await supabase
      .from('accounts')
      .update({
        current_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', Number(accountId));

    if (accErr) fail(accErr, 'Error al actualizar el saldo de la cuenta de pago');

    const { error: mmErr } = await supabase
      .from('money_movements')
      .insert({
        account_id: Number(accountId),
        movement_type: 'EGRESO_COMPRA',
        amount: -totalCost,
        concept: `Compra factura ${cleanInvoice} (${supplierName || 'Proveedor'})`,
        reference_id: cleanInvoice,
        movement_date: dateStr
      });

    if (mmErr) fail(mmErr, 'Error al registrar el egreso monetario de la compra');
  }

  return purchaseRow;
}
