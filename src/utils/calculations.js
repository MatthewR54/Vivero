/**
 * Calcula el margen de ganancia
 */
export function calculateMargin(price, cost) {
  if (!price || price === 0) return { profit: 0, margin: 0 };
  const profit = price - cost;
  const margin = (profit / price) * 100;
  return { profit, margin: Math.round(margin * 10) / 10 };
}

/**
 * RF-33: Calcula el costo promedio ponderado tras una compra
 * Fórmula: ((StockActual * CostoActual) + (CantComprada * CostoCompra)) / StockTotal
 */
export function calculateWeightedAverageCost(currentStock, currentCost, purchasedQty, purchaseUnitCost) {
  const curStock = Math.max(0, Number(currentStock) || 0);
  const curCost = Math.max(0, Number(currentCost) || 0);
  const addQty = Math.max(0, Number(purchasedQty) || 0);
  const addCost = Math.max(0, Number(purchaseUnitCost) || 0);
  const totalStock = curStock + addQty;
  if (totalStock <= 0) return Math.round(addCost || curCost);
  if (curStock === 0) return Math.round(addCost);
  return Math.round(((curStock * curCost) + (addQty * addCost)) / totalStock);
}

/**
 * Determina el estado de stock de un producto
 */
export function getStockStatus(stock, minStock) {
  if (stock <= minStock * 0.5) return 'critico';
  if (stock <= minStock + 5) return 'alerta';
  return 'optimo';
}

/**
 * Devuelve la etiqueta visual del estado de stock
 */
export function getStockLabel(status) {
  switch (status) {
    case 'critico': return 'Stock Crítico';
    case 'alerta': return 'Alerta Mínimo';
    default: return 'Óptimo';
  }
}

/**
 * Genera un ID de venta secuencial
 */
export function generateSaleId(nextId) {
  return `VTA-${nextId}`;
}

/**
 * Genera un SKU automático según categoría
 */
export function generateSKU(category, nextNum) {
  const prefix = {
    vivero: 'VIV',
    merchandising: 'MER',
    comestibles: 'PRD'
  };
  const p = prefix[category] || 'PRD';
  return `${p}-${String(nextNum).padStart(3, '0')}`;
}

/**
 * Obtiene la fecha actual formateada
 */
export function getTodayString() {
  // Fecha local (YYYY-MM-DD). toISOString() usa UTC y después de las 7 p. m.
  // en Colombia devolvía la fecha de mañana.
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Obtiene una fecha desplazada en días respecto a hoy en formato YYYY-MM-DD
 */
export function getOffsetDateString(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Verifica si una fecha YYYY-MM-DD (o timestamp ISO) pertenece al rango seleccionado
 * Soporta chips del Dashboard ('Hoy', 'Ayer', 'Últimos 7 días', 'Este Mes', 'Todo'),
 * de Estadísticas ('Día', 'Semana', 'Este Mes', 'Año') y claves cortas ('all', 'today', '7d', 'month')
 */
export function isDateInPeriod(dateStr, filterName) {
  if (!dateStr || filterName === 'Todo' || filterName === 'all') return true;
  const normalized = String(dateStr).slice(0, 10);
  const today = getTodayString();

  if (filterName === 'Hoy' || filterName === 'Día' || filterName === 'today') {
    return normalized === today;
  }
  if (filterName === 'Ayer') {
    return normalized === getOffsetDateString(-1);
  }
  if (filterName === 'Últimos 7 días' || filterName === 'Semana' || filterName === '7d') {
    const start = getOffsetDateString(-6);
    return normalized >= start && normalized <= today;
  }
  if (filterName === 'Este Mes' || filterName === 'month') {
    return normalized.slice(0, 7) === today.slice(0, 7);
  }
  if (filterName === 'Año') {
    return normalized.slice(0, 4) === today.slice(0, 4);
  }
  return true;
}

/**
 * Formatea una fecha/hora ISO o YYYY-MM-DD en formato legible corto (DD/MM/YYYY HH:MM)
 */
export function formatShortDateTime(isoOrDate) {
  if (!isoOrDate) return '—';
  const str = String(isoOrDate);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str.slice(0, 16);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Obtiene la hora actual formateada HH:MM
 */
export function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Genera resumen de items para transacción
 */
export function summarizeItems(items) {
  return items.map(i => `${i.quantity}× ${i.name}`).join(', ');
}
