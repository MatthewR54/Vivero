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
import {
  fetchAccounts,
  fetchMoneyMovements,
  fetchReconciliations,
  fetchProductionBatches
} from '../services/financeService';

// ============================================================
// FUENTE DE DATOS
// - Con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY configuradas:
//   productos, ventas, cuentas, movimientos monetarios, conciliaciones
//   y lotes de producción se leen y escriben en Supabase (PostgreSQL).
// - Sin ellas: modo local con localStorage (comportamiento original),
//   útil para trabajar en diseño sin credenciales.
// ============================================================

const USE_SUPABASE = isSupabaseConfigured;

const AppDataContext = createContext();

const STORAGE_KEY = 'vivero_colibri_data';

const FALLBACK_ACCOUNTS = [
  { id: 1, name: 'Efectivo Caja Menor', accountType: 'EFECTIVO', balance: 720000, active: true },
  { id: 2, name: 'Nequi Comunitario', accountType: 'BILLETERA_DIGITAL', balance: 1150000, active: true },
  { id: 3, name: 'Bancolombia Principal', accountType: 'BANCO', balance: 600000, active: true }
];

const FALLBACK_PRODUCTION_BATCHES = [
  {
    id: 'lot-1',
    batchCode: 'LOT-001',
    targetProductId: 'VIV-022',
    species: 'Orquídea Phalaenopsis Blanca',
    initialQuantity: 50,
    currentQuantity: 45,
    startDate: '2026-09-21',
    estimatedReadyDate: '2026-12-05',
    actualReadyDate: null,
    status: 'EN_CRECIMIENTO',
    environmentalConditions: 'Zona sombra 70%, humedad 65%, riego por microaspersión cada 3 días',
    accumulatedCost: 382500
  },
  {
    id: 'lot-2',
    batchCode: 'LOT-002',
    targetProductId: 'VIV-014',
    species: 'Suculenta Jade Enana',
    initialQuantity: 60,
    currentQuantity: 58,
    startDate: '2026-10-06',
    estimatedReadyDate: '2026-11-10',
    actualReadyDate: null,
    status: 'EN_PRODUCCION',
    environmentalConditions: 'Exposición solar matutina 4 horas, sustrato mineral con perlita',
    accumulatedCost: 145000
  }
];

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
    accounts: FALLBACK_ACCOUNTS,
    productionBatches: FALLBACK_PRODUCTION_BATCHES,
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
    date: sale.date || getTodayString(),
    time: sale.time,
    method: sale.paymentMethod,
    amount: sale.total
  };

  const newStats = { ...prev.statistics };
  newStats.totalIngresos += sale.total;
  newStats.gananciaNeta = newStats.totalIngresos - newStats.totalEgresos;
  newStats.margenGlobal = Math.round((newStats.gananciaNeta / newStats.totalIngresos) * 1000) / 10;
  newStats.transaccionesCount += 1;

  const prevAccounts = prev.accounts ?? FALLBACK_ACCOUNTS;
  const updatedAccounts = prevAccounts.map(acc => {
    const matchEfectivo = sale.paymentMethod === 'Efectivo' && acc.accountType === 'EFECTIVO';
    const matchNequi = sale.paymentMethod === 'Nequi' && acc.accountType === 'BILLETERA_DIGITAL';
    const matchBanco = sale.paymentMethod === 'Bancolombia' && acc.accountType === 'BANCO';
    if (matchEfectivo || matchNequi || matchBanco) {
      return { ...acc, balance: acc.balance + sale.total };
    }
    return acc;
  });

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
    accounts: updatedAccounts,
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

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: USE_SUPABASE
  });

  const moneyMovementsQuery = useQuery({
    queryKey: ['moneyMovements'],
    queryFn: fetchMoneyMovements,
    enabled: USE_SUPABASE
  });

  const reconciliationsQuery = useQuery({
    queryKey: ['reconciliations'],
    queryFn: fetchReconciliations,
    enabled: USE_SUPABASE
  });

  const productionBatchesQuery = useQuery({
    queryKey: ['productionBatches'],
    queryFn: fetchProductionBatches,
    enabled: USE_SUPABASE
  });

  const products = useMemo(
    () => (USE_SUPABASE ? productsQuery.data ?? [] : data.products),
    [productsQuery.data, data.products]
  );
  const sales = useMemo(
    () => (USE_SUPABASE ? salesQuery.data ?? [] : data.sales),
    [salesQuery.data, data.sales]
  );
  const accounts = useMemo(
    () => (USE_SUPABASE ? accountsQuery.data ?? FALLBACK_ACCOUNTS : (data.accounts ?? FALLBACK_ACCOUNTS)),
    [accountsQuery.data, data.accounts]
  );
  const moneyMovements = useMemo(
    () => (USE_SUPABASE ? moneyMovementsQuery.data ?? [] : []),
    [moneyMovementsQuery.data]
  );
  const reconciliations = useMemo(
    () => (USE_SUPABASE ? reconciliationsQuery.data ?? [] : []),
    [reconciliationsQuery.data]
  );
  const productionBatches = useMemo(
    () => (USE_SUPABASE ? productionBatchesQuery.data ?? FALLBACK_PRODUCTION_BATCHES : (data.productionBatches ?? FALLBACK_PRODUCTION_BATCHES)),
    [productionBatchesQuery.data, data.productionBatches]
  );

  const nextProductId = useMemo(
    () => (USE_SUPABASE ? deriveNextProductId(products) : data.nextProductId),
    [products, data.nextProductId]
  );

  // Construye transacciones combinadas (ventas + movimientos de egreso/ingreso) con fecha real
  const transactions = useMemo(() => {
    if (USE_SUPABASE) {
      const salesById = new Map(sales.map(s => [s.id, s]));
      const fromMovements = moneyMovements.map(m => {
        const linkedSale = m.referenceId ? salesById.get(m.referenceId) : null;
        const methodLabel = linkedSale?.paymentMethod
          || (m.accountName?.includes('Efectivo') ? 'Efectivo'
            : m.accountName?.includes('Nequi') ? 'Nequi'
            : m.accountName?.includes('Bancolombia') ? 'Bancolombia'
            : 'Caja');
        const timeStr = linkedSale?.time
          || (m.createdAt ? new Date(m.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
        const summaryStr = linkedSale ? summarizeItems(linkedSale.items) : m.concept;

        return {
          id: m.referenceId || m.id.slice(0, 8).toUpperCase(),
          type: m.amount >= 0 ? 'venta' : 'compra',
          summary: summaryStr,
          date: m.date || linkedSale?.date || getTodayString(),
          time: timeStr,
          method: m.amount < 0 ? 'Egreso' : methodLabel,
          amount: m.amount
        };
      });

      if (fromMovements.length > 0) return fromMovements;

      return sales.map(s => ({
        id: s.id,
        type: 'venta',
        summary: summarizeItems(s.items),
        date: s.date,
        time: s.time,
        method: s.paymentMethod,
        amount: s.total
      }));
    }

    // Modo local: asegurar que cada transacción tenga una fecha (asociada a su venta o hoy)
    const salesById = new Map(data.sales.map(s => [s.id, s]));
    return (data.transactions ?? []).map(tx => ({
      ...tx,
      date: tx.date || salesById.get(tx.id)?.date || getTodayString()
    }));
  }, [ sales, moneyMovements, data.transactions, data.sales ]);

  // Genera alertas dinámicas evaluando stock actual de productos + lotes de cultivo activos (RF-32, RF-146, RF-147)
  const alerts = useMemo(() => {
    const dynamicAlerts = [];

    for (const p of products) {
      if (!p.active) continue;
      const status = getStockStatus(p.stock, p.minStock);
      if (status === 'critico') {
        dynamicAlerts.push({
          id: `stock-crit-${p.id}`,
          type: 'danger',
          title: `Stock Bajo Crítico: ${p.name}`,
          description: `Quedan ${p.stock} unidades (Stock mínimo configurado: ${p.minStock}). Requiere reabastecimiento.`,
          action: 'Reponer',
          route: '/inventario',
          productId: p.id
        });
      } else if (status === 'alerta') {
        dynamicAlerts.push({
          id: `stock-warn-${p.id}`,
          type: 'warning',
          title: `Stock Próximo a Mínimo: ${p.name}`,
          description: `Quedan ${p.stock} unidades (Mínimo: ${p.minStock}). Origen: ${p.origin || 'Catálogo'}.`,
          action: 'Ver Stock',
          route: '/inventario',
          productId: p.id
        });
      }
    }

    for (const batch of productionBatches) {
      if (batch.status === 'DISPONIBLE' || batch.status === 'PERDIDA_TOTAL') continue;
      const statusLabel = batch.status === 'EN_CRECIMIENTO' ? 'En crecimiento' : 'En producción';
      dynamicAlerts.push({
        id: `batch-${batch.batchCode || batch.id}`,
        type: 'success',
        title: `Proceso de Cultivo Activo: Lote ${batch.batchCode} (${batch.species})`,
        description: `${batch.currentQuantity} plantas en fase "${statusLabel}". Disponibilidad estimada: ${batch.estimatedReadyDate}.`,
        action: 'Ver Catálogo',
        route: '/inventario'
      });
    }

    return dynamicAlerts;
  }, [products, productionBatches]);

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
        date: result.date,
        time: result.time,
        items: saleData.items,
        paymentMethod: saleData.paymentMethod,
        total: Number(result.total)
      };
      setData(prev => applySaleToSummary(prev, sale, deductStock(products, saleData.items)));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['sales'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['moneyMovements'] })
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
      accountsQuery.refetch();
      moneyMovementsQuery.refetch();
      reconciliationsQuery.refetch();
      productionBatchesQuery.refetch();
    }
  };

  const value = {
    ...data,
    products,
    sales,
    accounts,
    moneyMovements,
    reconciliations,
    productionBatches,
    transactions,
    alerts,
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
