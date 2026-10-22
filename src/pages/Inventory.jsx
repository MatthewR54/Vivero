import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP } from '../utils/currency';
import { getStockStatus, getStockLabel, calculateMargin } from '../utils/calculations';
import { Plus, ShoppingCart, Search, Pencil, X, Save, Info } from 'lucide-react';
import './Inventory.css';

const CATEGORY_FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'vivero', label: 'Producción Vivero' },
  { key: 'merchandising', label: 'Merchandising' },
  { key: 'alert', label: '⚠ Con Alerta Stock' }
];

const ORIGIN_OPTIONS = [
  'Producción Vivero',
  'Merchandising Social',
  'Adquirido (Distribuidora)',
  'Adquirido'
];

export default function Inventory() {
  const { products, updateProduct, showToast } = useAppData();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const alertCount = products.filter(p => {
    const status = getStockStatus(p.stock, p.minStock);
    return status !== 'optimo';
  }).length;

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());

      if (catFilter === 'all') return matchSearch;
      if (catFilter === 'alert') {
        const status = getStockStatus(p.stock, p.minStock);
        return matchSearch && status !== 'optimo';
      }
      return matchSearch && p.category === catFilter;
    });
  }, [products, search, catFilter]);

  const openEditModal = (product) => {
    setEditForm({
      name: product.name,
      origin: product.origin,
      stock: product.stock,
      minStock: product.minStock,
      cost: product.cost,
      price: product.price,
      active: product.active,
      observation: 'Actualización de stock mínimo a ' + product.minStock + ' unidades por aumento de demanda comunitaria en eventos.'
    });
    setEditModal(product);
  };

  const handleSaveEdit = async () => {
    if (!editModal || savingEdit) return;
    setSavingEdit(true);
    try {
      await updateProduct(editModal.id, {
        name: editForm.name,
        origin: editForm.origin,
        minStock: parseInt(editForm.minStock) || 0,
        cost: parseInt(editForm.cost) || 0,
        price: parseInt(editForm.price) || 0,
        active: editForm.active
      });
      showToast('Producto actualizado correctamente', 'success');
      setEditModal(null);
    } catch (err) {
      showToast(`No se pudo actualizar el producto: ${err.message}`, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const editMargin = editForm.price && editForm.cost
    ? calculateMargin(parseInt(editForm.price), parseInt(editForm.cost))
    : { profit: 0, margin: 0 };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Gestión y Control de Inventario</h1>
          <p>Edición en línea de existencias, precios de venta, costos y stock mínimo</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={() => navigate('/inventario/nuevo')}>
            <Plus size={16} /> Registrar Producto
          </button>
          <button className="btn btn-outline">
            <ShoppingCart size={16} /> Registrar Compra
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
              placeholder="Buscar por nombre o código SKU..."
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
                {c.label}{c.key === 'all' ? ` (${products.length})` : ''}{c.key === 'alert' ? ` (${alertCount})` : ''}
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
                  <th>Tipo / Origen</th>
                  <th>Stock</th>
                  <th>Mínimo</th>
                  <th>Costo Prom.</th>
                  <th>Precio Venta</th>
                  <th>Estado</th>
                  <th>Acción Directa</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const status = getStockStatus(p.stock, p.minStock);
                  const isCritical = status === 'critico';
                  return (
                    <tr key={p.id} className={isCritical ? 'row-critical' : ''}>
                      <td><span className="inv-sku">{p.sku}</span></td>
                      <td className="inv-product-name">{p.name}</td>
                      <td className="td-muted">{p.origin}</td>
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
                        <button className="btn btn-sm btn-cyan" onClick={() => openEditModal(p)}>
                          <Pencil size={12} /> Modificar
                        </button>
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
            <Info size={13} /> Haga clic en "Modificar" en cualquier fila para editar parámetros y existencias.
          </span>
        </div>
      </div>

      {/* Edit Modal */}
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
              {/* Row 1 */}
              <div className="edit-form-row">
                <div className="input-group">
                  <label>Código / SKU</label>
                  <input type="text" className="input-field" value={editModal.sku + ' (Protegido)'} disabled />
                </div>
                <div className="input-group">
                  <label>Nombre del Producto</label>
                  <input
                    type="text"
                    className="input-field"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Tipo / Línea</label>
                  {/* Valores permitidos por la restricción CHECK de products.origin en la BD */}
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

              {/* Row 2 - Stock section */}
              <div className="edit-stock-section">
                <div className="edit-form-row">
                  <div className="input-group">
                    <label>Stock Actual Físico</label>
                    <input type="text" className="input-field" value={`${editForm.stock} Unidades`} disabled />
                    <div className={`input-hint ${getStockStatus(editForm.stock, editForm.minStock) === 'critico' ? 'text-danger' : ''}`}>
                      Se ajusta mediante compra o inventario
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Stock Mínimo Configurable</label>
                    <input
                      type="number"
                      className="input-field"
                      value={editForm.minStock}
                      onChange={e => setEditForm({ ...editForm, minStock: e.target.value })}
                    />
                    <div className="input-hint">Dispara alertas en Dashboard</div>
                  </div>
                  <div className="input-group">
                    <label>Estado de Visibilidad</label>
                    <div className="edit-visibility">
                      <span className="status-dot" style={{ background: editForm.active ? 'var(--green-primary)' : 'var(--text-muted)' }}></span>
                      {editForm.active ? 'Activo en Ventas' : 'Inactivo'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3 - Costs */}
              <div className="edit-form-row">
                <div className="input-group">
                  <label>Costo de Insumos / Producción</label>
                  <input
                    type="number"
                    className="input-field"
                    value={editForm.cost}
                    onChange={e => setEditForm({ ...editForm, cost: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label>Precio de Venta al Público *</label>
                  <input
                    type="number"
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

              {/* Observation */}
              <div className="input-group">
                <label>Motivo del Cambio / Observación</label>
                <textarea
                  className="input-field"
                  value={editForm.observation}
                  onChange={e => setEditForm({ ...editForm, observation: e.target.value })}
                  rows={3}
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
    </div>
  );
}
