import { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { formatCOP, formatCOPCompact } from '../utils/currency';
import { Download, CircleCheck, TrendingUp, Scale } from 'lucide-react';
import './Statistics.css';

const PERIOD_OPTIONS = ['Día', 'Semana', 'Este Mes', 'Año'];

export default function Statistics() {
  const { statistics } = useAppData();
  const [period, setPeriod] = useState('Este Mes');

  const maxIngresos = Math.max(...statistics.weeks.map(w => w.ingresos));

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Métricas Financieras & Reportes Estadísticos</h1>
          <p>Control de ingresos, egresos, rentabilidad y conciliación de saldos en efectivo y bancos</p>
        </div>
        <div className="page-header-right">
          <div className="chip-group">
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p}
                className={`chip ${period === p ? 'active' : ''}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <button className="btn btn-dark">
            <Download size={14} /> Exportar Reporte
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Ingresos</div>
          <div className="kpi-value">{formatCOP(statistics.totalIngresos)}</div>
          <div className="kpi-sub">Ventas acumuladas ({statistics.transaccionesCount} transacciones)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Egresos / Costos</div>
          <div className="kpi-value red">{formatCOP(statistics.totalEgresos)}</div>
          <div className="kpi-sub">Insumos, compras y producción</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ganancia Neta Estimada</div>
          <div className="kpi-value green">{formatCOP(statistics.gananciaNeta)}</div>
          <div className="kpi-sub">Margen global: {statistics.margenGlobal}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Conciliación en Libros</div>
          <div className="kpi-value blue">{formatCOP(statistics.conciliacion)}</div>
          <div className="kpi-sub">Diferencia: $0.00 (100% Conciliado)</div>
        </div>
      </div>

      {/* Two columns */}
      <div className="two-col stats-bottom">
        {/* Left: Charts */}
        <div className="stats-left">
          <div className="card">
            <div className="card-header">
              <div className="card-header-title">
                <TrendingUp size={16} /> Ingresos vs Costos por Semana (Este Mes)
              </div>
              <div className="stats-legend">
                <span className="legend-item"><span className="legend-dot legend-green"></span> Ingresos</span>
                <span className="legend-item"><span className="legend-dot legend-red"></span> Costos</span>
              </div>
            </div>
            <div className="card-body">
              <div className="chart-bars">
                {statistics.weeks.map((week, idx) => (
                  <div key={idx} className="chart-bar-row">
                    <div className="chart-bar-label">{week.label}</div>
                    <div className="chart-bar-container">
                      <div className="chart-bar-track">
                        <div
                          className="chart-bar chart-bar-ingresos"
                          style={{ width: `${(week.ingresos / maxIngresos) * 100}%` }}
                        >
                          <span className="chart-bar-value">{formatCOPCompact(week.ingresos)}</span>
                        </div>
                      </div>
                      <div className="chart-bar-track">
                        <div
                          className="chart-bar chart-bar-costos"
                          style={{ width: `${(week.costos / maxIngresos) * 100}%` }}
                        >
                          <span className="chart-bar-value">{formatCOPCompact(week.costos)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="chart-bar-ganancia">
                      Ganancia: {formatCOPCompact(week.ganancia)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Distribution */}
          <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
            <div className="card-header">
              <div className="card-header-title">Distribución de Ingresos por Línea</div>
            </div>
            <div className="card-body">
              <div className="dist-row-group">
                {statistics.distribution.map((d, i) => (
                  <div key={i} className={`dist-item dist-${d.color}`}>
                    <div className="dist-label">{d.label}</div>
                    <div className="dist-value">{d.percentage}% ({formatCOPCompact(d.amount)})</div>
                    <div className="dist-bar-track">
                      <div className="dist-bar" style={{ width: `${d.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Reconciliation */}
        <div className="card">
          <div className="card-header">
            <div className="card-header-title">
              <Scale size={16} /> Arqueo y Conciliación por Medio de Pago
            </div>
            <span className="badge badge-green">100% Cuadrado</span>
          </div>
          <div className="card-body">
            {/* Efectivo */}
            <div className="recon-card">
              <div className="recon-header">
                <div className="recon-title">Efectivo en Caja Física</div>
                <span className="recon-status recon-ok">
                  <CircleCheck size={13} /> Cuadrado ($0 dif)
                </span>
              </div>
              <div className="recon-row">
                <span>Sistema:</span>
                <span className="recon-val">{formatCOP(statistics.reconciliation.efectivo.sistema)}</span>
              </div>
              <div className="recon-row">
                <span>Conteo Físico:</span>
                <span className="recon-val">{formatCOP(statistics.reconciliation.efectivo.conteo)}</span>
              </div>
            </div>

            {/* Nequi */}
            <div className="recon-card">
              <div className="recon-header">
                <div className="recon-title">Nequi / Transferencias Móviles</div>
                <span className="recon-status recon-ok">
                  <CircleCheck size={13} /> Verificado
                </span>
              </div>
              <div className="recon-row">
                <span>Registrado:</span>
                <span className="recon-val">{formatCOP(statistics.reconciliation.nequi.registrado)}</span>
              </div>
              <div className="recon-row">
                <span>En Cuenta App:</span>
                <span className="recon-val">{formatCOP(statistics.reconciliation.nequi.enCuenta)}</span>
              </div>
            </div>

            {/* Bancolombia */}
            <div className="recon-card">
              <div className="recon-header">
                <div className="recon-title">Bancolombia / QR</div>
                <span className="recon-status recon-ok">
                  <CircleCheck size={13} /> Verificado
                </span>
              </div>
              <div className="recon-row">
                <span>Registrado:</span>
                <span className="recon-val">{formatCOP(statistics.reconciliation.bancolombia.registrado)}</span>
              </div>
              <div className="recon-row">
                <span>Extracto Bancario:</span>
                <span className="recon-val">{formatCOP(statistics.reconciliation.bancolombia.extracto)}</span>
              </div>
            </div>

            {/* Cierre */}
            <div className="recon-cierre">
              <div className="recon-cierre-row">
                <span>Caja Base Inicial:</span>
                <span className="recon-val green-text">{formatCOP(statistics.cajaBase)}</span>
              </div>
              <div className="recon-cierre-row">
                <span>Retiro / Consignación Programada:</span>
                <span className="recon-val green-text">{formatCOP(statistics.retiroProgramado)}</span>
              </div>
              <div className="recon-cierre-divider"></div>
              <div className="recon-cierre-row">
                <span>Cierre Diario verificado por:</span>
                <span className="recon-val">Administrador (18:00 hrs)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
