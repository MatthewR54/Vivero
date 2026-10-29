import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP } from '../utils/currency';
import { exportToCSV } from '../utils/exportCSV';
import {
  getTodayString,
  getOffsetDateString,
  calculateWeightedAverageCost,
  calculateMargin,
  generateSKU
} from '../utils/calculations';
import {
  Plus,
  Sprout,
  Search,
  Download,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Calendar,
  CloudSun,
  PackageCheck,
  Pencil,
  X,
  Save,
  ArrowRight,
  Info,
  Clock,
  Layers
} from 'lucide-react';
import './Production.css';

const FILTER_TABS = [
  { key: 'all', label: 'Todos los Lotes' },
  { key: 'active', label: 'Activos en Cultivo' },
  { key: 'EN_PRODUCCION', label: 'En Producción (Siembra)' },
  { key: 'EN_CRECIMIENTO', label: 'En Crecimiento' },
  { key: 'delayed', label: '⚠ Tiempo Excedido' },
  { key: 'DISPONIBLE', label: 'Disponibles / Cosechados' }
];

const STATUS_META = {
  EN_PRODUCCION: {
    label: 'En producción',
    sub: 'Germinación / Esqueje',
    badgeClass: 'prod-badge-production'
  },
  EN_CRECIMIENTO: {
    label: 'En crecimiento',
    sub: 'Desarrollo vegetativo',
    badgeClass: 'prod-badge-growth'
  },
  DISPONIBLE: {
    label: 'Disponible para venta',
    sub: 'Incorporado a inventario',
    badgeClass: 'prod-badge-ready'
  },
  PERDIDA_TOTAL: {
    label: 'Pérdida total',
    sub: 'Lote dado de baja',
    badgeClass: 'prod-badge-loss'
  }
};

const COMMON_INPUT_PRESETS = [
  { name: 'Sustrato orgánico abonado', unit: 'Bulto 20Kg', suggestedCost: 24000 },
  { name: 'Macetas biodegradables / vivero P12', unit: 'Unidad', suggestedCost: 850 },
  { name: 'Fertilizante orgánico / Humus de lombriz', unit: 'Litro', suggestedCost: 18000 },
  { name: 'Control fitosanitario biológico', unit: 'Aplicación', suggestedCost: 15000 },
  { name: 'Mano de obra repique y poda formativa', unit: 'Jornal', suggestedCost: 45000 }
];

function calculateDaysBetween(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const d1 = new Date(`${startStr}T00:00:00`);
  const d2 = new Date(`${endStr}T00:00:00`);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return 0;
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export default function Production() {
  const {
    productionBatches,
    products,
    nextProductId,
    addProductionBatch,
    updateProductionBatch,
    addProductionInput,
    closeProductionBatch,
    showToast
  } = useAppData();
  const navigate = useNavigate();

  const todayStr = getTodayString();
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');

  // Productos de categoría vivero para vincular lotes
  const viveroProducts = useMemo(
    () => products.filter(p => p.category === 'vivero' || p.origin === 'Producción Vivero'),
    [products]
  );

  const productsById = useMemo(
    () => new Map(products.map(p => [p.id, p])),
    [products]
  );

  // Enriquecer cada lote con cálculos de días, demora (RF-50) y costo unitario estimado (RF-47)
  const enrichedBatches = useMemo(() => {
    return (productionBatches || []).map(batch => {
      const isActive = batch.status === 'EN_PRODUCCION' || batch.status === 'EN_CRECIMIENTO';
      const isDelayed = isActive && Boolean(batch.estimatedReadyDate && todayStr > batch.estimatedReadyDate);
      const delayDays = isDelayed ? calculateDaysBetween(batch.estimatedReadyDate, todayStr) : 0;
      const daysRemaining = isActive && !isDelayed && batch.estimatedReadyDate
        ? calculateDaysBetween(todayStr, batch.estimatedReadyDate)
        : 0;
      const endDateRef = batch.actualReadyDate || todayStr;
      const daysInCultivation = Math.max(0, calculateDaysBetween(batch.startDate, endDateRef));
      const qtyForCost = batch.currentQuantity > 0 ? batch.currentQuantity : batch.initialQuantity || 1;
      const estimatedUnitCost = Math.round((Number(batch.accumulatedCost) || 0) / qtyForCost);
      const linkedProduct = batch.targetProductId ? productsById.get(batch.targetProductId) : null;

      return {
        ...batch,
        isActive,
        isDelayed,
        delayDays,
        daysRemaining,
        daysInCultivation,
        estimatedUnitCost,
        linkedProduct
      };
    });
  }, [productionBatches, todayStr, productsById]);

  // KPIs de Producción (RF-47, RF-48, RF-49, RF-50)
  const kpis = useMemo(() => {
    const activeBatches = enrichedBatches.filter(b => b.isActive);
    const totalActivePlants = activeBatches.reduce((sum, b) => sum + (Number(b.currentQuantity) || 0), 0);
    const activeAccumulatedCost = activeBatches.reduce((sum, b) => sum + (Number(b.accumulatedCost) || 0), 0);
    const delayedBatches = activeBatches.filter(b => b.isDelayed);
    const completedBatches = enrichedBatches.filter(b => b.status === 'DISPONIBLE');
    const completedPlants = completedBatches.reduce((sum, b) => sum + (Number(b.currentQuantity) || 0), 0);

    return {
      activeCount: activeBatches.length,
      totalActivePlants,
      activeAccumulatedCost,
      delayedCount: delayedBatches.length,
      completedCount: completedBatches.length,
      completedPlants
    };
  }, [enrichedBatches]);

  const filteredBatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enrichedBatches.filter(b => {
      const matchSearch = !q ||
        b.batchCode?.toLowerCase().includes(q) ||
        b.species?.toLowerCase().includes(q) ||
        b.environmentalConditions?.toLowerCase().includes(q) ||
        b.linkedProduct?.name?.toLowerCase().includes(q) ||
        b.linkedProduct?.sku?.toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (filterTab === 'active') return b.isActive;
      if (filterTab === 'delayed') return b.isDelayed;
      if (filterTab !== 'all') return b.status === filterTab;
      return true;
    });
  }, [enrichedBatches, search, filterTab]);

  // ---------- 1. Modal: Nuevo Lote de Cultivo (RF-36 a RF-40, RF-43) ----------
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    species: '',
    targetProductId: '',
    initialQuantity: 30,
    startDate: todayStr,
    estimatedReadyDate: getOffsetDateString(45),
    status: 'EN_PRODUCCION',
    initialCost: 0,
    initialInputName: 'Semillas / Esquejes y sustrato base inicial',
    environmentalConditions: ''
  });
  const [createErrors, setCreateErrors] = useState({});
  const [savingCreate, setSavingCreate] = useState(false);

  const openCreateModal = () => {
    setCreateForm({
      species: '',
      targetProductId: '',
      initialQuantity: 30,
      startDate: getTodayString(),
      estimatedReadyDate: getOffsetDateString(45),
      status: 'EN_PRODUCCION',
      initialCost: 0,
      initialInputName: 'Semillas / Esquejes y sustrato base inicial',
      environmentalConditions: ''
    });
    setCreateErrors({});
    setCreateModalOpen(true);
  };

  const handleSelectLinkedProductInCreate = (productId) => {
    const prod = productsById.get(productId);
    setCreateForm(prev => ({
      ...prev,
      targetProductId: productId,
      species: prev.species.trim() ? prev.species : (prod?.name || '')
    }));
  };

  const handleSaveNewBatch = async () => {
    if (savingCreate) return;
    const errs = {};
    if (!createForm.species.trim()) {
      errs.species = 'Ingresa la especie o tipo de planta a cultivar';
    }
    const qty = Math.floor(Number(createForm.initialQuantity));
    if (!qty || qty <= 0) {
      errs.initialQuantity = 'La cantidad inicial debe ser mayor a 0';
    }
    if (!createForm.startDate) {
      errs.startDate = 'Selecciona la fecha de inicio';
    }
    if (!createForm.estimatedReadyDate) {
      errs.estimatedReadyDate = 'Selecciona la fecha estimada de disponibilidad';
    } else if (createForm.startDate && createForm.estimatedReadyDate < createForm.startDate) {
      errs.estimatedReadyDate = 'La fecha estimada no puede ser anterior a la fecha de inicio';
    }
    if (Number(createForm.initialCost) < 0) {
      errs.initialCost = 'El costo inicial no puede ser negativo';
    }

    setCreateErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast('Revisa los campos obligatorios del lote', 'error');
      return;
    }

    setSavingCreate(true);
    try {
      const created = await addProductionBatch({
        species: createForm.species.trim(),
        targetProductId: createForm.targetProductId || null,
        initialQuantity: qty,
        startDate: createForm.startDate,
        estimatedReadyDate: createForm.estimatedReadyDate,
        status: createForm.status,
        initialCost: Number(createForm.initialCost) || 0,
        initialInputName: createForm.initialInputName,
        environmentalConditions: createForm.environmentalConditions.trim()
      });
      showToast(`Lote ${created.batchCode} (${created.species}) registrado en cultivo`, 'success');
      setCreateModalOpen(false);
    } catch (err) {
      showToast(err.message || 'No se pudo crear el lote de producción', 'error');
    } finally {
      setSavingCreate(false);
    }
  };

  // ---------- 2. Modal: Insumos y Costos Acumulados (RF-41, RF-42, RF-47, RF-48) ----------
  const [inputsModalBatchId, setInputsModalBatchId] = useState(null);
  const [inputForm, setInputForm] = useState({
    inputName: '',
    quantity: 1,
    unit: 'Unidad',
    unitCost: '',
    applicationDate: todayStr,
    notes: ''
  });
  const [savingInput, setSavingInput] = useState(false);

  const activeInputsBatch = useMemo(
    () => enrichedBatches.find(b => b.id === inputsModalBatchId) || null,
    [enrichedBatches, inputsModalBatchId]
  );

  const openInputsModal = (batch) => {
    setInputsModalBatchId(batch.id);
    setInputForm({
      inputName: '',
      quantity: 1,
      unit: 'Unidad',
      unitCost: '',
      applicationDate: getTodayString(),
      notes: ''
    });
  };

  const applyPresetInput = (preset) => {
    setInputForm(prev => ({
      ...prev,
      inputName: preset.name,
      unit: preset.unit,
      unitCost: preset.suggestedCost
    }));
  };

  const handleAddInput = async () => {
    if (!activeInputsBatch || savingInput) return;
    if (!inputForm.inputName.trim()) {
      showToast('Ingresa el nombre del insumo o labor aplicada', 'error');
      return;
    }
    const qty = Number(inputForm.quantity);
    if (!qty || qty <= 0) {
      showToast('La cantidad del insumo debe ser mayor a 0', 'error');
      return;
    }
    const uCost = Number(inputForm.unitCost);
    if (inputForm.unitCost === '' || Number.isNaN(uCost) || uCost < 0) {
      showToast('Ingresa un costo unitario válido (mayor o igual a $0)', 'error');
      return;
    }

    setSavingInput(true);
    try {
      await addProductionInput({
        batchId: activeInputsBatch.id,
        inputName: inputForm.inputName.trim(),
        quantity: qty,
        unit: inputForm.unit.trim() || 'Unidad',
        unitCost: uCost,
        applicationDate: inputForm.applicationDate || getTodayString(),
        notes: inputForm.notes.trim()
      });
      showToast(`Insumo agregado al lote ${activeInputsBatch.batchCode}`, 'success');
      setInputForm({
        inputName: '',
        quantity: 1,
        unit: 'Unidad',
        unitCost: '',
        applicationDate: getTodayString(),
        notes: ''
      });
    } catch (err) {
      showToast(err.message || 'No se pudo registrar el insumo', 'error');
    } finally {
      setSavingInput(false);
    }
  };

  // ---------- 3. Modal: Editar Estado, Clima y Seguimiento (RF-43, RF-44, RF-50) ----------
  const [editBatchModal, setEditBatchModal] = useState(null);
  const [editBatchForm, setEditBatchForm] = useState({});
  const [savingBatchEdit, setSavingBatchEdit] = useState(false);

  const openEditBatchModal = (batch) => {
    setEditBatchModal(batch);
    setEditBatchForm({
      species: batch.species || '',
      targetProductId: batch.targetProductId || '',
      status: batch.status || 'EN_PRODUCCION',
      currentQuantity: batch.currentQuantity ?? batch.initialQuantity,
      estimatedReadyDate: batch.estimatedReadyDate || '',
      environmentalConditions: batch.environmentalConditions || ''
    });
  };

  const handleSaveBatchEdit = async () => {
    if (!editBatchModal || savingBatchEdit) return;
    if (!editBatchForm.species.trim()) {
      showToast('El nombre de la especie no puede estar vacío', 'error');
      return;
    }
    const currQty = Math.floor(Number(editBatchForm.currentQuantity));
    if (Number.isNaN(currQty) || currQty < 0) {
      showToast('La cantidad actual de plantas no puede ser negativa', 'error');
      return;
    }

    setSavingBatchEdit(true);
    try {
      await updateProductionBatch(editBatchModal.id, {
        species: editBatchForm.species.trim(),
        targetProductId: editBatchForm.targetProductId || null,
        status: editBatchForm.status,
        currentQuantity: currQty,
        estimatedReadyDate: editBatchForm.estimatedReadyDate,
        environmentalConditions: editBatchForm.environmentalConditions.trim()
      });
      showToast(`Seguimiento del lote ${editBatchModal.batchCode} actualizado`, 'success');
      setEditBatchModal(null);
    } catch (err) {
      showToast(err.message || 'No se pudo actualizar el lote', 'error');
    } finally {
      setSavingBatchEdit(false);
    }
  };

  // Cambio rápido de etapa biológica desde la tarjeta/fila (RF-44)
  const handleQuickAdvanceStage = async (batch, nextStatus) => {
    try {
      await updateProductionBatch(batch.id, { status: nextStatus });
      const label = STATUS_META[nextStatus]?.label || nextStatus;
      showToast(`Lote ${batch.batchCode} actualizado a "${label}"`, 'success');
    } catch (err) {
      showToast(err.message || 'No se pudo cambiar el estado del lote', 'error');
    }
  };

  // ---------- 4. Modal: Finalizar Lote e Incorporar a Inventario (RF-45, RF-46, RF-47) ----------
  const [closeModalBatch, setCloseModalBatch] = useState(null);
  const [closeForm, setCloseForm] = useState({
    finalQuantity: 1,
    targetMode: 'existing',
    targetProductId: '',
    salePrice: '',
    newProductName: '',
    newProductMinStock: 10,
    newProductLocation: 'Zona Vivero • Estante Principal',
    newProductUnit: 'Unidad / Maceta'
  });
  const [savingClose, setSavingClose] = useState(false);

  const openCloseModal = (batch) => {
    const qty = batch.currentQuantity > 0 ? batch.currentQuantity : batch.initialQuantity;
    const unitCost = Math.round((Number(batch.accumulatedCost) || 0) / Math.max(1, qty));
    const existingProd = batch.targetProductId ? productsById.get(batch.targetProductId) : null;
    const suggestedPrice = existingProd
      ? existingProd.price
      : Math.max(5000, Math.ceil((unitCost * 1.65) / 500) * 500);

    setCloseModalBatch(batch);
    setCloseForm({
      finalQuantity: qty,
      targetMode: existingProd ? 'existing' : (viveroProducts.length > 0 ? 'existing' : 'new'),
      targetProductId: existingProd ? existingProd.id : (viveroProducts[0]?.id || ''),
      salePrice: suggestedPrice,
      newProductName: batch.species,
      newProductMinStock: 10,
      newProductLocation: 'Zona Vivero • Estante Principal',
      newProductUnit: 'Unidad / Maceta'
    });
  };

  const closePreview = useMemo(() => {
    if (!closeModalBatch) return null;
    const finalQty = Math.max(1, Math.floor(Number(closeForm.finalQuantity) || 1));
    const totalCost = Number(closeModalBatch.accumulatedCost) || 0;
    const unitCost = Math.round(totalCost / finalQty);
    const targetProd = closeForm.targetMode === 'existing'
      ? productsById.get(closeForm.targetProductId)
      : null;

    const prevStock = targetProd ? Number(targetProd.stock) || 0 : 0;
    const resultingStock = prevStock + finalQty;
    const newWeightedCost = targetProd
      ? calculateWeightedAverageCost(prevStock, targetProd.cost, finalQty, unitCost)
      : unitCost;

    const priceNum = Number(closeForm.salePrice) || (targetProd?.price ?? 0);
    const { profit, margin } = calculateMargin(priceNum, newWeightedCost);

    return {
      finalQty,
      totalCost,
      unitCost,
      targetProd,
      prevStock,
      resultingStock,
      newWeightedCost,
      priceNum,
      profit,
      margin,
      nextSku: generateSKU('vivero', nextProductId.vivero || 1)
    };
  }, [closeModalBatch, closeForm, productsById, nextProductId]);

  const handleConfirmCloseBatch = async () => {
    if (!closeModalBatch || savingClose) return;
    const finalQty = Math.floor(Number(closeForm.finalQuantity));
    if (!finalQty || finalQty <= 0) {
      showToast('La cantidad final de plantas disponibles debe ser mayor a 0', 'error');
      return;
    }
    if (closeForm.targetMode === 'existing' && !closeForm.targetProductId) {
      showToast('Selecciona el producto del catálogo al que se sumarán las plantas', 'error');
      return;
    }
    if (closeForm.targetMode === 'new' && !closeForm.newProductName.trim()) {
      showToast('Ingresa el nombre comercial para el nuevo producto en inventario', 'error');
      return;
    }
    const priceNum = Number(closeForm.salePrice);
    if (!priceNum || priceNum <= 0) {
      showToast('El precio de venta al público debe ser mayor a $0', 'error');
      return;
    }

    setSavingClose(true);
    try {
      const res = await closeProductionBatch({
        batchId: closeModalBatch.id,
        finalQuantity: finalQty,
        targetMode: closeForm.targetMode,
        targetProductId: closeForm.targetProductId,
        salePrice: priceNum,
        newProductData: {
          name: closeForm.newProductName.trim(),
          minStock: Number(closeForm.newProductMinStock) || 10,
          location: closeForm.newProductLocation.trim(),
          unit: closeForm.newProductUnit.trim()
        }
      });
      showToast(
        `Lote ${closeModalBatch.batchCode} declarado disponible: +${finalQty} plantas incorporadas al inventario (${res.finalProductId})`,
        'success'
      );
      setCloseModalBatch(null);
    } catch (err) {
      showToast(err.message || 'Error al incorporar el lote al inventario', 'error');
    } finally {
      setSavingClose(false);
    }
  };

  // ---------- Exportación de Reporte de Costos de Producción (RF-128) ----------
  const handleExportProductionCSV = () => {
    const headers = [
      'Código Lote',
      'Especie / Planta',
      'Producto Catálogo',
      'Estado',
      'Cant. Inicial',
      'Cant. Actual / Final',
      'Fecha Inicio',
      'Fecha Estimada',
      'Fecha Cierre Real',
      'Días en Cultivo',
      'Alerta Tiempo',
      'Costo Acumulado (COP)',
      'Costo Unitario Estimado (COP)',
      'N° Insumos Aplicados',
      'Condiciones Climáticas / Factores'
    ];
    const rows = filteredBatches.map(b => [
      b.batchCode,
      b.species,
      b.linkedProduct ? `${b.linkedProduct.sku} - ${b.linkedProduct.name}` : 'Sin vincular',
      STATUS_META[b.status]?.label || b.status,
      b.initialQuantity,
      b.currentQuantity,
      b.startDate,
      b.estimatedReadyDate,
      b.actualReadyDate || 'En curso',
      b.daysInCultivation,
      b.isDelayed ? `Demorado (+${b.delayDays} días)` : 'En tiempo',
      b.accumulatedCost,
      b.estimatedUnitCost,
      (b.inputs || []).length,
      b.environmentalConditions || ''
    ]);
    exportToCSV(`costos_produccion_vivero_${todayStr}.csv`, headers, rows);
    showToast('Reporte de costos de producción exportado a CSV', 'success');
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Lotes de Cultivo y Producción de Plantas{' '}
            <span className="page-title-sub">
              — {kpis.activeCount} lotes activos ({kpis.totalActivePlants} plantas en vivero)
            </span>
          </h1>
          <p className="page-subtitle">
            Control biológico de germinación, crecimiento, insumos aplicados, factores climáticos y traspaso de cosechas al inventario de venta.
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-outline" onClick={handleExportProductionCSV}>
            <Download size={16} /> Exportar Costos CSV
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Nuevo Lote de Cultivo
          </button>
        </div>
      </div>

      {/* KPIs de Producción (RF-47 a RF-50) */}
      <div className="prod-kpi-grid">
        <div className="card prod-kpi-card">
          <div className="prod-kpi-icon green">
            <Sprout size={20} />
          </div>
          <div>
            <div className="prod-kpi-label">Procesos de Cultivo Activos</div>
            <div className="prod-kpi-value">{kpis.activeCount} lotes</div>
            <div className="prod-kpi-sub">{kpis.totalActivePlants} plantas en desarrollo biológico</div>
          </div>
        </div>

        <div className="card prod-kpi-card">
          <div className="prod-kpi-icon blue">
            <FlaskConical size={20} />
          </div>
          <div>
            <div className="prod-kpi-label">Costos Acumulados en Curso</div>
            <div className="prod-kpi-value">{formatCOP(kpis.activeAccumulatedCost)}</div>
            <div className="prod-kpi-sub">
              Costo prom. est.:{' '}
              {kpis.totalActivePlants > 0
                ? `${formatCOP(Math.round(kpis.activeAccumulatedCost / kpis.totalActivePlants))} / planta`
                : '$0 / planta'}
            </div>
          </div>
        </div>

        <div className="card prod-kpi-card">
          <div className={`prod-kpi-icon ${kpis.delayedCount > 0 ? 'amber' : 'green'}`}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="prod-kpi-label">Tiempo Estimado Excedido</div>
            <div className="prod-kpi-value">{kpis.delayedCount} lotes</div>
            <div className="prod-kpi-sub">
              {kpis.delayedCount > 0
                ? 'Requieren revisión por clima o maduración'
                : 'Todos los lotes cumplen el cronograma'}
            </div>
          </div>
        </div>

        <div className="card prod-kpi-card">
          <div className="prod-kpi-icon purple">
            <PackageCheck size={20} />
          </div>
          <div>
            <div className="prod-kpi-label">Cosechados / Disponibles</div>
            <div className="prod-kpi-value">{kpis.completedCount} lotes</div>
            <div className="prod-kpi-sub">{kpis.completedPlants} plantas incorporadas al catálogo</div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="card">
        <div className="prod-filters">
          <div className="prod-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="input-field"
              placeholder="Buscar por código de lote (LOT-001), especie, producto vinculado o condiciones climáticas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="chip-group">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                className={`chip ${filterTab === tab.key ? 'active' : ''}`}
                onClick={() => setFilterTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla / Listado de Lotes de Producción */}
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Especie / Planta en Cultivo</th>
                <th>Plantas (Actual / Inicial)</th>
                <th>Cronograma & Tiempo</th>
                <th>Etapa Biológica</th>
                <th>Costos e Insumos</th>
                <th>Condiciones Climáticas / Factores</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.map(batch => {
                const statusMeta = STATUS_META[batch.status] || STATUS_META.EN_PRODUCCION;
                const survivalRate = batch.initialQuantity > 0
                  ? Math.round((batch.currentQuantity / batch.initialQuantity) * 100)
                  : 100;

                return (
                  <tr key={batch.id} className={batch.isDelayed ? 'prod-row-delayed' : ''}>
                    <td>
                      <span className="prod-code">{batch.batchCode}</span>
                      <div className="prod-subtext">{batch.daysInCultivation} días en cultivo</div>
                    </td>

                    <td>
                      <div className="prod-species">{batch.species}</div>
                      {batch.linkedProduct ? (
                        <div className="prod-linked-pill">
                          Catálogo: <strong>{batch.linkedProduct.sku}</strong> ({batch.linkedProduct.name})
                        </div>
                      ) : (
                        <div className="prod-unlinked-pill">Especie nueva / Sin vincular aún</div>
                      )}
                    </td>

                    <td>
                      <div className="prod-qty-main">
                        <strong>{batch.currentQuantity}</strong>{' '}
                        <span className="prod-qty-total">/ {batch.initialQuantity} plantas</span>
                      </div>
                      <div className="prod-survival-sub">
                        Supervivencia: {survivalRate}%
                      </div>
                    </td>

                    <td>
                      <div className="prod-date-line">
                        <Calendar size={12} /> Inicio: <strong>{batch.startDate}</strong>
                      </div>
                      <div className="prod-date-line">
                        <Clock size={12} /> Est. Venta: <strong>{batch.estimatedReadyDate}</strong>
                      </div>
                      {batch.actualReadyDate && (
                        <div className="prod-date-ready">
                          ✓ Cosechado: {batch.actualReadyDate}
                        </div>
                      )}
                      {batch.isDelayed && (
                        <span className="prod-delay-badge">
                          <AlertTriangle size={12} /> Tiempo Excedido (+{batch.delayDays} días)
                        </span>
                      )}
                      {!batch.isDelayed && batch.isActive && (
                        <span className="prod-ontime-badge">
                          En cronograma ({batch.daysRemaining} días restantes)
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={`badge ${statusMeta.badgeClass}`}>
                        {statusMeta.label}
                      </span>
                      <div className="prod-stage-sub">{statusMeta.sub}</div>
                      {batch.status === 'EN_PRODUCCION' && (
                        <button
                          className="prod-stage-advance-btn"
                          onClick={() => handleQuickAdvanceStage(batch, 'EN_CRECIMIENTO')}
                          title="Avanzar a etapa En crecimiento"
                        >
                          Pasar a Crecimiento <ArrowRight size={11} />
                        </button>
                      )}
                    </td>

                    <td>
                      <div className="prod-cost-total">{formatCOP(batch.accumulatedCost)}</div>
                      <div className="prod-cost-unit">
                        Costo unit. est.: <strong>{formatCOP(batch.estimatedUnitCost)}</strong> / planta
                      </div>
                      <button
                        className="prod-inputs-pill"
                        onClick={() => openInputsModal(batch)}
                      >
                        <Layers size={11} /> {(batch.inputs || []).length} insumos registrados
                      </button>
                    </td>

                    <td>
                      <div className="prod-climate-box">
                        {batch.environmentalConditions ? (
                          <>
                            <CloudSun size={13} className="prod-climate-icon" />
                            <span>{batch.environmentalConditions}</span>
                          </>
                        ) : (
                          <span className="prod-climate-empty">Condiciones estándar de vivero</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="prod-actions-group">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => openInputsModal(batch)}
                          title="Registrar insumos y consultar costos acumulados (RF-41, RF-48)"
                        >
                          <FlaskConical size={13} /> Insumos
                        </button>

                        {batch.isActive && (
                          <>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => openEditBatchModal(batch)}
                              title="Actualizar estado, clima o fecha estimada (RF-43, RF-44)"
                            >
                              <Pencil size={13} /> Clima / Estado
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => openCloseModal(batch)}
                              title="Finalizar producción e incorporar plantas al inventario (RF-45, RF-46)"
                            >
                              <CheckCircle2 size={13} /> Declarar Disponible
                            </button>
                          </>
                        )}

                        {batch.status === 'DISPONIBLE' && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => navigate('/inventario')}
                            title="Ver en catálogo de inventario"
                          >
                            Ver en Inventario
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredBatches.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No se encontraron lotes de cultivo con los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="prod-footer">
          <span className="prod-footer-count">
            Mostrando {filteredBatches.length} de {enrichedBatches.length} lotes registrados
          </span>
          <span className="prod-footer-hint">
            <Info size={13} /> Al declarar un lote <strong>Disponible para venta</strong>, el sistema calcula el costo unitario real e incorpora las plantas al Kardex de inventario.
          </span>
        </div>
      </div>

      {/* ============================================================
          MODAL 1: NUEVO LOTE DE CULTIVO (RF-36 a RF-40, RF-43)
          ============================================================ */}
      {createModalOpen && (
        <div className="modal-overlay" onClick={() => setCreateModalOpen(false)}>
          <div className="modal-card prod-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Registrar Nuevo Lote de Cultivo</h3>
                <p className="modal-subtitle">
                  Inicia un proceso biológico de reproducción o crecimiento de plantas en el vivero.
                </p>
              </div>
              <button className="modal-close" onClick={() => setCreateModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="prod-form-grid">
                <div className="form-group prod-col-span-2">
                  <label className="form-label">Producto del Catálogo Asociado (Opcional)</label>
                  <select
                    className="input-field"
                    value={createForm.targetProductId}
                    onChange={e => handleSelectLinkedProductInCreate(e.target.value)}
                  >
                    <option value="">— Nueva especie (se creará o vinculará al finalizar la cosecha) —</option>
                    {viveroProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name} (Stock actual: {p.stock} uds | Costo base: {formatCOP(p.cost)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group prod-col-span-2">
                  <label className="form-label">Especie o Tipo de Planta en Producción *</label>
                  <input
                    type="text"
                    className={`input-field ${createErrors.species ? 'input-error' : ''}`}
                    placeholder="Ej. Orquídea Phalaenopsis Blanca, Bonsái Ficus, Suculenta Echeveria..."
                    value={createForm.species}
                    onChange={e => setCreateForm({ ...createForm, species: e.target.value })}
                  />
                  {createErrors.species && <span className="error-text">{createErrors.species}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Cantidad Inicial de Plantas / Esquejes *</label>
                  <input
                    type="number"
                    min="1"
                    className={`input-field ${createErrors.initialQuantity ? 'input-error' : ''}`}
                    value={createForm.initialQuantity}
                    onChange={e => setCreateForm({ ...createForm, initialQuantity: e.target.value })}
                  />
                  {createErrors.initialQuantity && <span className="error-text">{createErrors.initialQuantity}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Etapa Biológica Inicial *</label>
                  <select
                    className="input-field"
                    value={createForm.status}
                    onChange={e => setCreateForm({ ...createForm, status: e.target.value })}
                  >
                    <option value="EN_PRODUCCION">En producción (Germinación / Esqueje)</option>
                    <option value="EN_CRECIMIENTO">En crecimiento (Desarrollo / Engorde)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha de Inicio del Cultivo *</label>
                  <input
                    type="date"
                    className={`input-field ${createErrors.startDate ? 'input-error' : ''}`}
                    value={createForm.startDate}
                    onChange={e => setCreateForm({ ...createForm, startDate: e.target.value })}
                  />
                  {createErrors.startDate && <span className="error-text">{createErrors.startDate}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha Estimada de Disponibilidad *</label>
                  <input
                    type="date"
                    className={`input-field ${createErrors.estimatedReadyDate ? 'input-error' : ''}`}
                    value={createForm.estimatedReadyDate}
                    onChange={e => setCreateForm({ ...createForm, estimatedReadyDate: e.target.value })}
                  />
                  {createErrors.estimatedReadyDate && <span className="error-text">{createErrors.estimatedReadyDate}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Costo Base Inicial del Lote (COP)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="input-field"
                    placeholder="Ej. 85000"
                    value={createForm.initialCost}
                    onChange={e => setCreateForm({ ...createForm, initialCost: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Concepto del Costo Inicial</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Semillas / Esquejes y sustrato base inicial"
                    value={createForm.initialInputName}
                    onChange={e => setCreateForm({ ...createForm, initialInputName: e.target.value })}
                  />
                </div>

                <div className="form-group prod-col-span-2">
                  <label className="form-label">Condiciones Climáticas, Riego y Factores de Cultivo (RF-43)</label>
                  <textarea
                    rows={2}
                    className="input-field"
                    placeholder="Ej. Invernadero zona sombra 70%, riego cada 3 días, temperatura templada. Sensible a heladas..."
                    value={createForm.environmentalConditions}
                    onChange={e => setCreateForm({ ...createForm, environmentalConditions: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setCreateModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSaveNewBatch} disabled={savingCreate}>
                <Save size={15} /> {savingCreate ? 'Registrando...' : 'Iniciar Lote de Cultivo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: INSUMOS Y COSTOS ACUMULADOS DEL LOTE (RF-41, RF-42, RF-48)
          ============================================================ */}
      {activeInputsBatch && (
        <div className="modal-overlay" onClick={() => setInputsModalBatchId(null)}>
          <div className="modal-card prod-inputs-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  Insumos y Costos de Producción — {activeInputsBatch.batchCode}
                </h3>
                <p className="modal-subtitle">
                  {activeInputsBatch.species} • {activeInputsBatch.currentQuantity} plantas activas
                </p>
              </div>
              <button className="modal-close" onClick={() => setInputsModalBatchId(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Resumen financiero del lote (RF-47, RF-48) */}
              <div className="prod-cost-summary-banner">
                <div>
                  <span className="prod-banner-label">Costo Total Acumulado</span>
                  <div className="prod-banner-value">{formatCOP(activeInputsBatch.accumulatedCost)}</div>
                </div>
                <div>
                  <span className="prod-banner-label">Plantas en Lote</span>
                  <div className="prod-banner-value">{activeInputsBatch.currentQuantity} uds</div>
                </div>
                <div>
                  <span className="prod-banner-label">Costo Unitario Estimado (RF-47)</span>
                  <div className="prod-banner-value highlight">
                    {formatCOP(activeInputsBatch.estimatedUnitCost)} / planta
                  </div>
                </div>
              </div>

              {/* Formulario para agregar nuevo insumo si el lote sigue activo */}
              {activeInputsBatch.isActive && (
                <div className="prod-add-input-box">
                  <div className="prod-add-input-header">
                    <h4>+ Registrar Nuevo Insumo o Costo Aplicado (RF-41, RF-42)</h4>
                    <div className="prod-preset-chips">
                      {COMMON_INPUT_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="prod-preset-chip"
                          onClick={() => applyPresetInput(preset)}
                        >
                          + {preset.name.split(' ')[0]} {preset.name.split(' ')[1]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="prod-input-form-grid">
                    <div className="form-group prod-col-span-2">
                      <label className="form-label">Insumo / Material / Labor *</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ej. Sustrato orgánico abonado, Macetas 12cm, Fertilizante foliar..."
                        value={inputForm.inputName}
                        onChange={e => setInputForm({ ...inputForm, inputName: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Cantidad *</label>
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        className="input-field"
                        value={inputForm.quantity}
                        onChange={e => setInputForm({ ...inputForm, quantity: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unidad de Medida</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Unidad, Kg, Litro, Bulto..."
                        value={inputForm.unit}
                        onChange={e => setInputForm({ ...inputForm, unit: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Costo Unitario (COP) *</label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        className="input-field"
                        placeholder="Ej. 18000"
                        value={inputForm.unitCost}
                        onChange={e => setInputForm({ ...inputForm, unitCost: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Fecha de Aplicación</label>
                      <input
                        type="date"
                        className="input-field"
                        value={inputForm.applicationDate}
                        onChange={e => setInputForm({ ...inputForm, applicationDate: e.target.value })}
                      />
                    </div>

                    <div className="form-group prod-col-span-2">
                      <label className="form-label">Observaciones de la Aplicación</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ej. Aplicación preventiva por lluvias o refuerzo de enraizamiento"
                        value={inputForm.notes}
                        onChange={e => setInputForm({ ...inputForm, notes: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="prod-input-submit-bar">
                    <span className="prod-input-subtotal-preview">
                      Costo total del insumo a sumar:{' '}
                      <strong>
                        {formatCOP((Number(inputForm.quantity) || 0) * (Number(inputForm.unitCost) || 0))}
                      </strong>
                    </span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleAddInput}
                      disabled={savingInput}
                    >
                      <Plus size={14} /> {savingInput ? 'Guardando...' : 'Agregar Insumo al Lote'}
                    </button>
                  </div>
                </div>
              )}

              {/* Bitácora histórica de insumos del lote */}
              <div className="prod-inputs-history">
                <h4>Historial de Insumos y Costos Registrados ({(activeInputsBatch.inputs || []).length})</h4>
                {(activeInputsBatch.inputs || []).length > 0 ? (
                  <div className="prod-mini-table">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Insumo / Concepto</th>
                          <th>Cantidad</th>
                          <th>Costo Unit.</th>
                          <th>Costo Total</th>
                          <th>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeInputsBatch.inputs.map(inp => (
                          <tr key={inp.id}>
                            <td>{inp.applicationDate}</td>
                            <td style={{ fontWeight: 600 }}>{inp.inputName}</td>
                            <td>{inp.quantity} {inp.unit}</td>
                            <td>{formatCOP(inp.unitCost)}</td>
                            <td style={{ fontWeight: 700, color: 'var(--green-primary)' }}>
                              {formatCOP(inp.totalCost)}
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {inp.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="prod-empty-inputs">
                    Aún no se han detallado insumos individuales para este lote. Costo base acumulado:{' '}
                    <strong>{formatCOP(activeInputsBatch.accumulatedCost)}</strong>.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setInputsModalBatchId(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 3: ACTUALIZAR ESTADO, CLIMA Y TIEMPO DE CULTIVO (RF-43, RF-44, RF-50)
          ============================================================ */}
      {editBatchModal && (
        <div className="modal-overlay" onClick={() => setEditBatchModal(null)}>
          <div className="modal-card prod-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  Seguimiento Biológico y Climático — {editBatchModal.batchCode}
                </h3>
                <p className="modal-subtitle">
                  Actualiza la etapa del cultivo, mermas biológicas, fecha estimada o factores climáticos (RF-43, RF-44).
                </p>
              </div>
              <button className="modal-close" onClick={() => setEditBatchModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="prod-form-grid">
                <div className="form-group prod-col-span-2">
                  <label className="form-label">Especie o Tipo de Planta *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editBatchForm.species}
                    onChange={e => setEditBatchForm({ ...editBatchForm, species: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estado del Proceso (RF-44)</label>
                  <select
                    className="input-field"
                    value={editBatchForm.status}
                    onChange={e => setEditBatchForm({ ...editBatchForm, status: e.target.value })}
                  >
                    <option value="EN_PRODUCCION">En producción (Germinación / Esqueje)</option>
                    <option value="EN_CRECIMIENTO">En crecimiento (Desarrollo vegetativo)</option>
                    <option value="PERDIDA_TOTAL">Pérdida total (Baja por plaga / clima extremo)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Plantas Sobrevivientes Actuales (Inicial: {editBatchModal.initialQuantity})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={editBatchModal.initialQuantity * 2}
                    className="input-field"
                    value={editBatchForm.currentQuantity}
                    onChange={e => setEditBatchForm({ ...editBatchForm, currentQuantity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha Estimada de Disponibilidad (RF-40, RF-50)</label>
                  <input
                    type="date"
                    className="input-field"
                    value={editBatchForm.estimatedReadyDate}
                    onChange={e => setEditBatchForm({ ...editBatchForm, estimatedReadyDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Producto Vinculado en Catálogo</label>
                  <select
                    className="input-field"
                    value={editBatchForm.targetProductId}
                    onChange={e => setEditBatchForm({ ...editBatchForm, targetProductId: e.target.value })}
                  >
                    <option value="">— Sin vincular —</option>
                    {viveroProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group prod-col-span-2">
                  <label className="form-label">
                    Condiciones Climáticas o Factores que Afectan el Tiempo de Producción (RF-43)
                  </label>
                  <textarea
                    rows={3}
                    className="input-field"
                    placeholder="Registra lluvias intensas, baja radiación solar, heladas, ajustes de humedad o cualquier factor biológico que extienda o modifique el tiempo de cultivo..."
                    value={editBatchForm.environmentalConditions}
                    onChange={e => setEditBatchForm({ ...editBatchForm, environmentalConditions: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setEditBatchModal(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSaveBatchEdit} disabled={savingBatchEdit}>
                <Save size={15} /> {savingBatchEdit ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 4: DECLARAR DISPONIBLE E INCORPORAR AL INVENTARIO (RF-45, RF-46, RF-47)
          ============================================================ */}
      {closeModalBatch && closePreview && (
        <div className="modal-overlay" onClick={() => setCloseModalBatch(null)}>
          <div className="modal-card prod-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  Finalizar Producción e Incorporar al Inventario — {closeModalBatch.batchCode}
                </h3>
                <p className="modal-subtitle">
                  Declara las plantas disponibles para la venta, calcula el costo unitario real y suma las unidades al catálogo activo (RF-45, RF-46, RF-47).
                </p>
              </div>
              <button className="modal-close" onClick={() => setCloseModalBatch(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="prod-cost-summary-banner">
                <div>
                  <span className="prod-banner-label">Costo Acumulado del Lote</span>
                  <div className="prod-banner-value">{formatCOP(closePreview.totalCost)}</div>
                </div>
                <div>
                  <span className="prod-banner-label">Plantas Finales Logradas</span>
                  <div className="prod-banner-value">{closePreview.finalQty} plantas</div>
                </div>
                <div>
                  <span className="prod-banner-label">Costo Unitario Real de Producción</span>
                  <div className="prod-banner-value highlight">{formatCOP(closePreview.unitCost)} / ud</div>
                </div>
              </div>

              <div className="prod-form-grid">
                <div className="form-group">
                  <label className="form-label">Cantidad Final de Plantas Disponibles *</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={closeForm.finalQuantity}
                    onChange={e => setCloseForm({ ...closeForm, finalQuantity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Destino en el Catálogo de Inventario *</label>
                  <select
                    className="input-field"
                    value={closeForm.targetMode}
                    onChange={e => setCloseForm({ ...closeForm, targetMode: e.target.value })}
                  >
                    <option value="existing">Sumar a un producto existente del Vivero</option>
                    <option value="new">Crear nuevo producto en el catálogo ({closePreview.nextSku})</option>
                  </select>
                </div>

                {closeForm.targetMode === 'existing' ? (
                  <div className="form-group prod-col-span-2">
                    <label className="form-label">Seleccionar Producto del Vivero *</label>
                    <select
                      className="input-field"
                      value={closeForm.targetProductId}
                      onChange={e => {
                        const prod = productsById.get(e.target.value);
                        setCloseForm({
                          ...closeForm,
                          targetProductId: e.target.value,
                          salePrice: prod ? prod.price : closeForm.salePrice
                        });
                      }}
                    >
                      <option value="">— Selecciona un producto —</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name} (Stock actual: {p.stock} uds | Costo actual: {formatCOP(p.cost)})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="form-group prod-col-span-2">
                      <label className="form-label">
                        Nombre Comercial del Nuevo Producto (SKU asignado: {closePreview.nextSku}) *
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={closeForm.newProductName}
                        onChange={e => setCloseForm({ ...closeForm, newProductName: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Ubicación en Vivero</label>
                      <input
                        type="text"
                        className="input-field"
                        value={closeForm.newProductLocation}
                        onChange={e => setCloseForm({ ...closeForm, newProductLocation: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Stock Mínimo de Alerta</label>
                      <input
                        type="number"
                        min="1"
                        className="input-field"
                        value={closeForm.newProductMinStock}
                        onChange={e => setCloseForm({ ...closeForm, newProductMinStock: e.target.value })}
                      />
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label className="form-label">Precio de Venta al Público (COP) *</label>
                  <input
                    type="number"
                    min="100"
                    step="500"
                    className="input-field"
                    value={closeForm.salePrice}
                    onChange={e => setCloseForm({ ...closeForm, salePrice: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Rentabilidad Estimada con este Precio</label>
                  <div className="prod-margin-preview">
                    Ganancia: <strong>{formatCOP(closePreview.profit)}</strong> ({closePreview.margin}%)
                  </div>
                </div>
              </div>

              {/* Resumen del impacto en Inventario y Kardex */}
              <div className="prod-close-impact-box">
                <strong>Impacto automático al confirmar:</strong>
                <ul>
                  <li>
                    El lote <strong>{closeModalBatch.batchCode}</strong> pasará a estado{' '}
                    <strong>Disponible para venta</strong> con fecha de cierre <strong>{todayStr}</strong>.
                  </li>
                  <li>
                    Stock en inventario:{' '}
                    <strong>
                      {closePreview.prevStock} uds → {closePreview.resultingStock} uds (+{closePreview.finalQty})
                    </strong>
                    .
                  </li>
                  <li>
                    Nuevo costo promedio ponderado del producto:{' '}
                    <strong>{formatCOP(closePreview.newWeightedCost)}</strong>.
                  </li>
                  <li>
                    Se registrará el movimiento <code>ENTRADA_PRODUCCION</code> en el Kardex de Inventario.
                  </li>
                </ul>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setCloseModalBatch(null)}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmCloseBatch}
                disabled={savingClose}
              >
                <CheckCircle2 size={15} />{' '}
                {savingClose ? 'Incorporando a Inventario...' : 'Confirmar e Incorporar al Inventario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
