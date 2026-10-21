import { supabase } from './supabaseClient';

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

export async function updateProductStock({ id, newStock }) {
  const { data, error } = await supabase
    .from('products')
    .update({ current_stock: newStock })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
