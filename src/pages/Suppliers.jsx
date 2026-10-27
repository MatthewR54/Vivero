import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP } from '../utils/currency';
import { exportToCSV } from '../utils/exportCSV';
import {
  Plus,
  Search,
  Pencil,
  X,
  Save,
  Download,
  Truck,
  Phone,
  Mail,
  MapPin,
  User,
  Package,
  ShoppingBag,
  Link2,
  Unlink,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import './Suppliers.css';

const FILTER_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'with_products', label: 'Con Productos Asociados' },
  { key: 'inactive', label: 'Inactivos' }
];

const EMPTY_FORM = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  active: true
};

export default function Suppliers() {
  const {
    suppliers,
    products,
    purchases,
    addSupplier,
    updateSupplier,
    updateProduct,
    showToast
  } = useAppData();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');

  // Create / Edit Supplier Modal (RF-10, RF-11)
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Detail Modal: Associated Products & Purchase History (RF-13, RF-14)
  const [detailSupplierId, setDetailSupplierId] = useState(null);
  const [selectedProductToLink, setSelectedProductToLink] = useState('');
  const [linkingProduct, setLinkingProduct] = useState(false);

  // Map supplierId -> products[]
  const productsBySupplier = useMemo(() => {
    const map = new Map();
    for (const p of products) {
      if (!p.supplierId) continue;
      const sid = Number(p.supplierId);
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(p);
    }
    return map;
  }, [products]);

  // Map supplierId -> purchases[]
  const purchasesBySupplier = useMemo(() => {
    const map = new Map();
    for (const pur of purchases || []) {
      const sid = Number(pur.supplierId);
      if (!map.has(sid)) map.set(sid, []);
      map.get(sid).push(pur);
    }
    return map;
  }, [purchases]);

  const activeCount = useMemo(
    () => suppliers.filter(s => s.active !== false).length,
    [suppliers]
  );

  const inactiveCount = useMemo(
    () => suppliers.filter(s => s.active === false).length,
    [suppliers]
  );

  const linkedProductsCount = useMemo(
    () => products.filter(p => Boolean(p.supplierId)).length,
    [products]
  );

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter(s => {
      const matchSearch = !q ||
        s.name?.toLowerCase().includes(q) ||
        s.contactName?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q);

      if (!matchSearch) return false;
      if (filterTab === 'active') return s.active !== false;
      if (filterTab === 'inactive') return s.active === false;
      if (filterTab === 'with_products') {
        return (productsBySupplier.get(Number(s.id))?.length || 0) > 0;
      }
      return true;
    });
  }, [suppliers, search, filterTab, productsBySupplier]);

  const detailSupplier = useMemo(
    () => suppliers.find(s => Number(s.id) === Number(detailSupplierId)) || null,
    [suppliers, detailSupplierId]
  );

  const detailProducts = useMemo(
    () => (detailSupplier ? productsBySupplier.get(Number(detailSupplier.id)) || [] : []),
    [detailSupplier, productsBySupplier]
  );

  const detailPurchases = useMemo(
    () => (detailSupplier ? purchasesBySupplier.get(Number(detailSupplier.id)) || [] : []),
    [detailSupplier, purchasesBySupplier]
  );

  const availableProductsToLink = useMemo(() => {
    if (!detailSupplier) return [];
    return products.filter(p => Number(p.supplierId) !== Number(detailSupplier.id));
  }, [products, detailSupplier]);

  // Open Create Modal (RF-10)
  const openCreateModal = () => {
    setEditingSupplier(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setFormModalOpen(true);
  };

  // Open Edit Modal (RF-11)
  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || '',
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      active: supplier.active !== false
    });
    setErrors({});
    setFormModalOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (saving) return;
    const newErrors = {};
    if (!form.name.trim()) {
      newErrors.name = 'La razón social o nombre del proveedor es obligatorio';
    }
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showToast('Revisa los campos marcados en el formulario', 'error');
      return;
    }

    setSaving(true);
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, {
          name: form.name.trim(),
          contactName: form.contactName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          active: Boolean(form.active)
        });
        showToast('Información del proveedor actualizada', 'success');
      } else {
        await addSupplier({
          name: form.name.trim(),
          contactName: form.contactName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
          active: Boolean(form.active)
        });
        showToast('Proveedor registrado en el directorio', 'success');
      }
      setFormModalOpen(false);
    } catch (err) {
      showToast(`Error al guardar proveedor: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Link / Unlink product to supplier (RF-13)
  const handleLinkProduct = async () => {
    if (!detailSupplier || !selectedProductToLink || linkingProduct) return;
    setLinkingProduct(true);
    try {
      await updateProduct(selectedProductToLink, { supplierId: Number(detailSupplier.id) });
      showToast('Producto asociado al proveedor correctamente', 'success');
      setSelectedProductToLink('');
    } catch (err) {
      showToast(`No se pudo asociar el producto: ${err.message}`, 'error');
    } finally {
      setLinkingProduct(false);
    }
  };

  const handleUnlinkProduct = async (product) => {
    if (linkingProduct) return;
    setLinkingProduct(true);
    try {
      await updateProduct(product.id, { supplierId: null });
      showToast(`Producto "${product.name}" desvinculado del proveedor`, 'info');
    } catch (err) {
      showToast(`No se pudo desvincular el producto: ${err.message}`, 'error');
    } finally {
      setLinkingProduct(false);
    }
  };

  const handleExportSuppliersCSV = () => {
    const rows = filteredSuppliers.map(s => {
      const linked = productsBySupplier.get(Number(s.id)) || [];
      const purList = purchasesBySupplier.get(Number(s.id)) || [];
      return {
        ID: `PROV-${String(s.id).padStart(3, '0')}`,
        Proveedor: s.name,
        Contacto: s.contactName || '—',
        Telefono: s.phone || '—',
        Correo: s.email || '—',
        Direccion: s.address || '—',
        Estado: s.active !== false ? 'Activo' : 'Inactivo',
        Productos_Asociados: linked.length,
        Detalle_Productos: linked.map(p => `${p.sku} (${p.name})`).join('; ') || 'Ninguno',
        Compras_Registradas: purList.length
      };
    });
    exportToCSV(rows, `directorio_proveedores_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Directorio de proveedores exportado a CSV', 'info');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Directorio y Gestión de Proveedores</h1>
          <p>Administración de distribuidores, vinculación con productos del catálogo e historial de abastecimiento</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-outline" onClick={handleExportSuppliersCSV}>
            <Download size={16} /> Exportar CSV
          </button>
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> Registrar Proveedor
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="sup-kpi-grid">
        <div className="card sup-kpi-card">
          <div className="sup-kpi-icon green">
            <Truck size={20} />
          </div>
          <div>
            <div className="sup-kpi-label">Proveedores Registrados</div>
            <div className="sup-kpi-value">{suppliers.length}</div>
            <div className="sup-kpi-sub">{activeCount} activos en directorio</div>
          </div>
        </div>

        <div className="card sup-kpi-card">
          <div className="sup-kpi-icon blue">
            <Package size={20} />
          </div>
          <div>
            <div className="sup-kpi-label">Productos Vinculados (RF-13)</div>
            <div className="sup-kpi-value">{linkedProductsCount} de {products.length}</div>
            <div className="sup-kpi-sub">Con proveedor habitual asignado</div>
          </div>
        </div>

        <div className="card sup-kpi-card">
          <div className="sup-kpi-icon amber">
            <ShoppingBag size={20} />
          </div>
          <div>
            <div className="sup-kpi-label">Compras Registradas (RF-14)</div>
            <div className="sup-kpi-value">{purchases?.length || 0}</div>
            <div className="sup-kpi-sub">Facturas de abastecimiento en historial</div>
          </div>
        </div>
      </div>

      {/* Directory Card */}
      <div className="card">
        <div className="sup-filters">
          <div className="sup-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="input-field"
              placeholder="Buscar por nombre de empresa, contacto, teléfono, correo o dirección..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Buscar proveedores"
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
                {tab.key === 'all' ? ` (${suppliers.length})` : ''}
                {tab.key === 'active' ? ` (${activeCount})` : ''}
                {tab.key === 'inactive' ? ` (${inactiveCount})` : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrapper">
          {filteredSuppliers.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Empresa / Proveedor</th>
                  <th>Contacto Comercial</th>
                  <th>Teléfono y Correo</th>
                  <th>Ubicación / Bodega</th>
                  <th>Productos Asociados</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(s => {
                  const linkedProds = productsBySupplier.get(Number(s.id)) || [];
                  const supplierPurchases = purchasesBySupplier.get(Number(s.id)) || [];
                  const isActive = s.active !== false;

                  return (
                    <tr key={s.id} className={!isActive ? 'row-inactive' : ''}>
                      <td>
                        <span className="sup-code">PROV-{String(s.id).padStart(3, '0')}</span>
                      </td>
                      <td>
                        <div className="sup-name">{s.name}</div>
                        {supplierPurchases.length > 0 && (
                          <div className="sup-subtext">
                            {supplierPurchases.length} compra(s) registrada(s)
                          </div>
                        )}
                      </td>
                      <td>
                        {s.contactName ? (
                          <div className="sup-contact-line">
                            <User size={13} className="sup-inline-icon" />
                            <span>{s.contactName}</span>
                          </div>
                        ) : (
                          <span className="td-muted">Sin especificar</span>
                        )}
                      </td>
                      <td>
                        <div className="sup-contact-stack">
                          {s.phone && (
                            <div className="sup-contact-line">
                              <Phone size={12} className="sup-inline-icon" />
                              <span>{s.phone}</span>
                            </div>
                          )}
                          {s.email && (
                            <div className="sup-contact-line">
                              <Mail size={12} className="sup-inline-icon" />
                              <span className="sup-email">{s.email}</span>
                            </div>
                          )}
                          {!s.phone && !s.email && <span className="td-muted">—</span>}
                        </div>
                      </td>
                      <td>
                        {s.address ? (
                          <div className="sup-contact-line">
                            <MapPin size={13} className="sup-inline-icon" />
                            <span className="td-muted">{s.address}</span>
                          </div>
                        ) : (
                          <span className="td-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="sup-products-cell">
                          <span className={`sup-prod-count ${linkedProds.length > 0 ? 'has-prods' : ''}`}>
                            <Package size={12} /> {linkedProds.length} prod.
                          </span>
                          {linkedProds.slice(0, 2).map(p => (
                            <span key={p.id} className="sup-prod-pill" title={p.name}>
                              {p.name}
                            </span>
                          ))}
                          {linkedProds.length > 2 && (
                            <span className="sup-prod-more">+{linkedProds.length - 2} más</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`status-indicator ${isActive ? 'status-optimo' : 'status-alerta'}`}>
                          <span className="status-dot"></span>
                          {isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="sup-actions-group">
                          <button
                            className="btn btn-sm btn-cyan"
                            onClick={() => openEditModal(s)}
                            title="Modificar datos de contacto del proveedor (RF-11)"
                          >
                            <Pencil size={12} /> Editar
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                              setDetailSupplierId(s.id);
                              setSelectedProductToLink('');
                            }}
                            title="Gestionar productos asociados (RF-13) y consultar historial de compras (RF-14)"
                          >
                            <Link2 size={12} /> Productos / Historial
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
              <p>No se encontraron proveedores que coincidan con los criterios de búsqueda.</p>
            </div>
          )}
        </div>

        <div className="sup-footer">
          <span className="sup-footer-count">
            Mostrando {filteredSuppliers.length} de {suppliers.length} proveedores registrados
          </span>
          <span className="sup-footer-hint">
            <Info size={13} /> Use "Productos / Historial" para vincular productos del catálogo a un proveedor o consultar sus facturas de compra.
          </span>
        </div>
      </div>

      {/* ===== MODAL 1: CREATE / EDIT SUPPLIER (RF-10, RF-11) ===== */}
      {formModalOpen && (
        <div className="modal-overlay" onClick={() => setFormModalOpen(false)} role="dialog" aria-modal="true">
          <div className="modal-content sup-form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h3>
                  <Truck size={16} style={{ marginRight: 8, display: 'inline' }} />
                  {editingSupplier ? 'Modificar Información del Proveedor' : 'Registrar Nuevo Proveedor'}
                </h3>
                <p>
                  {editingSupplier
                    ? `Editando PROV-${String(editingSupplier.id).padStart(3, '0')} • ${editingSupplier.name}`
                    : 'Capture los datos comerciales y de contacto para asociar productos y compras'}
                </p>
              </div>
              <button className="modal-close" onClick={() => setFormModalOpen(false)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="sup-form-grid">
                <div className="input-group sup-col-span-2">
                  <label>Nombre de Empresa o Razón Social *</label>
                  <input
                    type="text"
                    className={`input-field ${errors.name ? 'error' : ''}`}
                    placeholder="Ej. Distribuidora Macetas del Valle S.A.S."
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                  />
                  {errors.name && <div className="input-error">{errors.name}</div>}
                </div>

                <div className="input-group">
                  <label>Persona o Área de Contacto</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej. Javier Peña • Asesor Comercial"
                    value={form.contactName}
                    onChange={e => setForm({ ...form, contactName: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Teléfono / WhatsApp de Pedidos</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej. +57 312 456 7890"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                  />
                </div>

                <div className="input-group">
                  <label>Correo Electrónico</label>
                  <input
                    type="email"
                    className={`input-field ${errors.email ? 'error' : ''}`}
                    placeholder="Ej. pedidos@proveedor.com.co"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                  />
                  {errors.email && <div className="input-error">{errors.email}</div>}
                </div>

                <div className="input-group">
                  <label>Estado del Proveedor</label>
                  <button
                    type="button"
                    className={`sup-status-toggle ${form.active ? 'active' : 'inactive'}`}
                    onClick={() => setForm({ ...form, active: !form.active })}
                  >
                    {form.active ? (
                      <>
                        <CheckCircle2 size={15} /> Proveedor Activo (Habilitado)
                      </>
                    ) : (
                      <>
                        <XCircle size={15} /> Inactivo (Archivado)
                      </>
                    )}
                  </button>
                </div>

                <div className="input-group sup-col-span-2">
                  <label>Dirección / Bodega / Punto de Entrega</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej. Bodega 14 • Central Mayorista / Ruta Norte"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setFormModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSaveSupplier} disabled={saving}>
                <Save size={14} /> {saving ? 'Guardando...' : editingSupplier ? 'Guardar Cambios' : 'Registrar Proveedor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL 2: SUPPLIER PRODUCTS & PURCHASE HISTORY (RF-13, RF-14) ===== */}
      {detailSupplier && (
        <div className="modal-overlay" onClick={() => setDetailSupplierId(null)} role="dialog" aria-modal="true">
          <div className="modal-content sup-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h3>
                  <Truck size={16} style={{ marginRight: 8, display: 'inline' }} />
                  {detailSupplier.name}
                </h3>
                <p>
                  PROV-{String(detailSupplier.id).padStart(3, '0')}
                  {detailSupplier.contactName ? ` • Contacto: ${detailSupplier.contactName}` : ''}
                  {detailSupplier.phone ? ` • Tel: ${detailSupplier.phone}` : ''}
                </p>
              </div>
              <button className="modal-close" onClick={() => setDetailSupplierId(null)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {/* Section 1: Linked Products (RF-13) */}
              <div className="sup-detail-section">
                <div className="sup-detail-header">
                  <div>
                    <h4><Package size={15} /> Productos Asociados a este Proveedor (RF-13)</h4>
                    <p>Productos del catálogo suministrados habitualmente por {detailSupplier.name}</p>
                  </div>
                  <div className="sup-link-bar">
                    <select
                      className="input-field sup-link-select"
                      value={selectedProductToLink}
                      onChange={e => setSelectedProductToLink(e.target.value)}
                    >
                      <option value="">Seleccionar producto para asociar...</option>
                      {availableProductsToLink.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name} ({p.origin})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={handleLinkProduct}
                      disabled={!selectedProductToLink || linkingProduct}
                    >
                      <Link2 size={13} /> Asociar Producto
                    </button>
                  </div>
                </div>

                {detailProducts.length > 0 ? (
                  <div className="table-wrapper sup-mini-table">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Producto</th>
                          <th>Origen / Línea</th>
                          <th>Stock Actual</th>
                          <th>Costo Base</th>
                          <th>Precio Venta</th>
                          <th>Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailProducts.map(p => (
                          <tr key={p.id}>
                            <td><span className="sup-code">{p.sku}</span></td>
                            <td className="sup-name">{p.name}</td>
                            <td className="td-muted">{p.origin}</td>
                            <td><strong>{p.stock} uds</strong> (Mín: {p.minStock})</td>
                            <td>{formatCOP(p.cost)}</td>
                            <td style={{ color: 'var(--green-primary)', fontWeight: 600 }}>
                              {formatCOP(p.price)}
                            </td>
                            <td>
                              <button
                                className="btn btn-sm btn-ghost"
                                onClick={() => handleUnlinkProduct(p)}
                                disabled={linkingProduct}
                                title="Desvincular este producto del proveedor"
                              >
                                <Unlink size={12} /> Desvincular
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="sup-empty-box">
                    No hay productos vinculados a este proveedor. Usa el selector superior o el formulario de Nuevo Producto para asociarlos.
                  </div>
                )}
              </div>

              {/* Section 2: Purchase History (RF-14) */}
              <div className="sup-detail-section" style={{ marginTop: 20 }}>
                <div className="sup-detail-header">
                  <div>
                    <h4><ShoppingBag size={15} /> Historial de Compras Realizadas al Proveedor (RF-14)</h4>
                    <p>Registro histórico de facturas de reabastecimiento e insumos adquiridos</p>
                  </div>
                  <div className="sup-purchase-total">
                    Total Comprado:{' '}
                    <strong>
                      {formatCOP(detailPurchases.reduce((sum, pur) => sum + (Number(pur.totalCost) || 0), 0))}
                    </strong>
                  </div>
                </div>

                {detailPurchases.length > 0 ? (
                  <div className="table-wrapper sup-mini-table">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Factura / Ref.</th>
                          <th>Productos y Cantidades</th>
                          <th>Cuenta de Pago</th>
                          <th>Costo Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailPurchases.map(pur => (
                          <tr key={pur.id}>
                            <td className="td-muted">{pur.date}</td>
                            <td><span className="sup-code">{pur.invoiceNumber || 'S/N'}</span></td>
                            <td>
                              {(pur.items || []).map(it => `${it.quantity}× ${it.productName}`).join(', ') || pur.notes || 'Compra de insumos'}
                            </td>
                            <td className="td-muted">{pur.accountName || 'Caja / Banco'}</td>
                            <td style={{ fontWeight: 700 }}>{formatCOP(pur.totalCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="sup-empty-box">
                    Aún no se han registrado facturas de compra para <strong>{detailSupplier.name}</strong>.
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => {
                  const sid = detailSupplier.id;
                  setDetailSupplierId(null);
                  navigate(`/compras/nueva?supplierId=${sid}`);
                }}
              >
                <ShoppingBag size={14} /> Registrar Compra a este Proveedor
              </button>
              <button
                className="btn btn-outline"
                onClick={() => {
                  setDetailSupplierId(null);
                  navigate('/inventario/nuevo');
                }}
              >
                <Plus size={14} /> Crear Producto con este Proveedor
              </button>
              <button className="btn btn-primary" onClick={() => setDetailSupplierId(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
