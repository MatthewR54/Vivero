/**
 * Formatea un número como pesos colombianos: $1.850.000
 */
export function formatCOP(value) {
  if (value === null || value === undefined) return '$0';
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(abs);
  const sign = value < 0 ? '-' : '';
  return `${sign}$${formatted}`;
}

/**
 * Formatea un número de forma compacta: $1.35M, $720K
 */
export function formatCOPCompact(value) {
  const abs = Math.abs(value);
  if (abs >= 1000000) {
    const m = abs / 1000000;
    const formatted = m % 1 === 0 ? m.toFixed(0) : m.toFixed(2).replace(/\.?0+$/, '');
    return `$${formatted}M`;
  }
  if (abs >= 1000) {
    const k = abs / 1000;
    const formatted = k % 1 === 0 ? k.toFixed(0) : k.toFixed(1).replace(/\.?0+$/, '');
    return `$${formatted}K`;
  }
  return formatCOP(value);
}
