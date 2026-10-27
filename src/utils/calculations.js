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
 * Verifica si una fecha YYYY-MM-DD pertenece al rango seleccionado en el filtro
 * Soporta chips del Dashboard ('Hoy', 'Ayer', 'Últimos 7 días', 'Este Mes', 'Todo')
 * y de Estadísticas ('Día', 'Semana', 'Este Mes', 'Año')
 */
export function isDateInPeriod(dateStr, filterName) {
  if (!dateStr || filterName === 'Todo') return true;
  const today = getTodayString();

  if (filterName === 'Hoy' || filterName === 'Día') {
    return dateStr === today;
  }
  if (filterName === 'Ayer') {
    return dateStr === getOffsetDateString(-1);
  }
  if (filterName === 'Últimos 7 días' || filterName === 'Semana') {
    const start = getOffsetDateString(-6);
    return dateStr >= start && dateStr <= today;
  }
  if (filterName === 'Este Mes') {
    return dateStr.slice(0, 7) === today.slice(0, 7);
  }
  if (filterName === 'Año') {
    return dateStr.slice(0, 4) === today.slice(0, 4);
  }
  return true;
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
