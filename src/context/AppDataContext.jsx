import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  seedProducts, seedSales, seedCustomers, seedTransactions,
  seedAlerts, seedStatistics, seedNextSaleId, seedNextProductId,
  seedSuppliers, seedPurchases, seedProductionBatches
} from '../data/seedData';
import {
  getStockStatus,
  generateSaleId,
  generateSKU,
  getTodayString,
  getCurrentTime,
  summarizeItems,
  calculateWeightedAverageCost
} from '../utils/calculations';
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
  fetchProductionBatches,
  createReconciliation as createReconciliationDb,
  createAccountTransfer as createAccountTransferDb,
  createProductionBatch as createProductionBatchDb,
  updateProductionBatch as updateProductionBatchDb,
  addProductionInput as addProductionInputDb,
  closeProductionBatch as closeProductionBatchDb
} from '../services/financeService';
import {
  fetchInventoryMovements,
  adjustProductStock as adjustProductStockDb
} from '../services/inventoryService';
import {
  fetchSuppliers,
  createSupplier as createSupplierDb,
  updateSupplierInDb,
  fetchPurchases,
  createPurchase as createPurchaseDb
} from '../services/suppliersService';

// ============================================================
// FUENTE DE DATOS
// - Con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY configuradas:
//   productos, proveedores, compras, ventas, cuentas, movimientos monetarios,
//   conciliaciones, kardex de inventario y lotes de producción se leen y escriben en Supabase.
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

const FALLBACK_RECONCILIATIONS = [
  {
    id: 'rec-seed-1',
    accountId: 1,
    accountName: 'Efectivo Caja Menor',
    date: getTodayString(),
    expectedBalance: 720000,
    countedBalance: 720000,
    difference: 0,
    justification: 'Arqueo de cierre de turno cuadrado 100%',
    status: 'CUADRADO',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rec-seed-2',
    accountId: 2,
    accountName: 'Nequi Comunitario',
    date: getTodayString(),
    expectedBalance: 1150000,
    countedBalance: 1150000,
    difference: 0,
    justification: 'Saldos validados contra app Nequi',
    status: 'CUADRADO',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rec-seed-3',
    accountId: 3,
    accountName: 'Bancolombia Principal',
    date: getTodayString(),
    expectedBalance: 600000,
    countedBalance: 600000,
    difference: 0,
    justification: 'Conciliado con extracto digital Bancolombia',
    status: 'CUADRADO',
    createdAt: new Date().toISOString()
  }
];

const FALLBACK_INVENTORY_MOVEMENTS = seedProducts.map(p => ({
  id: `init-${p.id}`,
  productId: p.id,
  productName: p.name,
  productSku: p.sku,
  movementType: 'INICIAL',
  quantity: p.stock,
  previousStock: 0,
  resultingStock: p.stock,
  reason: 'Carga de inventario inicial',
  referenceId: 'INIT-2026',
  date: getTodayString(),
  time: '08:00',
  createdAt: new Date().toISOString()
}));

const FALLBACK_PRODUCTION_BATCHES = seedProductionBatches;

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
    suppliers: seedSuppliers,
    purchases: seedPurchases,
    sales: seedSales,
    customers: seedCustomers,
    transactions: seedTransactions,
    alerts: seedAlerts,
    statistics: seedStatistics,
    accounts: FALLBACK_ACCOUNTS,
    reconciliations: FALLBACK_RECONCILIATIONS,
    inventoryMovements: FALLBACK_INVENTORY_MOVEMENTS,
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

/** Siguiente código LOT-XXX calculado a partir de los lotes existentes. */
function deriveNextBatchCode(batches) {
  let maxNum = 0;
  for (const b of batches || []) {
    const match = /^LOT-(\d+)$/i.exec(b.batchCode ?? '');
    if (match) {
      maxNum = Math.max(maxNum, Number(match[1]));
    }
  }
  return `LOT-${String(maxNum + 1).padStart(3, '0')}`;
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

  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
    enabled: USE_SUPABASE
  });

  const purchasesQuery = useQuery({
    queryKey: ['purchases'],
    queryFn: fetchPurchases,
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

  const inventoryMovementsQuery = useQuery({
    queryKey: ['inventoryMovements'],
    queryFn: fetchInventoryMovements,
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
  const suppliers = useMemo(
    () => (USE_SUPABASE ? suppliersQuery.data ?? seedSuppliers : (data.suppliers ?? seedSuppliers)),
    [suppliersQuery.data, data.suppliers]
  );
  const purchases = useMemo(
    () => (USE_SUPABASE ? purchasesQuery.data ?? [] : (data.purchases ?? seedPurchases)),
    [purchasesQuery.data, data.purchases]
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
    () => (USE_SUPABASE ? reconciliationsQuery.data ?? [] : (data.reconciliations ?? FALLBACK_RECONCILIATIONS)),
    [reconciliationsQuery.data, data.reconciliations]
  );
  const inventoryMovements = useMemo(
    () => (USE_SUPABASE ? inventoryMovementsQuery.data ?? [] : (data.inventoryMovements ?? FALLBACK_INVENTORY_MOVEMENTS)),
    [inventoryMovementsQuery.data, data.inventoryMovements]
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
  }, [sales, moneyMovements, data.transactions, data.sales]);

  // Genera alertas dinámicas evaluando stock actual de productos + lotes de cultivo activos (RF-32, RF-50, RF-146, RF-147)
  const alerts = useMemo(() => {
    const dynamicAlerts = [];
    const supplierById = new Map(suppliers.map(s => [Number(s.id), s.name]));
    const todayStr = getTodayString();

    for (const p of products) {
      if (!p.active) continue;
      const status = getStockStatus(p.stock, p.minStock);
      const supName = p.supplierId ? supplierById.get(Number(p.supplierId)) : null;
      const supNote = supName ? ` Proveedor habitual: ${supName}.` : '';
      if (status === 'critico') {
        dynamicAlerts.push({
          id: `stock-crit-${p.id}`,
          type: 'danger',
          title: `Stock Bajo Crítico: ${p.name}`,
          description: `Quedan ${p.stock} unidades (Stock mínimo configurado: ${p.minStock}).${supNote || ' Requiere reabastecimiento.'}`,
          action: 'Reponer',
          route: '/inventario',
          productId: p.id
        });
      } else if (status === 'alerta') {
        dynamicAlerts.push({
          id: `stock-warn-${p.id}`,
          type: 'warning',
          title: `Stock Próximo a Mínimo: ${p.name}`,
          description: `Quedan ${p.stock} unidades (Mínimo: ${p.minStock}).${supNote || ` Origen: ${p.origin || 'Catálogo'}.`}`,
          action: 'Ver Stock',
          route: '/inventario',
          productId: p.id
        });
      }
    }

    for (const batch of productionBatches) {
      if (batch.status === 'DISPONIBLE' || batch.status === 'PERDIDA_TOTAL') continue;
      const statusLabel = batch.status === 'EN_CRECIMIENTO' ? 'En crecimiento' : 'En producción';
      const isDelayed = Boolean(batch.estimatedReadyDate && todayStr > batch.estimatedReadyDate);

      if (isDelayed) {
        dynamicAlerts.push({
          id: `batch-delay-${batch.batchCode || batch.id}`,
          type: 'warning',
          title: `Tiempo de Cultivo Excedido: Lote ${batch.batchCode} (${batch.species})`,
          description: `Fecha estimada superada (${batch.estimatedReadyDate}). ${batch.currentQuantity} plantas en "${statusLabel}". ${batch.environmentalConditions ? `Factor: ${batch.environmentalConditions}` : ''}`,
          action: 'Revisar Lote',
          route: '/produccion'
        });
      } else {
        dynamicAlerts.push({
          id: `batch-${batch.batchCode || batch.id}`,
          type: 'success',
          title: `Proceso de Cultivo Activo: Lote ${batch.batchCode} (${batch.species})`,
          description: `${batch.currentQuantity} plantas en fase "${statusLabel}". Disponibilidad estimada: ${batch.estimatedReadyDate}.`,
          action: 'Ver Cultivo',
          route: '/produccion'
        });
      }
    }

    return dynamicAlerts;
  }, [products, suppliers, productionBatches]);

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
        queryClient.invalidateQueries({ queryKey: ['moneyMovements'] }),
        queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] })
      ]);
      return { saleId: result.saleId };
    }

    // Modo local (localStorage)
    const saleId = generateSaleId(data.nextSaleId);
    const today = getTodayString();
    const nowTime = getCurrentTime();
    setData(prev => {
      const newProducts = deductStock(prev.products, saleData.items);
      const newSale = {
        id: saleId,
        date: today,
        time: nowTime,
        customer: saleData.customer,
        items: saleData.items,
        paymentMethod: saleData.paymentMethod,
        total: saleData.total
      };
      const saleMovements = saleData.items.map((item, idx) => {
        const prodBefore = prev.products.find(p => p.id === item.productId);
        const prevStock = prodBefore?.stock ?? 0;
        const resStock = Math.max(0, prevStock - item.quantity);
        return {
          id: `mov-sale-${saleId}-${idx}`,
          productId: item.productId,
          productName: item.name,
          productSku: prodBefore?.sku ?? item.productId,
          movementType: 'SALIDA_VENTA',
          quantity: -item.quantity,
          previousStock: prevStock,
          resultingStock: resStock,
          reason: `Venta en POS comprobante ${saleId}`,
          referenceId: saleId,
          date: today,
          time: nowTime,
          createdAt: new Date().toISOString()
        };
      });
      return {
        ...applySaleToSummary(prev, newSale, newProducts),
        products: newProducts,
        sales: [newSale, ...prev.sales],
        inventoryMovements: [...saleMovements, ...(prev.inventoryMovements ?? FALLBACK_INVENTORY_MOVEMENTS)],
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
        supplierId: productData.supplierId ? Number(productData.supplierId) : null,
        active: true
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] })
      ]);
      return created;
    }

    const today = getTodayString();
    const nowTime = getCurrentTime();
    setData(prev => {
      const nextNum = (prev.nextProductId[cat] || 1);
      const sku = productData.sku || generateSKU(cat, nextNum);
      const initialStock = productData.stock || 0;
      const newProduct = {
        id: sku,
        sku,
        name: productData.name,
        category: cat,
        origin: productData.origin || '',
        stock: initialStock,
        minStock: productData.minStock || 5,
        cost: productData.cost || 0,
        price: productData.price || 0,
        active: true,
        location: productData.location || '',
        unit: productData.unit || 'Unidad',
        description: productData.description || '',
        supplierId: productData.supplierId ? Number(productData.supplierId) : null
      };
      const initMov = initialStock > 0
        ? [{
            id: `init-${sku}-${Date.now()}`,
            productId: sku,
            productName: productData.name,
            productSku: sku,
            movementType: 'INICIAL',
            quantity: initialStock,
            previousStock: 0,
            resultingStock: initialStock,
            reason: 'Stock inicial al registrar el producto',
            referenceId: sku,
            date: today,
            time: nowTime,
            createdAt: new Date().toISOString()
          }]
        : [];
      return {
        ...prev,
        products: [...prev.products, newProduct],
        inventoryMovements: [...initMov, ...(prev.inventoryMovements ?? FALLBACK_INVENTORY_MOVEMENTS)],
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

  // ---------- Proveedores (RF-10 a RF-14) ----------
  const addSupplier = useCallback(async (supplierData) => {
    if (!supplierData?.name?.trim()) {
      throw new Error('El nombre o razón social del proveedor es obligatorio');
    }

    if (USE_SUPABASE) {
      const created = await createSupplierDb(supplierData);
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      return created;
    }

    let createdSupplier = null;
    setData(prev => {
      const currentSuppliers = prev.suppliers ?? seedSuppliers;
      const nextId = currentSuppliers.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0) + 1;
      createdSupplier = {
        id: nextId,
        name: supplierData.name.trim(),
        contactName: supplierData.contactName?.trim() || '',
        phone: supplierData.phone?.trim() || '',
        email: supplierData.email?.trim() || '',
        address: supplierData.address?.trim() || '',
        active: supplierData.active !== false
      };
      return {
        ...prev,
        suppliers: [...currentSuppliers, createdSupplier]
      };
    });
    return createdSupplier;
  }, [queryClient]);

  const updateSupplier = useCallback(async (supplierId, updates) => {
    if (USE_SUPABASE) {
      const updated = await updateSupplierInDb({ id: supplierId, updates });
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      return updated;
    }

    setData(prev => ({
      ...prev,
      suppliers: (prev.suppliers ?? seedSuppliers).map(s =>
        Number(s.id) === Number(supplierId) ? { ...s, ...updates } : s
      )
    }));
  }, [queryClient]);

  // ---------- Compras a Proveedores (RF-15 a RF-22, RF-24, RF-33, RF-96) ----------
  const addPurchase = useCallback(async ({
    supplierId,
    invoiceNumber,
    purchaseDate,
    accountId,
    notes,
    items
  }) => {
    const targetSupplier = suppliers.find(s => Number(s.id) === Number(supplierId));
    const supplierName = targetSupplier?.name || 'Proveedor';
    const productsById = new Map(products.map(p => [p.id, p]));
    const accountsById = new Map(accounts.map(a => [Number(a.id), a]));

    if (USE_SUPABASE) {
      const created = await createPurchaseDb({
        supplierId,
        supplierName,
        invoiceNumber,
        purchaseDate,
        accountId,
        notes,
        items,
        productsById,
        accountsById
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['purchases'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['moneyMovements'] })
      ]);
      return created;
    }

    // Modo local (localStorage)
    if (!supplierId) throw new Error('Selecciona el proveedor de la compra');
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('La compra debe incluir al menos un producto');
    }

    const normalizedItems = items.map((item, idx) => {
      const prod = productsById.get(item.productId);
      const qty = Math.floor(Number(item.quantity));
      const unitCost = Number(item.unitCost);
      if (!item.productId || !qty || qty <= 0) {
        throw new Error('Todas las líneas deben tener una cantidad válida mayor a 0');
      }
      if (Number.isNaN(unitCost) || unitCost < 0) {
        throw new Error('El costo unitario de compra no puede ser negativo');
      }
      return {
        id: `pur-item-${Date.now()}-${idx}`,
        productId: item.productId,
        productName: prod?.name ?? item.productId,
        sku: prod?.sku ?? item.productId,
        quantity: qty,
        unitCost,
        subtotal: qty * unitCost
      };
    });

    const totalCost = normalizedItems.reduce((sum, it) => sum + it.subtotal, 0);
    const dateStr = purchaseDate || getTodayString();
    const nowTime = getCurrentTime();
    const cleanInvoice = invoiceNumber?.trim() || `CMP-${Date.now().toString().slice(-6)}`;
    const targetAcc = accountId ? accountsById.get(Number(accountId)) : null;

    const newPurchase = {
      id: `pur-${Date.now()}`,
      supplierId: Number(supplierId),
      supplierName,
      invoiceNumber: cleanInvoice,
      date: dateStr,
      totalCost,
      accountId: accountId ? Number(accountId) : null,
      accountName: targetAcc?.name ?? 'Caja / Banco',
      notes: notes?.trim() || '',
      items: normalizedItems,
      createdAt: new Date().toISOString()
    };

    setData(prev => {
      const newMovs = [];
      const updatedProducts = prev.products.map(p => {
        const line = normalizedItems.find(it => it.productId === p.id);
        if (!line) return p;
        const prevStock = Number(p.stock) || 0;
        const resStock = prevStock + line.quantity;
        const newAvgCost = calculateWeightedAverageCost(prevStock, p.cost, line.quantity, line.unitCost);
        newMovs.push({
          id: `mov-pur-${Date.now()}-${p.id}`,
          productId: p.id,
          productName: p.name,
          productSku: p.sku,
          movementType: 'ENTRADA_COMPRA',
          quantity: line.quantity,
          previousStock: prevStock,
          resultingStock: resStock,
          reason: `Compra a ${supplierName} (Factura ${cleanInvoice}) a $${line.unitCost.toLocaleString('es-CO')}/ud`,
          referenceId: cleanInvoice,
          date: dateStr,
          time: nowTime,
          createdAt: new Date().toISOString()
        });
        return {
          ...p,
          stock: resStock,
          cost: newAvgCost,
          supplierId: p.supplierId || Number(supplierId)
        };
      });

      const prevAccounts = prev.accounts ?? FALLBACK_ACCOUNTS;
      const updatedAccounts = accountId
        ? prevAccounts.map(acc =>
            Number(acc.id) === Number(accountId)
              ? { ...acc, balance: Number(acc.balance) - totalCost }
              : acc
          )
        : prevAccounts;

      const newTx = {
        id: cleanInvoice,
        type: 'compra',
        summary: `Compra a ${supplierName} (${normalizedItems.map(i => `${i.quantity}× ${i.productName}`).join(', ')})`,
        date: dateStr,
        time: nowTime,
        method: targetAcc?.name || 'Egreso',
        amount: -totalCost
      };

      const newStats = { ...prev.statistics };
      newStats.totalEgresos += totalCost;
      newStats.gananciaNeta = newStats.totalIngresos - newStats.totalEgresos;

      return {
        ...prev,
        products: updatedProducts,
        purchases: [newPurchase, ...(prev.purchases ?? seedPurchases)],
        inventoryMovements: [...newMovs, ...(prev.inventoryMovements ?? FALLBACK_INVENTORY_MOVEMENTS)],
        accounts: updatedAccounts,
        transactions: [newTx, ...(prev.transactions ?? [])],
        statistics: newStats
      };
    });

    return newPurchase;
  }, [suppliers, products, accounts, queryClient]);

  // ---------- Ajuste Manual de Inventario y Kardex (RF-26 a RF-30) ----------
  const adjustStock = useCallback(async ({
    productId,
    direction,
    quantity,
    reasonCategory,
    notes
  }) => {
    const targetProduct = products.find(p => p.id === productId);
    if (!targetProduct) {
      throw new Error('Producto no encontrado');
    }

    if (USE_SUPABASE) {
      const createdMov = await adjustProductStockDb({
        product: targetProduct,
        direction,
        quantity,
        reasonCategory,
        notes
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] })
      ]);
      return createdMov;
    }

    // Modo local (localStorage)
    const qty = Math.floor(Number(quantity));
    if (!qty || Number.isNaN(qty) || qty <= 0) {
      throw new Error('La cantidad del ajuste debe ser un número entero mayor a 0');
    }
    const cleanReason = [reasonCategory, (notes ?? '').trim()]
      .filter(Boolean)
      .join(': ')
      .trim();
    if (!cleanReason) {
      throw new Error('El motivo del ajuste de inventario es obligatorio');
    }

    const previousStock = Number(targetProduct.stock) || 0;
    const isEntry = direction === 'ENTRADA' || direction === 'entry';
    const signedQuantity = isEntry ? qty : -qty;
    const resultingStock = previousStock + signedQuantity;
    if (resultingStock < 0) {
      throw new Error(`No se pueden descontar ${qty} unidades (Stock actual: ${previousStock} uds)`);
    }

    const refCode = `AJU-${Date.now().toString().slice(-6)}`;
    const newMov = {
      id: `mov-${Date.now()}`,
      productId: targetProduct.id,
      productName: targetProduct.name,
      productSku: targetProduct.sku,
      movementType: isEntry ? 'AJUSTE_MANUAL_ENTRADA' : 'AJUSTE_MANUAL_SALIDA',
      quantity: signedQuantity,
      previousStock,
      resultingStock,
      reason: cleanReason,
      referenceId: refCode,
      date: getTodayString(),
      time: getCurrentTime(),
      createdAt: new Date().toISOString()
    };

    setData(prev => ({
      ...prev,
      products: prev.products.map(p => (p.id === productId ? { ...p, stock: resultingStock } : p)),
      inventoryMovements: [newMov, ...(prev.inventoryMovements ?? FALLBACK_INVENTORY_MOVEMENTS)]
    }));

    return newMov;
  }, [products, queryClient]);

  // ---------- Lotes de Cultivo y Producción Propia de Plantas (RF-36 a RF-50) ----------
  const addProductionBatch = useCallback(async (batchData) => {
    const batchCode = batchData.batchCode?.trim() || deriveNextBatchCode(productionBatches);

    if (USE_SUPABASE) {
      const created = await createProductionBatchDb({
        ...batchData,
        batchCode
      });
      await queryClient.invalidateQueries({ queryKey: ['productionBatches'] });
      return created;
    }

    // Modo local (localStorage)
    const cleanSpecies = (batchData.species ?? '').trim();
    if (!cleanSpecies) {
      throw new Error('La especie o nombre de la planta en producción es obligatoria');
    }
    const initQty = Math.floor(Number(batchData.initialQuantity));
    if (!initQty || Number.isNaN(initQty) || initQty <= 0) {
      throw new Error('La cantidad inicial de plantas debe ser mayor a 0');
    }
    if (!batchData.estimatedReadyDate) {
      throw new Error('La fecha estimada de disponibilidad es obligatoria');
    }

    const start = batchData.startDate || getTodayString();
    const initCost = Math.max(0, Number(batchData.initialCost) || 0);
    const newId = `lot-${Date.now()}`;
    const initialInputs = initCost > 0
      ? [{
          id: `inp-${Date.now()}`,
          batchId: newId,
          inputName: (batchData.initialInputName ?? '').trim() || 'Semillas / Esquejes y sustrato base inicial',
          quantity: initQty,
          unit: 'Plántula/Esqueje',
          unitCost: Math.round((initCost / initQty) * 100) / 100,
          totalCost: initCost,
          applicationDate: start,
          notes: 'Costo base de apertura del lote'
        }]
      : [];

    const newBatch = {
      id: newId,
      batchCode,
      targetProductId: batchData.targetProductId || null,
      species: cleanSpecies,
      initialQuantity: initQty,
      currentQuantity: initQty,
      startDate: start,
      estimatedReadyDate: batchData.estimatedReadyDate,
      actualReadyDate: null,
      status: batchData.status || 'EN_PRODUCCION',
      environmentalConditions: (batchData.environmentalConditions ?? '').trim(),
      accumulatedCost: initCost,
      inputs: initialInputs
    };

    setData(prev => ({
      ...prev,
      productionBatches: [newBatch, ...(prev.productionBatches ?? FALLBACK_PRODUCTION_BATCHES)]
    }));

    return newBatch;
  }, [productionBatches, queryClient]);

  const updateProductionBatch = useCallback(async (batchId, updates) => {
    if (USE_SUPABASE) {
      const updated = await updateProductionBatchDb({ id: batchId, updates });
      await queryClient.invalidateQueries({ queryKey: ['productionBatches'] });
      return updated;
    }

    setData(prev => ({
      ...prev,
      productionBatches: (prev.productionBatches ?? FALLBACK_PRODUCTION_BATCHES).map(b =>
        b.id === batchId ? { ...b, ...updates } : b
      )
    }));
  }, [queryClient]);

  const addProductionInput = useCallback(async ({
    batchId,
    inputName,
    quantity,
    unit = 'Unidad',
    unitCost,
    applicationDate,
    notes = ''
  }) => {
    const targetBatch = productionBatches.find(b => b.id === batchId);
    if (!targetBatch) {
      throw new Error('Lote de producción no encontrado');
    }

    if (USE_SUPABASE) {
      const res = await addProductionInputDb({
        batch: targetBatch,
        inputName,
        quantity,
        unit,
        unitCost,
        applicationDate,
        notes
      });
      await queryClient.invalidateQueries({ queryKey: ['productionBatches'] });
      return res;
    }

    // Modo local (localStorage)
    const cleanName = (inputName ?? '').trim();
    if (!cleanName) {
      throw new Error('El nombre o descripción del insumo es obligatorio');
    }
    const qty = Number(quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      throw new Error('La cantidad del insumo debe ser mayor a 0');
    }
    const uCost = Number(unitCost);
    if (Number.isNaN(uCost) || uCost < 0) {
      throw new Error('El costo unitario del insumo no puede ser negativo');
    }

    const totalCost = Math.round(qty * uCost * 100) / 100;
    const appDate = applicationDate || getTodayString();
    const newInput = {
      id: `inp-${Date.now()}`,
      batchId,
      inputName: cleanName,
      quantity: qty,
      unit: (unit ?? 'Unidad').trim() || 'Unidad',
      unitCost: uCost,
      totalCost,
      applicationDate: appDate,
      notes: (notes ?? '').trim()
    };

    setData(prev => ({
      ...prev,
      productionBatches: (prev.productionBatches ?? FALLBACK_PRODUCTION_BATCHES).map(b => {
        if (b.id !== batchId) return b;
        const currentInputs = Array.isArray(b.inputs) ? b.inputs : [];
        return {
          ...b,
          accumulatedCost: Number(b.accumulatedCost || 0) + totalCost,
          inputs: [newInput, ...currentInputs]
        };
      })
    }));

    return { input: newInput, newAccumulatedCost: Number(targetBatch.accumulatedCost || 0) + totalCost };
  }, [productionBatches, queryClient]);

  const closeProductionBatch = useCallback(async ({
    batchId,
    finalQuantity,
    targetMode = 'existing',
    targetProductId,
    newProductData,
    salePrice
  }) => {
    const targetBatch = productionBatches.find(b => b.id === batchId);
    if (!targetBatch) {
      throw new Error('Lote de producción no encontrado');
    }

    const finalQty = Math.floor(Number(finalQuantity));
    if (!finalQty || Number.isNaN(finalQty) || finalQty <= 0) {
      throw new Error('La cantidad final de plantas disponibles debe ser mayor a 0');
    }

    const targetProduct = targetMode === 'existing'
      ? products.find(p => p.id === (targetProductId || targetBatch.targetProductId))
      : null;

    if (targetMode === 'existing' && !targetProduct) {
      throw new Error('Selecciona el producto del catálogo al que se incorporarán las plantas');
    }

    const nextViveroNum = nextProductId.vivero || 1;
    const generatedSku = generateSKU('vivero', nextViveroNum);

    if (USE_SUPABASE) {
      const res = await closeProductionBatchDb({
        batch: targetBatch,
        finalQuantity: finalQty,
        targetMode,
        targetProduct,
        newProductData: {
          ...newProductData,
          sku: newProductData?.sku || generatedSku
        },
        salePrice
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['productionBatches'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['inventoryMovements'] })
      ]);
      return res;
    }

    // Modo local (localStorage)
    const totalCost = Number(targetBatch.accumulatedCost) || 0;
    const unitCost = Math.round(totalCost / finalQty);
    const today = getTodayString();
    const nowTime = getCurrentTime();

    let finalProdId = targetProduct?.id || generatedSku;

    setData(prev => {
      let updatedProducts = [...prev.products];
      let newMov = null;
      let updatedNextProductId = { ...prev.nextProductId };

      if (targetMode === 'existing' && targetProduct) {
        const prevStock = Number(targetProduct.stock) || 0;
        const resultingStock = prevStock + finalQty;
        const newAvgCost = calculateWeightedAverageCost(prevStock, targetProduct.cost, finalQty, unitCost);
        const updatedPrice = salePrice && Number(salePrice) > 0 ? Number(salePrice) : Number(targetProduct.price);

        updatedProducts = updatedProducts.map(p =>
          p.id === targetProduct.id
            ? { ...p, stock: resultingStock, cost: newAvgCost, price: updatedPrice, active: true }
            : p
        );

        newMov = {
          id: `mov-prod-${Date.now()}`,
          productId: targetProduct.id,
          productName: targetProduct.name,
          productSku: targetProduct.sku,
          movementType: 'ENTRADA_PRODUCCION',
          quantity: finalQty,
          previousStock: prevStock,
          resultingStock,
          reason: `Cosecha de lote ${targetBatch.batchCode} (${targetBatch.species}) — Costo unit.: $${unitCost.toLocaleString('es-CO')}`,
          referenceId: targetBatch.batchCode,
          date: today,
          time: nowTime,
          createdAt: new Date().toISOString()
        };
      } else {
        const sku = newProductData?.sku || generateSKU('vivero', prev.nextProductId.vivero || 1);
        finalProdId = sku;
        const name = (newProductData?.name ?? targetBatch.species ?? '').trim();
        const price = Number(salePrice) || Math.ceil((unitCost * 1.6) / 100) * 100;
        const newProd = {
          id: sku,
          sku,
          name,
          category: 'vivero',
          origin: 'Producción Vivero',
          stock: finalQty,
          minStock: Math.max(1, Math.floor(Number(newProductData?.minStock) || 10)),
          cost: unitCost,
          price,
          active: true,
          location: (newProductData?.location ?? '').trim() || 'Zona Vivero • Estante Principal',
          unit: (newProductData?.unit ?? '').trim() || 'Unidad / Maceta',
          description: (newProductData?.description ?? '').trim() || `Planta cultivada en vivero a partir del lote ${targetBatch.batchCode}.`,
          supplierId: null
        };
        updatedProducts.push(newProd);
        updatedNextProductId = {
          ...prev.nextProductId,
          vivero: (prev.nextProductId.vivero || 1) + 1
        };

        newMov = {
          id: `mov-prod-${Date.now()}`,
          productId: sku,
          productName: name,
          productSku: sku,
          movementType: 'ENTRADA_PRODUCCION',
          quantity: finalQty,
          previousStock: 0,
          resultingStock: finalQty,
          reason: `Incorporación inicial por cosecha de lote ${targetBatch.batchCode} (${targetBatch.species}) — Costo unit.: $${unitCost.toLocaleString('es-CO')}`,
          referenceId: targetBatch.batchCode,
          date: today,
          time: nowTime,
          createdAt: new Date().toISOString()
        };
      }

      const updatedBatches = (prev.productionBatches ?? FALLBACK_PRODUCTION_BATCHES).map(b =>
        b.id === batchId
          ? {
              ...b,
              status: 'DISPONIBLE',
              currentQuantity: finalQty,
              actualReadyDate: today,
              targetProductId: finalProdId
            }
          : b
      );

      return {
        ...prev,
        products: updatedProducts,
        productionBatches: updatedBatches,
        inventoryMovements: newMov
          ? [newMov, ...(prev.inventoryMovements ?? FALLBACK_INVENTORY_MOVEMENTS)]
          : (prev.inventoryMovements ?? FALLBACK_INVENTORY_MOVEMENTS),
        nextProductId: updatedNextProductId
      };
    });

    return { unitCost, finalProductId: finalProdId };
  }, [productionBatches, products, nextProductId, queryClient]);

  // ---------- Arqueo / Conciliación de Cuentas (RF-102 a RF-104) ----------
  const addReconciliation = useCallback(async ({
    accountId,
    expectedBalance,
    countedBalance,
    justification,
    adjustAccountBalance = true
  }) => {
    if (USE_SUPABASE) {
      const created = await createReconciliationDb({
        accountId,
        expectedBalance,
        countedBalance,
        justification,
        adjustAccountBalance
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reconciliations'] }),
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['moneyMovements'] })
      ]);
      return created;
    }

    // Modo local (localStorage)
    const expected = Number(expectedBalance);
    const counted = Number(countedBalance);
    const difference = counted - expected;
    const trimmedJustification = (justification ?? '').trim();

    if (difference !== 0 && !trimmedJustification) {
      throw new Error('La justificación es obligatoria cuando existe un descuadre');
    }

    const status = difference === 0 ? 'CUADRADO' : 'DESCUADRE_JUSTIFICADO';
    const today = getTodayString();
    const targetAcc = accounts.find(a => a.id === Number(accountId));
    const newRecon = {
      id: `REC-${Date.now()}`,
      accountId: Number(accountId),
      accountName: targetAcc?.name ?? 'Cuenta',
      date: today,
      expectedBalance: expected,
      countedBalance: counted,
      difference,
      justification: trimmedJustification || (difference === 0 ? 'Arqueo cuadrado sin diferencias' : ''),
      status,
      createdAt: new Date().toISOString()
    };

    setData(prev => {
      const prevAccounts = prev.accounts ?? FALLBACK_ACCOUNTS;
      const updatedAccounts = (difference !== 0 && adjustAccountBalance)
        ? prevAccounts.map(acc => (acc.id === Number(accountId) ? { ...acc, balance: counted } : acc))
        : prevAccounts;

      const prevRecons = prev.reconciliations ?? FALLBACK_RECONCILIATIONS;
      const prevTxs = prev.transactions ?? [];
      const extraTx = (difference !== 0 && adjustAccountBalance)
        ? [{
            id: newRecon.id.slice(0, 10),
            type: difference >= 0 ? 'venta' : 'compra',
            summary: `Ajuste por arqueo (${targetAcc?.name ?? 'Caja'}): ${trimmedJustification}`,
            date: today,
            time: getCurrentTime(),
            method: difference >= 0 ? 'Ajuste +' : 'Ajuste -',
            amount: difference
          }]
        : [];

      return {
        ...prev,
        accounts: updatedAccounts,
        reconciliations: [newRecon, ...prevRecons],
        transactions: [...extraTx, ...prevTxs]
      };
    });

    return newRecon;
  }, [accounts, queryClient]);

  // ---------- Transferencias entre Cuentas (RF-101) ----------
  const transferBetweenAccounts = useCallback(async ({
    fromAccountId,
    toAccountId,
    amount,
    concept
  }) => {
    const fromAccount = accounts.find(a => a.id === Number(fromAccountId));
    const toAccount = accounts.find(a => a.id === Number(toAccountId));

    if (USE_SUPABASE) {
      const res = await createAccountTransferDb({
        fromAccount,
        toAccount,
        amount,
        concept
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['moneyMovements'] })
      ]);
      return res;
    }

    // Modo local (localStorage)
    const transferAmount = Number(amount);
    if (!fromAccount || !toAccount || fromAccount.id === toAccount.id) {
      throw new Error('Selecciona una cuenta de origen y una cuenta de destino diferentes');
    }
    if (Number.isNaN(transferAmount) || transferAmount <= 0) {
      throw new Error('El monto a transferir debe ser mayor a cero');
    }
    if (Number(fromAccount.balance) < transferAmount) {
      throw new Error(`Saldo insuficiente en ${fromAccount.name}`);
    }

    const refCode = `TRF-${Date.now().toString().slice(-6)}`;
    const today = getTodayString();
    const cleanConcept = (concept ?? '').trim() || `Traslado de ${fromAccount.name} a ${toAccount.name}`;

    setData(prev => {
      const prevAccounts = prev.accounts ?? FALLBACK_ACCOUNTS;
      const updatedAccounts = prevAccounts.map(acc => {
        if (acc.id === fromAccount.id) return { ...acc, balance: Number(acc.balance) - transferAmount };
        if (acc.id === toAccount.id) return { ...acc, balance: Number(acc.balance) + transferAmount };
        return acc;
      });
      const newTx = {
        id: refCode,
        type: 'venta',
        summary: cleanConcept,
        date: today,
        time: getCurrentTime(),
        method: 'Traslado',
        amount: transferAmount
      };
      return {
        ...prev,
        accounts: updatedAccounts,
        transactions: [newTx, ...(prev.transactions ?? [])]
      };
    });

    return { referenceId: refCode };
  }, [accounts, queryClient]);

  const resetDemoData = useCallback(() => {
    setData(freshLocalData());
  }, []);

  const dataStatus = {
    source: USE_SUPABASE ? 'supabase' : 'local',
    isLoading: USE_SUPABASE && (productsQuery.isLoading || salesQuery.isLoading),
    error: USE_SUPABASE ? (productsQuery.error || salesQuery.error) : null,
    retry: () => {
      productsQuery.refetch();
      suppliersQuery.refetch();
      purchasesQuery.refetch();
      salesQuery.refetch();
      accountsQuery.refetch();
      moneyMovementsQuery.refetch();
      reconciliationsQuery.refetch();
      inventoryMovementsQuery.refetch();
      productionBatchesQuery.refetch();
    }
  };

  const value = {
    ...data,
    products,
    suppliers,
    purchases,
    sales,
    accounts,
    moneyMovements,
    reconciliations,
    inventoryMovements,
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
    addSupplier,
    updateSupplier,
    addPurchase,
    adjustStock,
    addProductionBatch,
    updateProductionBatch,
    addProductionInput,
    closeProductionBatch,
    addReconciliation,
    transferBetweenAccounts,
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
