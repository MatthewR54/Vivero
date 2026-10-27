import { supabase } from './supabaseClient';

// ============================================================
// Mapeo de movimientos de inventario (Kardex) — RF-24 a RF-30
// ============================================================

export function inventoryMovementFromDb(row) {
  const createdAt = row.created_at ?? new Date().toISOString();
  const dateObj = new Date(createdAt);
  const pad = (n) => String(n).padStart(2, '0');
  const localDate = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
  const localTime = `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;

  return {
    id: row.id,
    productId: row.product_id,
    productName: row.products?.name ?? '',
    productSku: row.products?.sku ?? row.product_id,
    movementType: row.movement_type,
    quantity: Number(row.quantity),
    previousStock: Number(row.previous_stock),
    resultingStock: Number(row.resulting_stock),
    reason: row.reason ?? '',
    referenceId: row.reference_id ?? '',
    date: localDate,
    time: localTime,
    createdAt
  };
}

export async function fetchInventoryMovements() {
  const { data, error } = await supabase
    .from('inventory_movements')
    .select('*, products(name, sku)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase] No se pudieron cargar los movimientos de inventario:', error);
    throw new Error(error.message);
  }
  return data.map(inventoryMovementFromDb);
}

/**
 * RF-26 y RF-27: Registra un ajuste manual de inventario (entrada o salida),
 * actualiza products.current_stock y deja trazabilidad en inventory_movements.
 */
export async function adjustProductStock({
  product,
  direction, // 'ENTRADA' | 'SALIDA'
  quantity,
  reasonCategory,
  notes
}) {
  if (!product || !product.id) {
    throw new Error('Producto no válido para el ajuste de stock');
  }

  const qty = Math.floor(Number(quantity));
  if (!qty || Number.isNaN(qty) || qty <= 0) {
    throw new Error('La cantidad del ajuste debe ser un número entero mayor a 0');
  }

  const cleanReason = [reasonCategory, (notes ?? '').trim()]
    .filter(Boolean)
    .join(': ')
    .trim();

  if (!cleanReason) {
    throw new Error('El motivo del ajuste de inventario es obligatorio (RF-27)');
  }

  const previousStock = Number(product.stock) || 0;
  const isEntry = direction === 'ENTRADA';
  const signedQuantity = isEntry ? qty : -qty;
  const resultingStock = previousStock + signedQuantity;

  if (resultingStock < 0) {
    throw new Error(
      `No se pueden descontar ${qty} unidades de "${product.name}" (Stock actual: ${previousStock} uds)`
    );
  }

  const movementType = isEntry ? 'AJUSTE_MANUAL_ENTRADA' : 'AJUSTE_MANUAL_SALIDA';
  const refCode = `AJU-${Date.now().toString().slice(-6)}`;

  const { error: prodErr } = await supabase
    .from('products')
    .update({ current_stock: resultingStock })
    .eq('id', product.id);

  if (prodErr) {
    console.error('[Supabase] Error al actualizar stock en ajuste manual:', prodErr);
    throw new Error(prodErr.message);
  }

  const { data: movRow, error: movErr } = await supabase
    .from('inventory_movements')
    .insert({
      product_id: product.id,
      movement_type: movementType,
      quantity: signedQuantity,
      previous_stock: previousStock,
      resulting_stock: resultingStock,
      reason: cleanReason,
      reference_id: refCode
    })
    .select('*, products(name, sku)')
    .single();

  if (movErr) {
    console.error('[Supabase] Error al registrar el movimiento en el Kardex:', movErr);
    throw new Error(movErr.message);
  }

  return inventoryMovementFromDb(movRow);
}
