import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP, formatCOPCompact } from '../utils/currency';
import { isDateInPeriod, getTodayString, getOffsetDateString } from '../utils/calculations';
import {
  Zap, Plus, ShoppingCart, WalletCards,
  AlertTriangle, AlertOctagon, Sprout, Palette
} from 'lucide-react';
import './Dashboard.css';

const FILTER_OPTIONS = ['Hoy', 'Ayer', 'Últimos 7 días', 'Este Mes'];

function computePeriodStats(salesList, productsById, movementsList) {
  let soldUnitsPlants = 0;
  let soldUnitsMerch = 0;
  let soldUnitsOther = 0;
  let totalRevenue = 0;
  let totalCOGS = 0;

  for (const sale of salesList) {
    totalRevenue += Number(sale.total) || 0;
    for (const item of sale.items ?? []) {
      const qty = Number(item.quantity) || 0;
      const prod = productsById.get(item.productId);
      const cat = prod?.category
        || (item.productId?.startsWith('VIV') ? 'vivero'
          : item.productId?.startsWith('MER') ? 'merchandising'
          : 'comestibles');

      if (cat === 'vivero') soldUnitsPlants += qty;
      else if (cat === 'merchandising') soldUnitsMerch += qty;
      else soldUnitsOther += qty;

      const unitCost = item.unitCost !== undefined && item.unitCost !== null
        ? Number(item.unitCost)
        : (Number(prod?.cost) || 0);
      totalCOGS += qty * unitCost;
    }
  }

  let extraEgresos = 0;
  for (const m of movementsList) {
    if (m.amount < 0) {
      extraEgresos += Math.abs(Number(m.amount));
    }
  }

  const totalSoldUnits = soldUnitsPlants + soldUnitsMerch + soldUnitsOther;
  const totalCosts = totalCOGS + extraEgresos;
  const netProfit = totalRevenue - totalCosts;
  const margin = totalRevenue > 0
    ? Math.round((netProfit / totalRevenue) * 1000) / 10
    : 0;

  return {
    soldUnitsPlants,
    soldUnitsMerch,
    soldUnitsOther,
    totalSoldUnits,
    totalRevenue,
    totalCOGS,
    extraEgresos,
    totalCosts,
    netProfit,
    margin,
    salesCount: salesList.length
  };
}

export default function Dashboard() {
  const {
    products,
    sales,
    accounts,
    moneyMovements,
    reconciliations,
    transactions,
    alerts
  } = useAppData();
  const [activeFilter, setActiveFilter] = useState('Este Mes');
  const navigate = useNavigate();

  const productsById = useMemo(
    () => new Map(products.map(p => [p.id, p])),
    [products]
  );

  // Filtrar ventas y movimientos según el chip seleccionado (RF-148)
  const filteredSales = useMemo(
    () => sales.filter(s => isDateInPeriod(s.date, activeFilter)),
    [sales, activeFilter]
  );

  const filteredMovements = useMemo(
    () => moneyMovements.filter(m => isDateInPeriod(m.date, activeFilter)),
    [moneyMovements, activeFilter]
  );

  const periodStats = useMemo(
    () => computePeriodStats(filteredSales, productsById, filteredMovements),
    [filteredSales, productsById, filteredMovements]
  );

  // Estadísticas del día anterior para la tarjeta "Ganancias del día anterior"
  const yesterdayStr = getOffsetDateString(-1);
  const yesterdayStats = useMemo(() => {
    const ySales = sales.filter(s => s.date === yesterdayStr);
    const yMovs = moneyMovements.filter(m => m.date === yesterdayStr);
    return computePeriodStats(ySales, productsById, yMovs);
  }, [sales, moneyMovements, productsById, yesterdayStr]);

  // Transacciones recientes filtradas por el período seleccionado
  const visibleTransactions = useMemo(() => {
    const inPeriod = transactions.filter(tx => isDateInPeriod(tx.date, activeFilter));
    return (inPeriod.length > 0 ? inPeriod : transactions).slice(0, 6);
  }, [transactions, activeFilter]);

  const showingFallbackTx = useMemo(() => {
    return transactions.filter(tx => isDateInPeriod(tx.date, activeFilter)).length === 0 && transactions.length > 0;
  }, [transactions, activeFilter]);

  // Saldos reales de cuentas (Efectivo vs Bancos/Billeteras) — RF-98 a RF-100, RF-143, RF-144
  const balances = useMemo(() => {
    let efectivo = 0;
    let bancos = 0;
    for (const acc of accounts) {
      if (!acc.active) continue;
      if (acc.accountType === 'EFECTIVO' || acc.name?.toLowerCase().includes('efectivo')) {
        efectivo += Number(acc.balance) || 0;
      } else {
        bancos += Number(acc.balance) || 0;
      }
    }
    const total = efectivo + bancos;
    const totalDiff = reconciliations.reduce((sum, r) => sum + (Number(r.difference) || 0), 0);
    return { efectivo, bancos, total, totalDiff };
  }, [accounts, reconciliations]);

  // Resumen de inventario disponible (RF-145)
  const inventorySummary = useMemo(() => {
    const activeProds = products.filter(p => p.active);
    const totalUnits = activeProds.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    return { skus: activeProds.length, totalUnits };
  }, [products]);

  const todayStr = getTodayString();

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Panel de Inicio & Resumen del Negocio</h1>
          <p>
            Visualización en tiempo real de operaciones, ventas y control financiero ({inventorySummary.skus} productos activos • {inventorySummary.totalUnits} uds. en stock)
          </p>
        </div>
        <div className="page-header-right">
          <span className="filter-label">Filtrar por período:</span>
          <div className="chip-group">
            {FILTER_OPTIONS.map(f => (
              <button
                key={f}
                className={`chip ${activeFilter === f ? 'active' : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Productos vendidos ({activeFilter})</div>
          <div className="kpi-value">{periodStats.totalSoldUnits} unidades</div>
          <div className="kpi-sub">
            <span className="positive">{periodStats.salesCount} ventas en el período</span>
            <br />
            {periodStats.soldUnitsPlants} plantas | {periodStats.soldUnitsMerch} merch
            {periodStats.soldUnitsOther > 0 ? ` | ${periodStats.soldUnitsOther} otros` : ''}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ganancia estimada ({activeFilter})</div>
          <div className={`kpi-value ${periodStats.netProfit >= 0 ? 'green' : 'red'}`}>
            {formatCOP(periodStats.netProfit)}
          </div>
          <div className="kpi-sub">
            Margen: {periodStats.margin}%
            <br />
            Ingresos: {formatCOPCompact(periodStats.totalRevenue)} | Costos: {formatCOPCompact(periodStats.totalCosts)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ganancias del día anterior</div>
          <div className="kpi-value">{formatCOP(yesterdayStats.netProfit)}</div>
          <div className="kpi-sub">
            {yesterdayStats.totalSoldUnits} productos vendidos ({yesterdayStats.salesCount} ventas)
            <br />
            <span className="positive">✓ Ingresos: {formatCOPCompact(yesterdayStats.totalRevenue)}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Dinero disponible (en cuentas)</div>
          <div className="kpi-value blue">{formatCOP(balances.total)}</div>
          <div className="kpi-sub">
            Efectivo: {formatCOPCompact(balances.efectivo)} | Bancos: {formatCOPCompact(balances.bancos)}
            <br />
            Diferencia: {formatCOP(balances.totalDiff)}{' '}
            <span className={balances.totalDiff === 0 ? 'positive' : 'negative'}>
              ({balances.totalDiff === 0 ? 'Cuadrado' : 'Descuadre'})
            </span>
          </div>
        </div>
      </div>

      {/* Bottom two columns */}
      <div className="two-col dashboard-bottom">
        {/* Left: Alerts */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-title">
              <AlertTriangle size={16} />
              Alertas del Sistema & Procesos Activos
            </div>
            <span className="badge badge-orange">{alerts.length} avisos</span>
          </div>
          <div className="card-body alerts-list">
            {alerts.length > 0 ? (
              alerts.map(alert => (
                <div key={alert.id} className={`alert-item alert-${alert.type}`}>
                  <div className="alert-icon-col">
                    {alert.type === 'danger' && <AlertOctagon size={18} />}
                    {alert.type === 'warning' && <AlertTriangle size={18} />}
                    {alert.type === 'success' && <Sprout size={18} />}
                    {alert.type === 'purple' && <Palette size={18} />}
                  </div>
                  <div className="alert-content">
                    <div className="alert-title">{alert.title}</div>
                    <div className="alert-desc">{alert.description}</div>
                  </div>
                  <button
                    className={`btn btn-sm alert-action-btn alert-action-${alert.type}`}
                    onClick={() => navigate(alert.route || '/inventario')}
                  >
                    {alert.action}
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>No hay alertas de stock ni procesos pendientes en este momento.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Actions + Transactions */}
        <div className="dashboard-right-col">
          <div className="card">
            <div className="card-header">
              <div className="card-header-title">
                <Zap size={16} />
                Accesos Rápidos Operativos
              </div>
              <span className="quick-actions-sub">Acciones frecuentes</span>
            </div>
            <div className="card-body quick-actions-body">
              <div className="quick-actions-btns">
                <button className="btn btn-primary" onClick={() => navigate('/ventas/nueva')}>
                  <Plus size={16} /> Nueva Venta
                </button>
                <button className="btn btn-outline" onClick={() => navigate('/compras/nueva')}>
                  <ShoppingCart size={16} /> Registrar Compra
                </button>
                <button className="btn btn-outline" onClick={() => navigate('/produccion')}>
                  <Sprout size={16} /> Lotes de Cultivo
                </button>
                <button className="btn btn-outline" onClick={() => navigate('/estadistico')}>
                  <WalletCards size={16} /> Ver Conciliación
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-header-title">
                Últimas Transacciones Registradas ({showingFallbackTx ? 'Recientes' : activeFilter})
              </div>
            </div>
            <div className="card-body transactions-body">
              {visibleTransactions.length > 0 ? (
                visibleTransactions.map(tx => (
                  <div key={`${tx.id}-${tx.time}`} className={`transaction-item ${tx.type}`}>
                    <div className="tx-left">
                      <span className="tx-id">{tx.id}</span>
                      <span className="tx-summary">{tx.summary}</span>
                      <span className="tx-meta">
                        {tx.date === todayStr ? 'Hoy' : tx.date}{tx.time ? `, ${tx.time}` : ''} • {tx.method}
                      </span>
                    </div>
                    <div className={`tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                      {tx.amount >= 0 ? '+' : ''}{formatCOP(tx.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>No hay transacciones registradas en este período.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
