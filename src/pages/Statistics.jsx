import { useState, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { formatCOP, formatCOPCompact } from '../utils/currency';
import { isDateInPeriod } from '../utils/calculations';
import { exportToCSV } from '../utils/exportCSV';
import {
  Download, CircleCheck, TrendingUp, Scale,
  AlertTriangle, AlertOctagon, ArrowRightLeft, History, X, Save
} from 'lucide-react';
import './Statistics.css';

const PERIOD_OPTIONS = ['Día', 'Semana', 'Este Mes', 'Año'];

export default function Statistics() {
  const {
    sales,
    products,
    accounts,
    moneyMovements,
    reconciliations,
    statistics,
    addReconciliation,
    transferBetweenAccounts,
    showToast
  } = useAppData();

  const [period, setPeriod] = useState('Este Mes');

  // Estado del Modal de Arqueo / Conciliación (RF-102 a RF-104)
  const [reconModalOpen, setReconModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(1);
  const [countedInput, setCountedInput] = useState('');
  const [justificationInput, setJustificationInput] = useState('');
  const [adjustBalance, setAdjustBalance] = useState(true);
  const [reconError, setReconError] = useState('');
  const [savingRecon, setSavingRecon] = useState(false);

  // Estado del Modal de Transferencia entre Cuentas (RF-101)
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState(1);
  const [transferToId, setTransferToId] = useState(3);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferConcept, setTransferConcept] = useState('');
  const [transferError, setTransferError] = useState('');
  const [savingTransfer, setSavingTransfer] = useState(false);

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
      if (m.amount < 0 && m.movementType !== 'TRANSFERENCIA') {
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
      if (m.amount < 0 && m.movementType !== 'TRANSFERENCIA') {
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
      reconciliations.find(r => Number(r.accountId) === Number(accId));

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
        id: accEfectivo?.id ?? 1,
        name: accEfectivo?.name ?? 'Efectivo Caja Menor',
        sistema: efectivoSistema,
        conteo: recEfectivo ? recEfectivo.countedBalance : efectivoSistema,
        diff: recEfectivo ? recEfectivo.difference : 0,
        status: recEfectivo?.status ?? 'CUADRADO',
        date: recEfectivo?.date ?? ''
      },
      nequi: {
        id: accNequi?.id ?? 2,
        name: accNequi?.name ?? 'Nequi Comunitario',
        registrado: nequiSistema,
        enCuenta: recNequi ? recNequi.countedBalance : nequiSistema,
        diff: recNequi ? recNequi.difference : 0,
        status: recNequi?.status ?? 'CUADRADO',
        date: recNequi?.date ?? ''
      },
      bancolombia: {
        id: accBanco?.id ?? 3,
        name: accBanco?.name ?? 'Bancolombia Principal',
        registrado: bancoSistema,
        extracto: recBanco ? recBanco.countedBalance : bancoSistema,
        diff: recBanco ? recBanco.difference : 0,
        status: recBanco?.status ?? 'CUADRADO',
        date: recBanco?.date ?? ''
      }
    };
  }, [accounts, reconciliations, statistics]);

  const maxBarValue = Math.max(
    1,
    ...computedStats.weeks.map(w => Math.max(w.ingresos, w.costos))
  );

  // --------- Lógica del Modal de Arqueo (RF-102, RF-103, RF-104) ---------
  const selectedAccount = useMemo(
    () => accounts.find(a => Number(a.id) === Number(selectedAccountId)) || accounts[0],
    [accounts, selectedAccountId]
  );

  const expectedBalanceForModal = Number(selectedAccount?.balance ?? 0);
  const parsedCounted = countedInput === '' ? expectedBalanceForModal : Number(countedInput);
  const modalDiff = Number.isNaN(parsedCounted) ? 0 : parsedCounted - expectedBalanceForModal;

  const openReconModal = (accountId) => {
    const acc = accounts.find(a => Number(a.id) === Number(accountId)) || accounts[0];
    setSelectedAccountId(acc?.id ?? 1);
    setCountedInput(String(acc?.balance ?? 0));
    setJustificationInput('');
    setAdjustBalance(true);
    setReconError('');
    setReconModalOpen(true);
  };

  const handleAccountSelectInModal = (newId) => {
    const numId = Number(newId);
    setSelectedAccountId(numId);
    const acc = accounts.find(a => Number(a.id) === numId);
    if (acc) {
      setCountedInput(String(acc.balance));
    }
    setReconError('');
  };

  const handleSaveReconciliation = async () => {
    if (savingRecon) return;
    setReconError('');

    const countedVal = Number(countedInput);
    if (countedInput === '' || Number.isNaN(countedVal) || countedVal < 0) {
      setReconError('Ingresa un valor numérico válido mayor o igual a $0.');
      return;
    }

    const diff = countedVal - expectedBalanceForModal;
    if (diff !== 0 && !justificationInput.trim()) {
      setReconError('La justificación es obligatoria cuando existe un descuadre (faltante o sobrante).');
      return;
    }

    setSavingRecon(true);
    try {
      await addReconciliation({
        accountId: selectedAccount.id,
        expectedBalance: expectedBalanceForModal,
        countedBalance: countedVal,
        justification: justificationInput,
        adjustAccountBalance: adjustBalance
      });
      showToast(
        diff === 0
          ? `Arqueo de ${selectedAccount.name} registrado (Cuadrado)`
          : `Arqueo de ${selectedAccount.name} registrado con descuadre justificado`,
        'success'
      );
      setReconModalOpen(false);
    } catch (err) {
      setReconError(err.message || 'No se pudo guardar la conciliación');
      showToast(`Error al guardar arqueo: ${err.message}`, 'error');
    } finally {
      setSavingRecon(false);
    }
  };

  // --------- Lógica del Modal de Transferencia (RF-101) ---------
  const openTransferModal = () => {
    const firstId = accounts[0]?.id ?? 1;
    const secondId = accounts.find(a => a.id !== firstId)?.id ?? 3;
    setTransferFromId(firstId);
    setTransferToId(secondId);
    setTransferAmount('');
    setTransferConcept('');
    setTransferError('');
    setTransferModalOpen(true);
  };

  const handleSaveTransfer = async () => {
    if (savingTransfer) return;
    setTransferError('');

    const amt = Number(transferAmount);
    if (!transferAmount || Number.isNaN(amt) || amt <= 0) {
      setTransferError('Ingresa un monto válido mayor a $0.');
      return;
    }
    if (Number(transferFromId) === Number(transferToId)) {
      setTransferError('La cuenta de origen y destino deben ser distintas.');
      return;
    }

    setSavingTransfer(true);
    try {
      await transferBetweenAccounts({
        fromAccountId: Number(transferFromId),
        toAccountId: Number(transferToId),
        amount: amt,
        concept: transferConcept
      });
      showToast('Traslado entre cuentas registrado correctamente', 'success');
      setTransferModalOpen(false);
    } catch (err) {
      setTransferError(err.message || 'No se pudo registrar el traslado');
      showToast(`Error en traslado: ${err.message}`, 'error');
    } finally {
      setSavingTransfer(false);
    }
  };

  // Exportar reporte financiero y de conciliaciones a CSV (RF-132, RF-138)
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
        'Concepto': accountSummary.efectivo.name,
        'Valor (COP)': accountSummary.efectivo.sistema,
        'Detalle': `Último conteo: ${accountSummary.efectivo.conteo} (Dif: ${accountSummary.efectivo.diff})`
      },
      {
        'Período': period,
        'Sección': 'Saldos en Cuentas',
        'Concepto': accountSummary.nequi.name,
        'Valor (COP)': accountSummary.nequi.registrado,
        'Detalle': `Último conteo: ${accountSummary.nequi.enCuenta} (Dif: ${accountSummary.nequi.diff})`
      },
      {
        'Período': period,
        'Sección': 'Saldos en Cuentas',
        'Concepto': accountSummary.bancolombia.name,
        'Valor (COP)': accountSummary.bancolombia.registrado,
        'Detalle': `Último conteo: ${accountSummary.bancolombia.extracto} (Dif: ${accountSummary.bancolombia.diff})`
      },
      ...reconciliations.slice(0, 15).map(r => ({
        'Período': r.date,
        'Sección': 'Historial de Conciliaciones',
        'Concepto': r.accountName || `Cuenta #${r.accountId}`,
        'Valor (COP)': r.countedBalance,
        'Detalle': `Esperado: ${r.expectedBalance} | Dif: ${r.difference} | Estado: ${r.status} | Motivo: ${r.justification}`
      }))
    ];
    exportToCSV(rows, `reporte_financiero_${period.toLowerCase().replace(/\s+/g, '_')}.csv`);
  };

  const renderDiffBadge = (diff) => {
    if (diff === 0) {
      return (
        <span className="recon-status recon-ok">
          <CircleCheck size={13} /> Cuadrado ($0 dif)
        </span>
      );
    }
    if (diff < 0) {
      return (
        <span className="recon-status recon-danger">
          <AlertOctagon size={13} /> Faltante ({formatCOP(diff)})
        </span>
      );
    }
    return (
      <span className="recon-status recon-warning">
        <AlertTriangle size={13} /> Sobrante (+{formatCOP(diff)})
      </span>
    );
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
          <button className="btn btn-outline" onClick={openTransferModal}>
            <ArrowRightLeft size={14} /> Trasladar Fondos
          </button>
          <button className="btn btn-primary" onClick={() => openReconModal(accountSummary.efectivo.id)}>
            <Scale size={14} /> Realizar Arqueo
          </button>
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
            Diferencia último arqueo: {formatCOP(accountSummary.totalDiff)} ({accountSummary.totalDiff === 0 ? '100% Conciliado' : 'Con descuadreJustificado'})
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
            <span className={`badge ${accountSummary.totalDiff === 0 ? 'badge-green' : 'badge-orange'}`}>
              {accountSummary.totalDiff === 0 ? '100% Cuadrado' : 'Descuadre Justificado'}
            </span>
          </div>
          <div className="card-body">
            {/* Efectivo */}
            <div className="recon-card">
              <div className="recon-header">
                <div className="recon-title">{accountSummary.efectivo.name}</div>
                {renderDiffBadge(accountSummary.efectivo.diff)}
              </div>
              <div className="recon-row">
                <span>Saldo Sistema:</span>
                <span className="recon-val">{formatCOP(accountSummary.efectivo.sistema)}</span>
              </div>
              <div className="recon-row">
                <span>Último Conteo Físico:</span>
                <span className="recon-val">{formatCOP(accountSummary.efectivo.conteo)}</span>
              </div>
              <div className="recon-card-actions">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => openReconModal(accountSummary.efectivo.id)}
                >
                  <Scale size={13} /> Arqueo de Efectivo
                </button>
              </div>
            </div>

            {/* Nequi */}
            <div className="recon-card">
              <div className="recon-header">
                <div className="recon-title">{accountSummary.nequi.name}</div>
                {renderDiffBadge(accountSummary.nequi.diff)}
              </div>
              <div className="recon-row">
                <span>Saldo Registrado:</span>
                <span className="recon-val">{formatCOP(accountSummary.nequi.registrado)}</span>
              </div>
              <div className="recon-row">
                <span>Último Saldo Verificado:</span>
                <span className="recon-val">{formatCOP(accountSummary.nequi.enCuenta)}</span>
              </div>
              <div className="recon-card-actions">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => openReconModal(accountSummary.nequi.id)}
                >
                  <Scale size={13} /> Conciliar Nequi
                </button>
              </div>
            </div>

            {/* Bancolombia */}
            <div className="recon-card">
              <div className="recon-header">
                <div className="recon-title">{accountSummary.bancolombia.name}</div>
                {renderDiffBadge(accountSummary.bancolombia.diff)}
              </div>
              <div className="recon-row">
                <span>Saldo Registrado:</span>
                <span className="recon-val">{formatCOP(accountSummary.bancolombia.registrado)}</span>
              </div>
              <div className="recon-row">
                <span>Último Extracto Bancario:</span>
                <span className="recon-val">{formatCOP(accountSummary.bancolombia.extracto)}</span>
              </div>
              <div className="recon-card-actions">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => openReconModal(accountSummary.bancolombia.id)}
                >
                  <Scale size={13} /> Conciliar Banco
                </button>
              </div>
            </div>

            {/* Cierre */}
            <div className="recon-cierre">
              <div className="recon-cierre-row">
                <span>Caja Base Inicial:</span>
                <span className="recon-val green-text">{formatCOP(statistics.cajaBase)}</span>
              </div>
              <div className="recon-cierre-row">
                <span>Total en Cuentas:</span>
                <span className="recon-val green-text">{formatCOP(accountSummary.totalDisponible)}</span>
              </div>
              <div className="recon-cierre-divider"></div>
              <div className="recon-cierre-row">
                <span>Arqueos Registrados:</span>
                <span className="recon-val">{reconciliations.length} conciliaciones</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historial de Conciliaciones y Diferencias (RF-132) */}
      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="card-header">
          <div className="card-header-title">
            <History size={16} /> Historial de Arqueos y Conciliaciones Registradas
          </div>
          <span className="badge badge-blue">{reconciliations.length} registros</span>
        </div>
        <div className="table-wrapper">
          {reconciliations.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cuenta / Medio</th>
                  <th>Saldo Esperado</th>
                  <th>Saldo Contado / Real</th>
                  <th>Diferencia</th>
                  <th>Estado</th>
                  <th>Justificación / Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {reconciliations.slice(0, 12).map(rec => (
                  <tr key={rec.id}>
                    <td className="td-muted">{rec.date}</td>
                    <td><strong>{rec.accountName || `Cuenta #${rec.accountId}`}</strong></td>
                    <td>{formatCOP(rec.expectedBalance)}</td>
                    <td><strong>{formatCOP(rec.countedBalance)}</strong></td>
                    <td>
                      <span className={rec.difference === 0 ? 'recon-diff-zero' : rec.difference < 0 ? 'recon-diff-neg' : 'recon-diff-pos'}>
                        {rec.difference > 0 ? '+' : ''}{formatCOP(rec.difference)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${rec.status === 'CUADRADO' ? 'badge-green' : 'badge-orange'}`}>
                        {rec.status === 'CUADRADO' ? 'Cuadrado' : 'Descuadre Justificado'}
                      </span>
                    </td>
                    <td className="td-muted">{rec.justification || 'Sin observaciones'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>Aún no se han registrado arqueos de caja.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Arqueo Físico y Conciliación (RF-102 a RF-104) */}
      {reconModalOpen && (
        <div className="modal-overlay" onClick={() => setReconModalOpen(false)}>
          <div className="modal-content recon-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h3>Realizar Arqueo y Conciliación de Cuenta</h3>
                <p>Compara el saldo esperado en libros con el dinero real disponible</p>
              </div>
              <button className="modal-close" onClick={() => setReconModalOpen(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Cuenta o Medio de Dinero a Conciliar</label>
                <select
                  className="input-field"
                  value={selectedAccountId}
                  onChange={e => handleAccountSelectInModal(e.target.value)}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.accountType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="recon-modal-summary">
                <div className="recon-summary-item">
                  <span className="recon-summary-label">Saldo Esperado en Sistema:</span>
                  <span className="recon-summary-value">{formatCOP(expectedBalanceForModal)}</span>
                </div>
                <div className="recon-summary-item">
                  <span className="recon-summary-label">Dinero Real Contado:</span>
                  <span className="recon-summary-value">{formatCOP(Number.isNaN(parsedCounted) ? 0 : parsedCounted)}</span>
                </div>
                <div className={`recon-summary-diff ${modalDiff === 0 ? 'diff-ok' : modalDiff < 0 ? 'diff-neg' : 'diff-pos'}`}>
                  <span className="recon-summary-label">Resultado del Arqueo:</span>
                  <span className="recon-summary-value">
                    {modalDiff === 0 && '✓ Cuadrado ($0 diferencia)'}
                    {modalDiff < 0 && `⚠ Faltante en Caja (${formatCOP(modalDiff)})`}
                    {modalDiff > 0 && `⚠ Sobrante en Caja (+${formatCOP(modalDiff)})`}
                  </span>
                </div>
              </div>

              <div className="input-group">
                <label>Dinero Físico Contado / Saldo Real en Extracto (COP) *</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="input-field"
                  placeholder="Ej: 720000"
                  value={countedInput}
                  onChange={e => {
                    setCountedInput(e.target.value);
                    setReconError('');
                  }}
                />
                <span className="input-hint">
                  Ingresa el valor total contado físicamente en billetes/monedas o verificado en la app bancaria.
                </span>
              </div>

              <div className="input-group">
                <label>
                  Justificación / Observaciones del Arqueo {modalDiff !== 0 ? '(Obligatorio por descuadre) *' : '(Opcional)'}
                </label>
                <textarea
                  className={`input-field ${modalDiff !== 0 && !justificationInput.trim() && reconError ? 'error' : ''}`}
                  placeholder={
                    modalDiff !== 0
                      ? 'Ej: Compra urgente de transporte o insumo menor no registrada, vuelta mal entregada...'
                      : 'Ej: Arqueo de cierre de turno verificado sin novedades.'
                  }
                  value={justificationInput}
                  onChange={e => {
                    setJustificationInput(e.target.value);
                    setReconError('');
                  }}
                />
              </div>

              {modalDiff !== 0 && (
                <label className="recon-checkbox-row">
                  <input
                    type="checkbox"
                    checked={adjustBalance}
                    onChange={e => setAdjustBalance(e.target.checked)}
                  />
                  <span>
                    Ajustar automáticamente el saldo de <strong>{selectedAccount?.name}</strong> a{' '}
                    <strong>{formatCOP(parsedCounted)}</strong> (registra movimiento <code>AJUSTE_CONCILIACION</code>)
                  </span>
                </label>
              )}

              {reconError && <div className="input-error" style={{ marginTop: '8px' }}>{reconError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setReconModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSaveReconciliation} disabled={savingRecon}>
                <Save size={14} /> {savingRecon ? 'Guardando...' : 'Guardar Conciliación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Traslado entre Efectivo y Cuentas Bancarias (RF-101) */}
      {transferModalOpen && (
        <div className="modal-overlay" onClick={() => setTransferModalOpen(false)}>
          <div className="modal-content recon-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h3>Registrar Traslado entre Cuentas</h3>
                <p>Consignación de efectivo a banco, retiro o transferencia interna (RF-101)</p>
              </div>
              <button className="modal-close" onClick={() => setTransferModalOpen(false)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="two-col" style={{ gap: '12px' }}>
                <div className="input-group">
                  <label>Cuenta de Origen (Sale dinero)</label>
                  <select
                    className="input-field"
                    value={transferFromId}
                    onChange={e => {
                      setTransferFromId(Number(e.target.value));
                      setTransferError('');
                    }}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCOPCompact(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label>Cuenta de Destino (Entra dinero)</label>
                  <select
                    className="input-field"
                    value={transferToId}
                    onChange={e => {
                      setTransferToId(Number(e.target.value));
                      setTransferError('');
                    }}
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatCOPCompact(acc.balance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Monto a Trasladar (COP) *</label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  className="input-field"
                  placeholder="Ej: 200000"
                  value={transferAmount}
                  onChange={e => {
                    setTransferAmount(e.target.value);
                    setTransferError('');
                  }}
                />
              </div>

              <div className="input-group">
                <label>Concepto / Motivo del Traslado</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ej: Consignación de efectivo de ventas de la semana a Bancolombia"
                  value={transferConcept}
                  onChange={e => setTransferConcept(e.target.value)}
                />
              </div>

              {transferError && <div className="input-error">{transferError}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setTransferModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSaveTransfer} disabled={savingTransfer}>
                <ArrowRightLeft size={14} /> {savingTransfer ? 'Registrando...' : 'Confirmar Traslado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
