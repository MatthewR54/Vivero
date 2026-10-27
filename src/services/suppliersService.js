import { supabase } from './supabaseClient';

// ============================================================
// Mapeo entre la base de datos (snake_case) y el frontend (camelCase)
// Tabla: public.suppliers (RF-10 a RF-14)
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

export async function fetchPurchases() {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, suppliers(name), accounts(name), purchase_items(*, products(name, sku))')
    .order('purchase_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) fail(error, 'No se pudo cargar el historial de compras');
  return (data || []).map(purchaseFromDb);
}
