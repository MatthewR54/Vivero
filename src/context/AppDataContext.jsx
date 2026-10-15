import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  seedProducts, seedSales, seedCustomers, seedTransactions,
  seedAlerts, seedStatistics, seedNextSaleId, seedNextProductId
} from '../data/seedData';
import { getStockStatus, generateSaleId, generateSKU, getTodayString, getCurrentTime, summarizeItems } from '../utils/calculations';

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

export function AppDataProvider({ children }) {
  const [data, setData] = useState(() => {
    const stored = loadFromStorage();
    if (stored) return stored;
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
  });

  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const addSale = useCallback((saleData) => {
    setData(prev => {
      const saleId = generateSaleId(prev.nextSaleId);
      const time = getCurrentTime();
      const date = getTodayString();

      const newProducts = prev.products.map(p => {
        const item = saleData.items.find(i => i.productId === p.id);
        if (item) {
          return { ...p, stock: Math.max(0, p.stock - item.quantity) };
        }
        return p;
      });

      const newSale = {
        id: saleId,
        date,
        time,
        customer: saleData.customer,
        items: saleData.items,
        paymentMethod: saleData.paymentMethod,
        total: saleData.total
      };

      const newTransaction = {
        id: saleId,
        type: 'venta',
        summary: summarizeItems(saleData.items),
        time,
        method: saleData.paymentMethod,
        amount: saleData.total
      };

      const newStats = { ...prev.statistics };
      newStats.totalIngresos += saleData.total;
      newStats.gananciaNeta = newStats.totalIngresos - newStats.totalEgresos;
      newStats.margenGlobal = Math.round((newStats.gananciaNeta / newStats.totalIngresos) * 1000) / 10;
      newStats.transaccionesCount += 1;

      const updatedAlerts = prev.alerts.map(a => {
        if (a.productId) {
          const prod = newProducts.find(p => p.id === a.productId);
          if (prod) {
            const status = getStockStatus(prod.stock, prod.minStock);
            if (status === 'critico') {
              return { ...a, description: `Quedan ${prod.stock} unidades (Stock mínimo configurado: ${prod.minStock}). Requiere reabastecimiento.` };
            }
          }
        }
        return a;
      });

      return {
        ...prev,
        products: newProducts,
        sales: [newSale, ...prev.sales],
        transactions: [newTransaction, ...prev.transactions],
        statistics: newStats,
        alerts: updatedAlerts,
        nextSaleId: prev.nextSaleId + 1
      };
    });
  }, []);

  const addProduct = useCallback((productData) => {
    setData(prev => {
      const cat = productData.category || 'comestibles';
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
  }, []);

  const updateProduct = useCallback((productId, updates) => {
    setData(prev => {
      const newProducts = prev.products.map(p => {
        if (p.id === productId) {
          return { ...p, ...updates };
        }
        return p;
      });
      return { ...prev, products: newProducts };
    });
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = {
      products: seedProducts,
      sales: seedSales,
      customers: seedCustomers,
      transactions: seedTransactions,
      alerts: seedAlerts,
      statistics: seedStatistics,
      nextSaleId: seedNextSaleId,
      nextProductId: { ...seedNextProductId }
    };
    setData(fresh);
  }, []);

  const value = {
    ...data,
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
