import { supabase } from './supabaseClient';

// ============================================================
// Mapeo entre la base de datos (snake_case) y el frontend (camelCase)
//
//   BD (products)        Frontend
//   current_stock   <->  stock
//   min_stock       <->  minStock
//   base_cost       <->  cost
//   base_price      <->  price
//   category_id     <->  category ('vivero' | 'merchandising' | 'comestibles')
// ============================================================

export function productFromDb(row) {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    category: row.categories?.name ?? 'comestibles',
    origin: row.origin,
    stock: row.current_stock,
    minStock: row.min_stock,
    cost: Number(row.base_cost),
    price: Number(row.base_price),
    active: row.active,
    location: row.location ?? '',
    unit: row.unit ?? 'Unidad',
    description: row.description ?? '',
    supplierId: row.supplier_id
  };
}

/** Convierte solo los campos presentes (sirve para crear y para actualizar). */
export function productToDb(product) {
  const map = {
    sku: 'sku',
    name: 'name',
    origin: 'origin',
    stock: 'current_stock',
    minStock: 'min_stock',
    cost: 'base_cost',
    price: 'base_price',
    active: 'active',
    location: 'location',
    unit: 'unit',
    description: 'description',
    supplierId: 'supplier_id'
  };
  const row = {};
  for (const [front, db] of Object.entries(map)) {
    if (product[front] !== undefined) row[db] = product[front];
  }
  return row;
}

function fail(error, context) {
  console.error(`[Supabase] ${context}:`, error);
  throw new Error(error.message || context);
}

// ============================================================
// Consultas
// ============================================================

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .order('name', { ascending: true });

  if (error) fail(error, 'No se pudieron cargar los productos');
  return data.map(productFromDb);
}

async function getCategoryId(categoryName) {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('name', categoryName)
    .single();

  if (error) fail(error, `No existe la categoría "${categoryName}"`);
  return data.id;
}

// ============================================================
// Mutaciones
// ============================================================

/** RF-01: registrar producto. El stock inicial queda en el Kardex por trigger. */
export async function createProduct(product) {
  const row = {
    ...productToDb(product),
    id: product.sku,
    category_id: await getCategoryId(product.category)
  };

  const { data, error } = await supabase
    .from('products')
    .insert(row)
    .select('*, categories(name)')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error(`Ya existe un producto con el SKU ${product.sku}. Recarga la página e intenta de nuevo.`);
    }
    fail(error, 'No se pudo registrar el producto');
  }
  return productFromDb(data);
}

/** RF-02 / RF-08: modificar producto (nombre, precios, stock mínimo, activo...). */
export async function updateProduct({ id, updates }) {
  const row = productToDb(updates);
  if (updates.category !== undefined) {
    row.category_id = await getCategoryId(updates.category);
  }

  const { data, error } = await supabase
    .from('products')
    .update(row)
    .eq('id', id)
    .select('*, categories(name)')
    .single();

  if (error) fail(error, 'No se pudo actualizar el producto');
  return productFromDb(data);
}

export async function updateProductStock({ id, newStock }) {
  return updateProduct({ id, updates: { stock: newStock } });
}
