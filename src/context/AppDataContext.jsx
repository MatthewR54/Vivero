import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  seedProducts, seedSales, seedCustomers, seedTransactions,
  seedAlerts, seedStatistics, seedNextSaleId, seedNextProductId
} from '../data/seedData';
import { getStockStatus, generateSaleId, generateSKU, getTodayString, getCurrentTime, summarizeItems } from '../utils/calculations';
import { isSupabaseConfigured } from '../services/supabaseClient';
import {
  fetchProducts,
  createProduct as createProductDb,
  updateProduct as updateProductDb
} from '../services/productsService';
import { fetchSales, createSale as createSaleDb } from '../services/salesService';

// ============================================================
// FUENTE DE DATOS
// - Con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY configuradas:
//   productos y ventas se leen y escriben en Supabase (PostgreSQL).
// - Sin ellas: modo local con localStorage (comportamiento original),
//   útil para trabajar en diseño sin credenciales.
//
// Dashboard / Estadísticas (transactions, alerts, statistics) siguen
// con datos de ejemplo locales; se migran en los tickets de esos módulos.
// ============================================================

const USE_SUPABASE = isSupabaseConfigured;

const AppDataContext = createContext();

const STORAGE_KEY = 'vivero_colibri_data';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

function freshLocalData() {
  return {
    products: seedProducts,
    sales: seedSales,
    customers: seedCustomers,
    transactions: seedTransactions,
    alerts: seedAlerts,
    statistics: seedStatistics,
    nextSaleId: seedNextSaleId,
    nextProductId: { ...seedNextProductId }
  };
}

const SKU_PREFIX_TO_CATEGORY = { VIV: 'vivero', MER: 'merchandising', PRD: 'comestibles' };

/** Siguiente número de SKU por categoría, calculado a partir de los productos de la BD. */
function deriveNextProductId(products) {
  const next = { vivero: 1, merchandising: 1, comestibles: 1 };
  for (const p of products) {
    const match = /^([A-Z]+)-(\d+)$/.exec(p.sku ?? '');
    if (!match) continue;
    const category = SKU_PREFIX_TO_CATEGORY[match[1]];
    if (category) next[category] = Math.max(next[category], Number(match[2]) + 1);
  }
  return next;
}

/** Actualiza los datos de ejemplo del Dashboard/Estadísticas tras una venta. */
function applySaleToSummary(prev, sale, productsAfterSale) {
  const newTransaction = {
    id: sale.id,
    type: 'venta',
    summary: summarizeItems(sale.items),
    time: sale.time,
    method: sale.paymentMethod,
    amount: sale.total
  };

  const newStats = { ...prev.statistics };
  newStats.totalIngresos += sale.total;
  newStats.gananciaNeta = newStats.totalIngresos - newStats.totalEgresos;
  newStats.margenGlobal = Math.round((newStats.gananciaNeta / newStats.totalIngresos) * 1000) / 10;
  newStats.transaccionesCount += 1;

  const updatedAlerts = prev.alerts.map(a => {
    if (a.productId) {
      const prod = productsAfterSale.find(p => p.id === a.productId);
      if (prod && getStockStatus(prod.stock, prod.minStock) === 'critico') {
        return { ...a, description: `Quedan ${prod.stock} unidades (Stock mínimo configurado: ${prod.minStock}). Requiere reabastecimiento.` };
      }
    }
    return a;
  });

  return {
    ...prev,
    transactions: [newTransaction, ...prev.transactions],
    statistics: newStats,
    alerts: updatedAlerts
  };
}

function deductStock(products, items) {
  return products.map(p => {
    const item = items.find(i => i.productId === p.id);
    return item ? { ...p, stock: Math.max(0, p.stock - item.quantity) } : p;
  });
}

export function AppDataProvider({ children }) {
  const queryClient = useQueryClient();
  const [data, setData] = useState(() => loadFromStorage() ?? freshLocalData());
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  // ---------- Lecturas desde Supabase ----------
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    enabled: USE_SUPABASE
  });

  const salesQuery = useQuery({
    queryKey: ['sales'],
    queryFn: fetchSales,
    enabled: USE_SUPABASE
  });

  const products = useMemo(
    () => (USE_SUPABASE ? productsQuery.data ?? [] : data.products),
    [productsQuery.data, data.products]
  );
  const sales = USE_SUPABASE ? salesQuery.data ?? [] : data.sales;
  const nextProductId = useMemo(
    () => (USE_SUPABASE ? deriveNextProductId(products) : data.nextProductId),
    [products, data.nextProductId]
  );

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  // ---------- Ventas ----------
  /**
   * Registra una venta. Devuelve { saleId } o lanza un Error con el mensaje
   * de la base de datos (p. ej. "Stock insuficiente para ...").
   */
  const addSale = useCallback(async (saleData) => {
    if (USE_SUPABASE) {
      const result = await createSaleDb(saleData);
      const sale = {
        id: result.saleId,
        time: result.time,
        items: saleData.items,
        paymentMethod: saleData.paymentMethod,
        total: Number(result.total)
      };
      setData(prev => applySaleToSummary(prev, sale, deductStock(products, saleData.items)));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] })
      ]);
      return { saleId: result.saleId };
    }

    // Modo local (localStorage)
    const saleId = generateSaleId(data.nextSaleId);
    setData(prev => {
      const newProducts = deductStock(prev.products, saleData.items);
      const newSale = {
        id: saleId,
        date: getTodayString(),
        time: getCurrentTime(),
        customer: saleData.customer,
        items: saleData.items,
        paymentMethod: saleData.paymentMethod,
        total: saleData.total
      };
      return {
        ...applySaleToSummary(prev, newSale, newProducts),
        products: newProducts,
        sales: [newSale, ...prev.sales],
        nextSaleId: prev.nextSaleId + 1
      };
    });
    return { saleId };
  }, [products, queryClient, data.nextSaleId]);

  // ---------- Productos ----------
  const addProduct = useCallback(async (productData) => {
    const cat = productData.category || 'comestibles';

    if (USE_SUPABASE) {
      const sku = productData.sku || generateSKU(cat, nextProductId[cat] || 1);
      const created = await createProductDb({
        ...productData,
        sku,
        category: cat,
        stock: productData.stock || 0,
        minStock: productData.minStock || 5,
        cost: productData.cost || 0,
        price: productData.price || 0,
        active: true
      });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      return created;
    }

    setData(prev => {
      const nextNum = (prev.nextProductId[cat] || 1);
      const sku = productData.sku || generateSKU(cat, nextNum);
      const newProduct = {
        id: sku,
        sku,
        name: productData.name,
        category: cat,
        origin: productData.origin || '',
        stock: productData.stock || 0,
        minStock: productData.minStock || 5,
        cost: productData.cost || 0,
        price: productData.price || 0,
        active: true,
        location: productData.location || '',
        unit: productData.unit || 'Unidad',
        description: productData.description || ''
      };
      return {
        ...prev,
        products: [...prev.products, newProduct],
        nextProductId: { ...prev.nextProductId, [cat]: nextNum + 1 }
      };
    });
  }, [nextProductId, queryClient]);

  const updateProduct = useCallback(async (productId, updates) => {
    if (USE_SUPABASE) {
      const updated = await updateProductDb({ id: productId, updates });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      return updated;
    }

    setData(prev => ({
      ...prev,
      products: prev.products.map(p => (p.id === productId ? { ...p, ...updates } : p))
    }));
  }, [queryClient]);

  const resetDemoData = useCallback(() => {
    setData(freshLocalData());
  }, []);

  const dataStatus = {
    source: USE_SUPABASE ? 'supabase' : 'local',
    isLoading: USE_SUPABASE && (productsQuery.isLoading || salesQuery.isLoading),
    error: USE_SUPABASE ? (productsQuery.error || salesQuery.error) : null,
    retry: () => {
      productsQuery.refetch();
      salesQuery.refetch();
    }
  };

  const value = {
    ...data,
    products,
    sales,
    nextProductId,
    dataStatus,
    toasts,
    showToast,
    addSale,
    addProduct,
    updateProduct,
    resetDemoData
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
