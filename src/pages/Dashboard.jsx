import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP, formatCOPCompact } from '../utils/currency';
import {
  Zap, Plus, ShoppingCart, WalletCards,
  AlertTriangle, AlertOctagon, Sprout, Palette
} from 'lucide-react';
import './Dashboard.css';

const FILTER_OPTIONS = ['Hoy', 'Ayer', 'Últimos 7 días', 'Este Mes'];

export default function Dashboard() {
  const { transactions, alerts, statistics } = useAppData();
  const [activeFilter, setActiveFilter] = useState('Hoy');
  const navigate = useNavigate();

  const todayTransactions = transactions.slice(0, 6);

  const soldUnitsPlants = 116;
  const soldUnitsMerch = 26;
  const totalSoldUnits = soldUnitsPlants + soldUnitsMerch;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Panel de Inicio & Resumen del Negocio</h1>
          <p>Visualización en tiempo real de operaciones, ventas y control financiero diario</p>
        </div>
        <div className="page-header-right">
          <span className="filter-label">Filtrar por días:</span>
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
          <div className="kpi-label">Cuántos productos se vendieron</div>
          <div className="kpi-value">{totalSoldUnits} unidades</div>
          <div className="kpi-sub">
            <span className="positive">+18% vs día anterior</span>
            <br />{soldUnitsPlants} plantas | {soldUnitsMerch} merch
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cuánto hay de ganancia</div>
          <div className="kpi-value green">{formatCOP(1850000)}</div>
          <div className="kpi-sub">
            Margen: 42.5%
            <br />Ingresos: {formatCOPCompact(3200000)} | Costos: {formatCOPCompact(1350000)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ganancias del día anterior</div>
          <div className="kpi-value">{formatCOP(420000)}</div>
          <div className="kpi-sub">
            84 productos vendidos
            <br /><span className="positive">✓ Verificado</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Dinero disponible (conciliado)</div>
          <div className="kpi-value blue">{formatCOP(statistics.conciliacion)}</div>
          <div className="kpi-sub">
            Efectivo: {formatCOPCompact(720000)} | Bancos: {formatCOPCompact(1750000)}
            <br />Diferencia: $0 <span className="positive">(Cuadrado)</span>
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
            {alerts.map(alert => (
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
                <button className={`btn btn-sm alert-action-btn alert-action-${alert.type}`}>
                  {alert.action}
                </button>
              </div>
            ))}
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
                <button className="btn btn-outline">
                  <ShoppingCart size={16} /> Registrar Compra
                </button>
                <button className="btn btn-outline">
                  <WalletCards size={16} /> Conciliar Caja
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-header-title">
                Últimas Transacciones Registradas (Hoy)
              </div>
            </div>
            <div className="card-body transactions-body">
              {todayTransactions.map(tx => (
                <div key={tx.id} className={`transaction-item ${tx.type}`}>
                  <div className="tx-left">
                    <span className="tx-id">{tx.id}</span>
                    <span className="tx-summary">{tx.summary}</span>
                    <span className="tx-meta">{tx.time} • {tx.method}</span>
                  </div>
                  <div className={`tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                    {tx.amount >= 0 ? '+' : ''}{formatCOP(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
