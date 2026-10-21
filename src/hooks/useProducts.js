import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProducts, updateProductStock } from '../services/productsService';

export function useProducts() {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  });

  const updateStockMutation = useMutation({
    mutationFn: updateProductStock,
    onSuccess: () => {
      // Invalida la caché para que la tabla de inventario se actualice sola
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  return {
    products: productsQuery.data ?? [],
    isLoading: productsQuery.isLoading,
    isError: productsQuery.isError,
    error: productsQuery.error,
    updateStock: updateStockMutation.mutate,
  };
}
