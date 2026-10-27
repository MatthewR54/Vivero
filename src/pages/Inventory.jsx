import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP } from '../utils/currency';
import { exportToCSV } from '../utils/exportCSV';
import {
  getStockStatus,
  getStockLabel,
  calculateMargin,
  isDateInPeriod,
  formatShortDateTime
} from '../utils/calculations';
import {
  Plus,
  ShoppingCart,
  Search,
  Pencil,
  X,
  Save,
  Info,
  SlidersHorizontal,
  History,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import './Inventory.css';

const CATEGORY_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'vivero', label: 'Producción Vivero' },
  { key: 'merchandising', label: 'Merchandising' },
  { key: 'comestibles', label: 'Adquirido / Dist.' },
  { key: 'alert', label: '⚠ Con Alerta Stock' },
  { key: 'inactive', label: 'Inactivos' }
];

const ORIGIN_OPTIONS = [
  'Producción Vivero',
  'Merchandising Social',
  'Adquirido (Distribuidora)',
  'Adquirido'
];

const ENTRY_REASONS = [
  'Conteo físico (Sobrante)',
  'Reproducción / Esqueje interno',
  'Donación recibida',
  'Devolución de cliente',
  'Otro motivo de entrada'
];

const EXIT_REASONS = [
  'Planta marchita / dañada (Merma)',
  'Conteo físico (Faltante)',
  'Donación social entregada',
  'Autoconsumo vivero / Trasplante',
  'Otro motivo de salida'
];

const KARDEX_PERIODS = [
  { key: 'all', label: 'Todo el Historial' },
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: 'Últimos 7 días' },
  { key: 'month', label: 'Este Mes' }
];

const MOVEMENT_TYPE_META = {
  INICIAL: { label: 'Stock Inicial', badgeClass: 'kardex-badge-info' },
  ENTRADA_COMPRA: { label: 'Entrada Compra', badgeClass: 'kardex-badge-entry' },
  ENTRADA_PRODUCCION: { label: 'Producción Vivero', badgeClass: 'kardex-badge-entry' },
  AJUSTE_MANUAL_ENTRADA: { label: 'Ajuste Entrada (+)', badgeClass: 'kardex-badge-entry' },
  SALIDA_VENTA: { label: 'Salida por Venta', badgeClass: 'kardex-badge-exit' },
  AJUSTE_MANUAL_SALIDA: { label: 'Ajuste Salida / Merma (-)', badgeClass: 'kardex-badge-warning' }
};

export default function Inventory() {
  const { products, suppliers, inventoryMovements, updateProduct, adjustStock, showToast } = useAppData();
  const navigate = useNavigate();

  const supplierById = useMemo(() => {
    const map = {};
    for (const s of suppliers || []) {
      map[Number(s.id)] = s;
    }
    return map;
  }, [suppliers]);

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');

  // Edit product modal state (RF-02, RF-07, RF-08)
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Manual stock adjustment modal state (RF-26, RF-27)
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustForm, setAdjustForm] = useState({
    direction: 'exit',
    quantity: 1,
    reasonCategory: EXIT_REASONS[0],
    notes: ''
  });
  const [savingAdjust, setSavingAdjust] = useState(false);

  // Kardex / Movement history modal state (RF-09, RF-28, RF-29, RF-30)
  const [kardexModalOpen, setKardexModalOpen] = useState(false);
  const [kardexProductFilter, setKardexProductFilter] = useState('all');
  const [kardexPeriodFilter, setKardexPeriodFilter] = useState('all');
  const [kardexDirectionFilter, setKardexDirectionFilter] = useState('all');

  const alertCount = useMemo(() => {
    return products.filter(p => {
      if (!p.active) return false;
      const status = getStockStatus(p.stock, p.minStock);
      return status !== 'optimo';
    }).length;
  }, [products]);

  const inactiveCount = useMemo(() => {
    return products.filter(p => !p.active).length;
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !search ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (catFilter === 'all') return true;
      if (catFilter === 'inactive') return !p.active;
      if (catFilter === 'alert') {
        const status = getStockStatus(p.stock, p.minStock);
        return p.active && status !== 'optimo';
      }
      return p.category === catFilter;
    });
  }, [products, search, catFilter]);

  // Product lookup map for Kardex rows
  const productById = useMemo(() => {
    const map = {};
    for (const p of products) {
      map[p.id] = p;
    }
    return map;
  }, [products]);

  // Filtered Kardex movements (RF-28, RF-29, RF-30)
  const filteredMovements = useMemo(() => {
    return (inventoryMovements || []).filter(m => {
      if (kardexProductFilter !== 'all' && m.productId !== kardexProductFilter) {
        return false;
      }
      if (!isDateInPeriod(m.createdAt || m.date, kardexPeriodFilter)) {
        return false;
      }
      if (kardexDirectionFilter === 'entries' && m.quantity < 0) {
        return false;
      }
      if (kardexDirectionFilter === 'exits' && m.quantity > 0) {
        return false;
      }
      return true;
    });
  }, [inventoryMovements, kardexProductFilter, kardexPeriodFilter, kardexDirectionFilter]);

  const kardexTotals = useMemo(() => {
    let entries = 0;
    let exits = 0;
    for (const m of filteredMovements) {
      if (m.quantity > 0) entries += m.quantity;
      else exits += Math.abs(m.quantity);
    }
    return { entries, exits, count: filteredMovements.length };
  }, [filteredMovements]);

  // Open Edit Modal (RF-02, RF-07, RF-08)
  const openEditModal = (product) => {
    setEditForm({
      name: product.name || '',
      origin: product.origin || ORIGIN_OPTIONS[0],
      stock: product.stock ?? 0,
      minStock: product.minStock ?? 0,
      cost: product.cost ?? 0,
      price: product.price ?? 0,
      active: product.active !== false,
      unit: product.unit || 'Unidad',
      location: product.location || '',
      description: product.description || '',
      supplierId: product.supplierId ? String(product.supplierId) : ''
    });
    setEditModal(product);
  };

  const handleSaveEdit = async () => {
    if (!editModal || savingEdit) return;
    if (!editForm.name.trim()) {
      showToast('El nombre del producto es obligatorio', 'error');
      return;
    }
    setSavingEdit(true);
    try {
      await updateProduct(editModal.id, {
        name: editForm.name.trim(),
        origin: editForm.origin,
        minStock: parseInt(editForm.minStock, 10) || 0,
        cost: parseInt(editForm.cost, 10) || 0,
        price: parseInt(editForm.price, 10) || 0,
        active: Boolean(editForm.active),
        unit: editForm.unit.trim() || 'Unidad',
        location: editForm.location.trim(),
        description: editForm.description.trim(),
        supplierId: editForm.supplierId ? Number(editForm.supplierId) : null
      });
      showToast('Producto actualizado correctamente', 'success');
      setEditModal(null);
    } catch (err) {
      showToast(`No se pudo actualizar el producto: ${err.message}`, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Open Stock Adjustment Modal (RF-26, RF-27)
  const openAdjustModal = (product, initialDirection = 'exit') => {
    setAdjustForm({
      direction: initialDirection,
      quantity: 1,
      reasonCategory: initialDirection === 'entry' ? ENTRY_REASONS[0] : EXIT_REASONS[0],
      notes: ''
    });
    setAdjustModal(product);
  };

  const handleAdjustDirectionChange = (newDirection) => {
    setAdjustForm(prev => ({
      ...prev,
      direction: newDirection,
      reasonCategory: newDirection === 'entry' ? ENTRY_REASONS[0] : EXIT_REASONS[0]
    }));
  };

  const adjustPreview = useMemo(() => {
    if (!adjustModal) return { current: 0, delta: 0, resulting: 0, valid: false };
    const current = Number(adjustModal.stock) || 0;
    const rawQty = parseInt(adjustForm.quantity, 10);
    const validQty = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 0;
    const delta = adjustForm.direction === 'entry' ? validQty : -validQty;
    const resulting = current + delta;
    const valid = validQty > 0 && resulting >= 0 && Boolean(adjustForm.reasonCategory);
    return { current, delta, resulting, valid, validQty };
  }, [adjustModal, adjustForm]);

  const handleSaveAdjustment = async () => {
    if (!adjustModal || savingAdjust || !adjustPreview.valid) return;
    setSavingAdjust(true);
    try {
      await adjustStock({
        productId: adjustModal.id,
        direction: adjustForm.direction,
        quantity: adjustPreview.validQty,
        reasonCategory: adjustForm.reasonCategory,
        notes: adjustForm.notes
      });
      showToast(
        `Ajuste aplicado: ${adjustModal.name} (${adjustPreview.current} → ${adjustPreview.resulting} uds)`,
        'success'
      );
      setAdjustModal(null);
    } catch (err) {
      showToast(`No se pudo registrar el ajuste: ${err.message}`, 'error');
    } finally {
      setSavingAdjust(false);
    }
  };

  // Open Kardex modal (RF-09, RF-28, RF-29, RF-30)
  const openKardexModal = (productId = 'all') => {
    setKardexProductFilter(productId);
    setKardexModalOpen(true);
  };

  // Export inventory catalog to CSV (RF-126)
  const handleExportInventoryCSV = () => {
    const rows = filtered.map(p => ({
      SKU: p.sku,
      Producto: p.name,
      Categoria: p.category,
      Origen: p.origin,
      Stock_Actual: p.stock,
      Stock_Minimo: p.minStock,
      Estado_Stock: getStockLabel(getStockStatus(p.stock, p.minStock)),
      Unidad: p.unit || 'Unidad',
      Ubicacion: p.location || 'Sin asignar',
      Costo_COP: p.cost,
      Precio_Venta_COP: p.price,
      Estado_Catalogo: p.active ? 'Activo' : 'Inactivo'
    }));
    exportToCSV(rows, `inventario_vivero_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Catálogo de inventario exportado a CSV', 'info');
  };

  // Export Kardex movements to CSV
  const handleExportKardexCSV = () => {
    const rows = filteredMovements.map(m => {
      const prod = productById[m.productId];
      const meta = MOVEMENT_TYPE_META[m.movementType] || { label: m.movementType };
      return {
        Fecha: formatShortDateTime(m.createdAt || m.date),
        SKU: prod?.sku || m.productId,
        Producto: prod?.name || 'Producto',
        Tipo_Movimiento: meta.label,
        Variacion: m.quantity > 0 ? `+${m.quantity}` : `${m.quantity}`,
        Stock_Anterior: m.previousStock,
        Stock_Resultante: m.resultingStock,
        Referencia: m.referenceId || '—',
        Motivo: m.reason || '—'
      };
    });
    exportToCSV(rows, `kardex_movimientos_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Historial Kardex exportado a CSV', 'info');
  };

  const editMargin = editForm.price && editForm.cost
    ? calculateMargin(parseInt(editForm.price, 10), parseInt(editForm.cost, 10))
    : { profit: 0, margin: 0 };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Gestión y Control de Inventario</h1>
          <p>Edición de catálogo, ajustes manuales de existencias y trazabilidad Kardex</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-outline" onClick={handleExportInventoryCSV}>
            <Download size={16} /> Exportar CSV
          </button>
          <button className="btn btn-outline" onClick={() => openKardexModal('all')}>
            <History size={16} /> Ver Kardex ({inventoryMovements?.length || 0})
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/compras/nueva')}>
            <ShoppingCart size={16} /> Registrar Compra
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/inventario/nuevo')}>
            <Plus size={16} /> Registrar Producto
          </button>
        </div>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="inv-filters">
          <div className="inv-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="input-field"
              placeholder="Buscar por nombre, código SKU o ubicación..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Buscar productos"
            />
          </div>
          <div className="chip-group">
            {CATEGORY_FILTERS.map(c => (
              <button
                key={c.key}
                className={`chip ${catFilter === c.key ? 'active' : ''}`}
                onClick={() => setCatFilter(c.key)}
              >
                {c.label}
                {c.key === 'all' ? ` (${products.length})` : ''}
                {c.key === 'alert' ? ` (${alertCount})` : ''}
                {c.key === 'inactive' ? ` (${inactiveCount})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          {filtered.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Tipo / Ubicación</th>
                  <th>Stock</th>
                  <th>Mínimo</th>
                  <th>Costo Prom.</th>
                  <th>Precio Venta</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const status = getStockStatus(p.stock, p.minStock);
                  const isCritical = status === 'critico' && p.active;
                  return (
                    <tr
                      key={p.id}
                      className={`${isCritical ? 'row-critical' : ''} ${!p.active ? 'row-inactive' : ''}`}
                    >
                      <td><span className="inv-sku">{p.sku}</span></td>
                      <td>
                        <div className="inv-product-cell">
                          <span className="inv-product-name">{p.name}</span>
                          {!p.active && (
                            <span className="inv-inactive-badge" title="Oculto en Punto de Venta">
                              <EyeOff size={11} /> Inactivo
                            </span>
                          )}
                        </div>
                        {p.unit && <div className="inv-subtext">{p.unit}</div>}
                      </td>
                      <td>
                        <div className="td-muted">{p.origin}</div>
                        {p.location && <div className="inv-subtext">📍 {p.location}</div>}
                        {p.supplierId && supplierById[Number(p.supplierId)] && (
                          <div className="inv-subtext">🚚 {supplierById[Number(p.supplierId)].name}</div>
                        )}
                      </td>
                      <td>
                        <span className={`inv-stock inv-stock-${status}`}>
                          {p.stock} uds
                        </span>
                      </td>
                      <td className="td-muted">{p.minStock} uds</td>
                      <td>{formatCOP(p.cost)}</td>
                      <td className="inv-price">{formatCOP(p.price)}</td>
                      <td>
                        <span className={`status-indicator status-${status}`}>
                          <span className="status-dot"></span>
                          {getStockLabel(status)}
                        </span>
                      </td>
                      <td>
                        <div className="inv-actions-group">
                          <button
                            className="btn btn-sm btn-cyan"
                            onClick={() => openEditModal(p)}
                            title="Editar ficha técnica, precios y visibilidad"
                          >
                            <Pencil size={12} /> Editar
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => openAdjustModal(p, 'exit')}
                            title="Registrar ajuste manual de entrada o salida/merma"
                          >
                            <SlidersHorizontal size={12} /> Ajustar
                          </button>
                          <button
                            className="btn btn-sm btn-ghost"
                            onClick={() => openKardexModal(p.id)}
                            title="Ver historial de movimientos (Kardex) de este producto"
                          >
                            <History size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>No se encontraron resultados para la búsqueda.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="inv-footer">
          <span className="inv-footer-count">
            Mostrando {filtered.length} de {products.length} productos en catálogo
          </span>
          <span className="inv-footer-hint">
            <Info size={13} /> Use "Editar" para parámetros del producto, "Ajustar" para mermas/conteos físicos y el ícono de reloj para ver su Kardex.
          </span>
        </div>
      </div>

      {/* ===== MODAL 1: EDIT PRODUCT PARAMETERS (RF-02, RF-07, RF-08) ===== */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)} role="dialog" aria-modal="true">
          <div className="modal-content edit-product-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h3><Pencil size={16} style={{ marginRight: 8, display: 'inline' }} />Modificar Parámetros de Producto</h3>
                <p>Editando SKU: {editModal.sku} • {editModal.name}</p>
              </div>
              <button className="modal-close" onClick={() => setEditModal(null)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {/* Row 1: Identification */}
              <div className="edit-form-row">
                <div className="input-group">
                  <label>Código / SKU</label>
                  <input type="text" className="input-field" value={editModal.sku + ' (Protegido)'} disabled />
                </div>
                <div className="input-group">
                  <label>Nombre del Producto *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Tipo / Línea</label>
                  <select
                    className="input-field"
                    value={editForm.origin}
                    onChange={e => setEditForm({ ...editForm, origin: e.target.value })}
                  >
                    {[...new Set([...ORIGIN_OPTIONS, editForm.origin].filter(Boolean))].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Stock & Visibility (RF-08) */}
              <div className="edit-stock-section">
                <div className="edit-form-row">
                  <div className="input-group">
                    <label>Stock Actual Físico</label>
                    <div className="edit-stock-inline">
                      <input type="text" className="input-field" value={`${editModal.stock} Unidades`} disabled />
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          const target = editModal;
                          setEditModal(null);
                          openAdjustModal(target, 'exit');
                        }}
                      >
                        <SlidersHorizontal size={12} /> Ajustar
                      </button>
                    </div>
                    <div className={`input-hint ${getStockStatus(editModal.stock, editForm.minStock) === 'critico' ? 'text-danger' : ''}`}>
                      Las existencias se modifican mediante Ajuste Manual o Ventas
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Stock Mínimo Configurable</label>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={editForm.minStock}
                      onChange={e => setEditForm({ ...editForm, minStock: e.target.value })}
                    />
                    <div className="input-hint">Dispara alertas en Dashboard</div>
                  </div>
                  <div className="input-group">
                    <label>Estado de Visibilidad en POS (RF-08)</label>
                    <button
                      type="button"
                      className={`edit-visibility-toggle ${editForm.active ? 'active' : 'inactive'}`}
                      onClick={() => setEditForm({ ...editForm, active: !editForm.active })}
                    >
                      {editForm.active ? (
                        <>
                          <Eye size={15} /> Activo en Ventas (Visible)
                        </>
                      ) : (
                        <>
                          <EyeOff size={15} /> Inactivo (Oculto en POS)
                        </>
                      )}
                    </button>
                    <div className="input-hint">
                      {editForm.active
                        ? 'Disponible para facturación en Punto de Venta'
                        : 'Oculto en POS pero conservado en historial'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Unit, Location & Supplier (RF-02, RF-07, RF-13) */}
              <div className="edit-form-row">
                <div className="input-group">
                  <label>Unidad de Medida / Presentación</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej. Unidad / Maceta P12 / Paquete 1 Kg"
                    value={editForm.unit}
                    onChange={e => setEditForm({ ...editForm, unit: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Ubicación en Vivero / Bodega</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej. Invernadero 1 • Mesa B2 / Estante Central"
                    value={editForm.location}
                    onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Proveedor Asociado (RF-13)</label>
                  <select
                    className="input-field"
                    value={editForm.supplierId || ''}
                    onChange={e => setEditForm({ ...editForm, supplierId: e.target.value })}
                  >
                    <option value="">— Sin proveedor externo —</option>
                    {(suppliers || []).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Costs & Margin */}
              <div className="edit-form-row">
                <div className="input-group">
                  <label>Costo de Insumos / Producción</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={editForm.cost}
                    onChange={e => setEditForm({ ...editForm, cost: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Precio de Venta al Público *</label>
                  <input
                    type="number"
                    min="0"
                    className="input-field edit-price-input"
                    value={editForm.price}
                    onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Margen Estimado por Unidad</label>
                  <div className="edit-margin-box">
                    +{editMargin.margin}% ({formatCOP(editMargin.profit)} de ganancia)
                  </div>
                </div>
              </div>

              {/* Row 5: Description / Care instructions */}
              <div className="input-group">
                <label>Descripción / Especificaciones y Cuidados</label>
                <textarea
                  className="input-field"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  placeholder="Detalles botánicos, recomendaciones de riego/luz o características del artículo..."
                ></textarea>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setEditModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={savingEdit}>
                <Save size={14} /> {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL 2: MANUAL STOCK ADJUSTMENT (RF-26, RF-27) ===== */}
      {adjustModal && (
        <div className="modal-overlay" onClick={() => setAdjustModal(null)} role="dialog" aria-modal="true">
          <div className="modal-content adjust-stock-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h3>
                  <SlidersHorizontal size={16} style={{ marginRight: 8, display: 'inline' }} />
                  Ajuste Manual de Inventario
                </h3>
                <p>{adjustModal.sku} • {adjustModal.name}</p>
              </div>
              <button className="modal-close" onClick={() => setAdjustModal(null)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Direction Selector */}
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label>Tipo de Ajuste *</label>
                <div className="adjust-direction-tabs">
                  <button
                    type="button"
                    className={`adjust-dir-btn entry ${adjustForm.direction === 'entry' ? 'active' : ''}`}
                    onClick={() => handleAdjustDirectionChange('entry')}
                  >
                    <ArrowUpCircle size={18} />
                    <div>
                      <div className="adjust-dir-title">Entrada Manual (+)</div>
                      <div className="adjust-dir-desc">Conteo sobrante, esquejes, donación recibida</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`adjust-dir-btn exit ${adjustForm.direction === 'exit' ? 'active' : ''}`}
                    onClick={() => handleAdjustDirectionChange('exit')}
                  >
                    <ArrowDownCircle size={18} />
                    <div>
                      <div className="adjust-dir-title">Salida / Merma (-)</div>
                      <div className="adjust-dir-desc">Planta marchita/dañada, pérdida, autoconsumo</div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="edit-form-row edit-form-row-2">
                <div className="input-group">
                  <label>Cantidad de Unidades a Ajustar *</label>
                  <input
                    type="number"
                    min="1"
                    max={adjustForm.direction === 'exit' ? Math.max(1, adjustModal.stock) : undefined}
                    className="input-field"
                    value={adjustForm.quantity}
                    onChange={e => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  />
                  {adjustForm.direction === 'exit' && adjustPreview.resulting < 0 && (
                    <div className="input-error">
                      La salida no puede superar el stock actual ({adjustModal.stock} uds).
                    </div>
                  )}
                </div>

                <div className="input-group">
                  <label>Motivo Principal (RF-27) *</label>
                  <select
                    className="input-field"
                    value={adjustForm.reasonCategory}
                    onChange={e => setAdjustForm({ ...adjustForm, reasonCategory: e.target.value })}
                  >
                    {(adjustForm.direction === 'entry' ? ENTRY_REASONS : EXIT_REASONS).map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: 16 }}>
                <label>Observación / Detalle Adicional</label>
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Ej. Revisión semanal de invernadero, lote afectado por exceso de humedad..."
                  value={adjustForm.notes}
                  onChange={e => setAdjustForm({ ...adjustForm, notes: e.target.value })}
                ></textarea>
              </div>

              {/* Live Resulting Stock Preview */}
              <div className={`adjust-preview-box ${adjustPreview.resulting < 0 ? 'invalid' : ''}`}>
                <div className="adjust-preview-item">
                  <span className="adjust-preview-label">Stock Actual</span>
                  <span className="adjust-preview-val">{adjustPreview.current} uds</span>
                </div>
                <div className="adjust-preview-arrow">→</div>
                <div className="adjust-preview-item">
                  <span className="adjust-preview-label">Variación</span>
                  <span className={`adjust-preview-val ${adjustPreview.delta >= 0 ? 'text-success' : 'text-danger'}`}>
                    {adjustPreview.delta >= 0 ? `+${adjustPreview.delta}` : adjustPreview.delta} uds
                  </span>
                </div>
                <div className="adjust-preview-arrow">→</div>
                <div className="adjust-preview-item">
                  <span className="adjust-preview-label">Stock Resultante</span>
                  <span className="adjust-preview-val resulting">
                    {adjustPreview.resulting} uds
                  </span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAdjustModal(null)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={handleSaveAdjustment}
                disabled={savingAdjust || !adjustPreview.valid}
              >
                <Save size={14} /> {savingAdjust ? 'Registrando...' : 'Confirmar Ajuste en Kardex'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL 3: KARDEX / INVENTORY MOVEMENTS HISTORY (RF-09, RF-28, RF-29, RF-30) ===== */}
      {kardexModalOpen && (
        <div className="modal-overlay" onClick={() => setKardexModalOpen(false)} role="dialog" aria-modal="true">
          <div className="modal-content kardex-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h3>
                  <History size={16} style={{ marginRight: 8, display: 'inline' }} />
                  Historial de Movimientos de Inventario (Kardex)
                </h3>
                <p>Trazabilidad de entradas, ventas, producción y ajustes manuales</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn btn-sm btn-outline" onClick={handleExportKardexCSV}>
                  <Download size={13} /> Exportar Kardex CSV
                </button>
                <button className="modal-close" onClick={() => setKardexModalOpen(false)} aria-label="Cerrar modal">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {/* Filters Bar (RF-29 product filter + RF-30 date period filter) */}
              <div className="kardex-filters-bar">
                <div className="input-group kardex-filter-select">
                  <label>Filtrar por Producto (RF-29)</label>
                  <select
                    className="input-field"
                    value={kardexProductFilter}
                    onChange={e => setKardexProductFilter(e.target.value)}
                  >
                    <option value="all">Todos los productos ({products.length})</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name} (Stock: {p.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group kardex-filter-select">
                  <label>Sentido del Movimiento</label>
                  <select
                    className="input-field"
                    value={kardexDirectionFilter}
                    onChange={e => setKardexDirectionFilter(e.target.value)}
                  >
                    <option value="all">Entradas y Salidas</option>
                    <option value="entries">Solo Entradas (+)</option>
                    <option value="exits">Solo Salidas / Mermas (-)</option>
                  </select>
                </div>

                <div className="input-group">
                  <label>Periodo de Consulta (RF-30)</label>
                  <div className="chip-group">
                    {KARDEX_PERIODS.map(p => (
                      <button
                        key={p.key}
                        type="button"
                        className={`chip ${kardexPeriodFilter === p.key ? 'active' : ''}`}
                        onClick={() => setKardexPeriodFilter(p.key)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary KPIs */}
              <div className="kardex-summary-bar">
                <div className="kardex-summary-pill">
                  <span>Movimientos listados:</span>
                  <strong>{kardexTotals.count}</strong>
                </div>
                <div className="kardex-summary-pill entry">
                  <span>Total Unidades Ingresadas:</span>
                  <strong>+{kardexTotals.entries} uds</strong>
                </div>
                <div className="kardex-summary-pill exit">
                  <span>Total Unidades Egresadas:</span>
                  <strong>-{kardexTotals.exits} uds</strong>
                </div>
              </div>

              {/* Movements Table */}
              <div className="table-wrapper kardex-table-wrapper">
                {filteredMovements.length > 0 ? (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Fecha / Hora</th>
                        <th>Producto</th>
                        <th>Tipo de Movimiento</th>
                        <th>Variación</th>
                        <th>Saldo Stock</th>
                        <th>Referencia</th>
                        <th>Motivo / Observación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.map(m => {
                        const prod = productById[m.productId];
                        const meta = MOVEMENT_TYPE_META[m.movementType] || {
                          label: m.movementType,
                          badgeClass: 'kardex-badge-info'
                        };
                        const isPositive = m.quantity > 0;
                        return (
                          <tr key={m.id}>
                            <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>
                              {formatShortDateTime(m.createdAt || m.date)}
                            </td>
                            <td>
                              <div className="inv-product-name">
                                {prod ? prod.name : `ID #${m.productId}`}
                              </div>
                              {prod && <div className="inv-subtext">{prod.sku}</div>}
                            </td>
                            <td>
                              <span className={`kardex-badge ${meta.badgeClass}`}>
                                {meta.label}
                              </span>
                            </td>
                            <td>
                              <span className={`kardex-qty ${isPositive ? 'positive' : 'negative'}`}>
                                {isPositive ? `+${m.quantity}` : m.quantity} uds
                              </span>
                            </td>
                            <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>
                              {m.previousStock} → <strong>{m.resultingStock} uds</strong>
                            </td>
                            <td>
                              <span className="inv-sku">{m.referenceId || '—'}</span>
                            </td>
                            <td className="kardex-reason-cell">{m.reason || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">
                    <p>No se encontraron movimientos de inventario para los filtros seleccionados.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setKardexModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
