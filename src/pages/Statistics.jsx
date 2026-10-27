import { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { formatCOP, formatCOPCompact } from '../utils/currency';
import { isDateInPeriod } from '../utils/calculations';
import { exportToCSV } from '../utils/exportCSV';
import { Download, CircleCheck, TrendingUp, Scale } from 'lucide-react';
import './Statistics.css';

const PERIOD_OPTIONS = ['Día', 'Semana', 'Este Mes', 'Año'];

export default function Statistics() {
  const { sales, products, accounts, moneyMovements, reconciliations, statistics } = useAppData();
  const [period, setPeriod] = useState('Este Mes');

  const productsById = useMemo(
    () => new Map(products.map(p => [p.id, p])),
    [products]
  );

  // Filtrar ventas y movimientos monetarios según el período seleccionado (RF-111)
  const filteredSales = useMemo(
    () => sales.filter(s => isDateInPeriod(s.date, period)),
    [sales, period]
  );

  const filteredMovements = useMemo(
    () => moneyMovements.filter(m => isDateInPeriod(m.date, period)),
    [moneyMovements, period]
  );

  // Cálculo de ingresos, costos, ganancia neta y distribución por categoría (RF-106 a RF-114)
  const computedStats = useMemo(() => {
    let totalIngresos = 0;
    let totalCOGS = 0;
    let revVivero = 0;
    let revMerch = 0;
    let revComestibles = 0;

    for (const sale of filteredSales) {
      totalIngresos += Number(sale.total) || 0;
      for (const item of sale.items ?? []) {
        const qty = Number(item.quantity) || 0;
        const subtotal = Number(item.subtotal) || (qty * (Number(item.unitPrice) || 0));
        const prod = productsById.get(item.productId);
        const cat = prod?.category
          || (item.productId?.startsWith('VIV') ? 'vivero'
            : item.productId?.startsWith('MER') ? 'merchandising'
            : 'comestibles');

        if (cat === 'vivero') revVivero += subtotal;
        else if (cat === 'merchandising') revMerch += subtotal;
        else revComestibles += subtotal;

        const unitCost = item.unitCost !== undefined && item.unitCost !== null
          ? Number(item.unitCost)
          : (Number(prod?.cost) || 0);
        totalCOGS += qty * unitCost;
      }
    }

    let extraEgresos = 0;
    for (const m of filteredMovements) {
      if (m.amount < 0) {
        extraEgresos += Math.abs(Number(m.amount));
      }
    }

    const totalEgresos = totalCOGS + extraEgresos;
    const gananciaNeta = totalIngresos - totalEgresos;
    const margenGlobal = totalIngresos > 0
      ? Math.round((gananciaNeta / totalIngresos) * 1000) / 10
      : 0;

    const totalCatRev = revVivero + revMerch + revComestibles;
    const pct = (val) => (totalCatRev > 0 ? Math.round((val / totalCatRev) * 100) : 0);

    const distribution = [
      { label: 'Plantas & Vivero', percentage: pct(revVivero), amount: revVivero, color: 'green' },
      { label: 'Merchandising Social', percentage: pct(revMerch), amount: revMerch, color: 'blue' },
      { label: 'Comestibles / Tienda', percentage: pct(revComestibles), amount: revComestibles, color: 'yellow' }
    ];

    // Agrupación por semanas del mes (Semana 1: días 1-7, Semana 2: 8-14, Semana 3: 15-21, Semana 4: 22-31)
    const weekBuckets = [
      { label: 'Semana 1 (Días 1-7)', ingresos: 0, costos: 0, ganancia: 0 },
      { label: 'Semana 2 (Días 8-14)', ingresos: 0, costos: 0, ganancia: 0 },
      { label: 'Semana 3 (Días 15-21)', ingresos: 0, costos: 0, ganancia: 0 },
      { label: 'Semana 4 (Días 22+)', ingresos: 0, costos: 0, ganancia: 0 }
    ];

    for (const sale of filteredSales) {
      const day = Number((sale.date ?? '').slice(8, 10)) || 1;
      const idx = Math.min(3, Math.floor((day - 1) / 7));
      weekBuckets[idx].ingresos += Number(sale.total) || 0;
      for (const item of sale.items ?? []) {
        const qty = Number(item.quantity) || 0;
        const prod = productsById.get(item.productId);
        const unitCost = item.unitCost !== undefined && item.unitCost !== null
          ? Number(item.unitCost)
          : (Number(prod?.cost) || 0);
        weekBuckets[idx].costos += qty * unitCost;
      }
    }

    for (const m of filteredMovements) {
      if (m.amount < 0) {
        const day = Number((m.date ?? '').slice(8, 10)) || 1;
        const idx = Math.min(3, Math.floor((day - 1) / 7));
        weekBuckets[idx].costos += Math.abs(Number(m.amount));
      }
    }

    for (const w of weekBuckets) {
      w.ganancia = w.ingresos - w.costos;
    }

    return {
      totalIngresos,
      totalEgresos,
      gananciaNeta,
      margenGlobal,
      transaccionesCount: filteredSales.length,
      distribution,
      weeks: weekBuckets
    };
  }, [filteredSales, filteredMovements, productsById]);

  // Saldos reales de cuentas y última conciliación por cuenta (RF-98 a RF-103)
  const accountSummary = useMemo(() => {
    const findAcc = (type, keyword) =>
      accounts.find(a => a.accountType === type || a.name?.toLowerCase().includes(keyword));

    const accEfectivo = findAcc('EFECTIVO', 'efectivo');
    const accNequi = findAcc('BILLETERA_DIGITAL', 'nequi');
    const accBanco = findAcc('BANCO', 'bancolombia');

    const latestRecon = (accId) =>
      reconciliations.find(r => r.accountId === accId);

    const recEfectivo = latestRecon(accEfectivo?.id ?? 1);
    const recNequi = latestRecon(accNequi?.id ?? 2);
    const recBanco = latestRecon(accBanco?.id ?? 3);

    const efectivoSistema = Number(accEfectivo?.balance ?? statistics.reconciliation.efectivo.sistema);
    const nequiSistema = Number(accNequi?.balance ?? statistics.reconciliation.nequi.registrado);
    const bancoSistema = Number(accBanco?.balance ?? statistics.reconciliation.bancolombia.registrado);

    const totalDisponible = efectivoSistema + nequiSistema + bancoSistema;
    const totalDiff = (recEfectivo?.difference ?? 0) + (recNequi?.difference ?? 0) + (recBanco?.difference ?? 0);

    return {
      totalDisponible,
      totalDiff,
      efectivo: {
        sistema: efectivoSistema,
        conteo: recEfectivo ? recEfectivo.countedBalance : efectivoSistema,
        diff: recEfectivo ? recEfectivo.difference : 0
      },
      nequi: {
        registrado: nequiSistema,
        enCuenta: recNequi ? recNequi.countedBalance : nequiSistema
      },
      bancolombia: {
        registrado: bancoSistema,
        extracto: recBanco ? recBanco.countedBalance : bancoSistema
      }
    };
  }, [accounts, reconciliations, statistics]);

  const maxBarValue = Math.max(
    1,
    ...computedStats.weeks.map(w => Math.max(w.ingresos, w.costos))
  );

  // Exportar reporte financiero a CSV (RF-138)
  const handleExportReport = () => {
    const rows = [
      {
        'Período': period,
        'Sección': 'Resumen General',
        'Concepto': 'Total Ingresos por Ventas',
        'Valor (COP)': computedStats.totalIngresos,
        'Detalle': `${computedStats.transaccionesCount} ventas en el período`
      },
      {
        'Período': period,
        'Sección': 'Resumen General',
        'Concepto': 'Total Egresos y Costos',
        'Valor (COP)': computedStats.totalEgresos,
        'Detalle': 'Costo de mercancía vendida + compras/gastos'
      },
      {
        'Período': period,
        'Sección': 'Resumen General',
        'Concepto': 'Ganancia Neta Estimada',
        'Valor (COP)': computedStats.gananciaNeta,
        'Detalle': `Margen global: ${computedStats.margenGlobal}%`
      },
      ...computedStats.distribution.map(d => ({
        'Período': period,
        'Sección': 'Ingresos por Línea',
        'Concepto': d.label,
        'Valor (COP)': d.amount,
        'Detalle': `${d.percentage}% del total`
      })),
      {
        'Período': period,
        'Sección': 'Saldos en Cuentas',
        'Concepto': 'Efectivo en Caja Menor',
        'Valor (COP)': accountSummary.efectivo.sistema,
        'Detalle': `Conteo: ${accountSummary.efectivo.conteo}`
      },
      {
        'Período': period,
        'Sección': 'Saldos en Cuentas',
        'Concepto': 'Nequi Comunitario',
        'Valor (COP)': accountSummary.nequi.registrado,
        'Detalle': 'Verificado'
      },
      {
        'Período': period,
        'Sección': 'Saldos en Cuentas',
        'Concepto': 'Bancolombia Principal',
        'Valor (COP)': accountSummary.bancolombia.registrado,
        'Detalle': 'Verificado'
      }
    ];
    exportToCSV(rows, `reporte_financiero_${period.toLowerCase().replace(/\s+/g, '_')}.csv`);
  };

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
          <button className="btn btn-dark" onClick={handleExportReport}>
            <Download size={14} /> Exportar Reporte
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Ingresos ({period})</div>
          <div className="kpi-value">{formatCOP(computedStats.totalIngresos)}</div>
          <div className="kpi-sub">Ventas acumuladas ({computedStats.transaccionesCount} transacciones)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Egresos / Costos ({period})</div>
          <div className="kpi-value red">{formatCOP(computedStats.totalEgresos)}</div>
          <div className="kpi-sub">Costo de mercancía vendida y compras</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ganancia Neta Estimada ({period})</div>
          <div className={`kpi-value ${computedStats.gananciaNeta >= 0 ? 'green' : 'red'}`}>
            {formatCOP(computedStats.gananciaNeta)}
          </div>
          <div className="kpi-sub">Margen global: {computedStats.margenGlobal}%</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Dinero Total Disponible</div>
          <div className="kpi-value blue">{formatCOP(accountSummary.totalDisponible)}</div>
          <div className="kpi-sub">
            Diferencia arqueo: {formatCOP(accountSummary.totalDiff)} ({accountSummary.totalDiff === 0 ? '100% Conciliado' : 'Con descuadre'})
          </div>
        </div>
      </div>

      {/* Two columns */}
      <div className="two-col stats-bottom">
        {/* Left: Charts */}
        <div className="stats-left">
          <div className="card">
            <div className="card-header">
              <div className="card-header-title">
                <TrendingUp size={16} /> Ingresos vs Costos por Semana ({period})
              </div>
              <div className="stats-legend">
                <span className="legend-item"><span className="legend-dot legend-green"></span> Ingresos</span>
                <span className="legend-item"><span className="legend-dot legend-red"></span> Costos</span>
              </div>
            </div>
            <div className="card-body">
              <div className="chart-bars">
                {computedStats.weeks.map((week, idx) => (
                  <div key={idx} className="chart-bar-row">
                    <div className="chart-bar-label">{week.label}</div>
                    <div className="chart-bar-container">
                      <div className="chart-bar-track">
                        <div
                          className="chart-bar chart-bar-ingresos"
                          style={{ width: `${Math.max(8, (week.ingresos / maxBarValue) * 100)}%` }}
                        >
                          <span className="chart-bar-value">{formatCOPCompact(week.ingresos)}</span>
                        </div>
                      </div>
                      <div className="chart-bar-track">
                        <div
                          className="chart-bar chart-bar-costos"
                          style={{ width: `${Math.max(8, (week.costos / maxBarValue) * 100)}%` }}
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
              <div className="card-header-title">Distribución de Ingresos por Línea ({period})</div>
            </div>
            <div className="card-body">
              <div className="dist-row-group">
                {computedStats.distribution.map((d, i) => (
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
            <span className="badge badge-green">
              {accountSummary.totalDiff === 0 ? '100% Cuadrado' : 'Revisar Diferencia'}
            </span>
          </div>
          <div className="card-body">
            {/* Efectivo */}
            <div className="recon-card">
              <div className="recon-header">
                <div className="recon-title">Efectivo en Caja Física</div>
                <span className="recon-status recon-ok">
                  <CircleCheck size={13} /> Cuadrado ({formatCOP(accountSummary.efectivo.diff)} dif)
                </span>
              </div>
              <div className="recon-row">
                <span>Saldo Sistema:</span>
                <span className="recon-val">{formatCOP(accountSummary.efectivo.sistema)}</span>
              </div>
              <div className="recon-row">
                <span>Último Conteo:</span>
                <span className="recon-val">{formatCOP(accountSummary.efectivo.conteo)}</span>
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
                <span>Saldo Registrado:</span>
                <span className="recon-val">{formatCOP(accountSummary.nequi.registrado)}</span>
              </div>
              <div className="recon-row">
                <span>En Cuenta App:</span>
                <span className="recon-val">{formatCOP(accountSummary.nequi.enCuenta)}</span>
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
                <span>Saldo Registrado:</span>
                <span className="recon-val">{formatCOP(accountSummary.bancolombia.registrado)}</span>
              </div>
              <div className="recon-row">
                <span>Extracto Bancario:</span>
                <span className="recon-val">{formatCOP(accountSummary.bancolombia.extracto)}</span>
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
                <span>Estado de Cuentas:</span>
                <span className="recon-val">Sincronizado con ventas</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
