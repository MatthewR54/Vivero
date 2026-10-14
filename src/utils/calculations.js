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
  return new Date().toISOString().split('T')[0];
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
