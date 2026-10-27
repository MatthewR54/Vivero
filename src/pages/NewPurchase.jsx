import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP } from '../utils/currency';
import { getTodayString, calculateWeightedAverageCost } from '../utils/calculations';
import {
  ArrowLeft,
  Save,
  X,
  Plus,
  Trash2,
  Truck,
  Package,
  Wallet,
  Calculator,
  Sparkles
} from 'lucide-react';
import './NewPurchase.css';

export default function NewPurchase() {
  const {
    suppliers,
    products,
    accounts,
    purchases,
    addPurchase,
    showToast
  } = useAppData();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const activeSuppliers = useMemo(
    () => (suppliers || []).filter(s => s.active !== false),
    [suppliers]
  );

  const initialSupplierId = searchParams.get('supplierId')
    || (activeSuppliers[0]?.id ? String(activeSuppliers[0].id) : '');

  const nextInvoiceNumber = useMemo(() => {
    const seq = (purchases?.length || 0) + 1;
    return `FAC-2026-${String(seq).padStart(3, '0')}`;
  }, [purchases]);

  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvoiceNumber);
  const [purchaseDate, setPurchaseDate] = useState(getTodayString());
  const [accountId, setAccountId] = useState(accounts[0]?.id ? String(accounts[0].id) : '1');
  const [notes, setNotes] = useState('');

  // Items in the purchase invoice
  const [items, setItems] = useState(() => {
    const sid = Number(initialSupplierId);
    const linked = products.filter(p => Number(p.supplierId) === sid);
    if (linked.length > 0) {
      return linked.slice(0, 2).map(p => ({
        productId: p.id,
        quantity: 10,
        unitCost: p.cost || 0
      }));
    }
    return [];
  });

  const [productToAdd, setProductToAdd] = useState('');
  const [saving, setSaving] = useState(false);

  const productsById = useMemo(
    () => new Map(products.map(p => [p.id, p])),
    [products]
  );

  const selectedSupplier = useMemo(
    () => suppliers.find(s => Number(s.id) === Number(supplierId)) || null,
    [suppliers, supplierId]
  );

  const selectedAccount = useMemo(
    () => accounts.find(a => Number(a.id) === Number(accountId)) || null,
    [accounts, accountId]
  );

  const supplierProducts = useMemo(
    () => products.filter(p => Number(p.supplierId) === Number(supplierId)),
    [products, supplierId]
  );

  const otherProducts = useMemo(
    () => products.filter(p => Number(p.supplierId) !== Number(supplierId)),
    [products, supplierId]
  );

  const handleAddProductRow = (prodId) => {
    const targetId = prodId || productToAdd;
    if (!targetId) return;
    const prod = productsById.get(targetId);
    if (!prod) return;

    setItems(prev => {
      const exists = prev.find(it => it.productId === targetId);
      if (exists) {
        return prev.map(it =>
          it.productId === targetId
            ? { ...it, quantity: (Number(it.quantity) || 0) + 1 }
            : it
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          quantity: 10,
          unitCost: prod.cost || 0
        }
      ];
    });
    setProductToAdd('');
  };

  const handleLoadSupplierProducts = () => {
    if (supplierProducts.length === 0) {
      showToast('Este proveedor aún no tiene productos habituales vinculados', 'info');
      return;
    }
    setItems(prev => {
      const existingIds = new Set(prev.map(i => i.productId));
      const newRows = supplierProducts
        .filter(p => !existingIds.has(p.id))
        .map(p => ({
          productId: p.id,
          quantity: Math.max(10, (p.minStock || 5) * 2),
          unitCost: p.cost || 0
        }));
      return [...prev, ...newRows];
    });
    showToast('Productos habituales del proveedor agregados a la orden', 'info');
  };

  const handleItemChange = (productId, field, value) => {
    setItems(prev =>
      prev.map(it => (it.productId === productId ? { ...it, [field]: value } : it))
    );
  };

  const handleRemoveItem = (productId) => {
    setItems(prev => prev.filter(it => it.productId !== productId));
  };

  const summary = useMemo(() => {
    let totalCost = 0;
    let totalUnits = 0;
    for (const it of items) {
      const q = Math.max(0, parseInt(it.quantity, 10) || 0);
      const c = Math.max(0, Number(it.unitCost) || 0);
      totalUnits += q;
      totalCost += q * c;
    }
    const currentAccBalance = Number(selectedAccount?.balance) || 0;
    const projectedAccBalance = currentAccBalance - totalCost;
    return {
      totalCost,
      totalUnits,
      currentAccBalance,
      projectedAccBalance
    };
  }, [items, selectedAccount]);

  const handleSubmit = async () => {
    if (saving) return;
    if (!supplierId) {
      showToast('Selecciona un proveedor para registrar la compra', 'error');
      return;
    }
    if (items.length === 0) {
      showToast('Agrega al menos un producto a la factura de compra', 'error');
      return;
    }

    for (const it of items) {
      const q = parseInt(it.quantity, 10);
      const c = Number(it.unitCost);
      if (!q || q <= 0) {
        showToast('Todas las cantidades deben ser mayores a 0', 'error');
        return;
      }
      if (Number.isNaN(c) || c < 0) {
        showToast('El costo unitario no puede ser negativo', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      await addPurchase({
        supplierId: Number(supplierId),
        invoiceNumber: invoiceNumber.trim() || nextInvoiceNumber,
        purchaseDate,
        accountId: accountId ? Number(accountId) : null,
        notes,
        items: items.map(it => ({
          productId: it.productId,
          quantity: parseInt(it.quantity, 10),
          unitCost: Number(it.unitCost)
        }))
      });
      showToast(
        `Compra registrada: +${summary.totalUnits} uds ingresadas al inventario y costos promediados`,
        'success'
      );
      navigate('/compras');
    } catch (err) {
      showToast(`No se pudo registrar la compra: ${err.message}`, 'error');
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <button className="btn btn-ghost npur-back" onClick={() => navigate('/compras')}>
        <ArrowLeft size={16} /> Volver al Historial de Compras
      </button>

      <div className="page-header">
        <div className="page-header-left">
          <h1>Registrar Factura de Compra a Proveedor</h1>
          <p>Ingreso de mercancía e insumos con actualización automática de existencias y costo promedio ponderado (RF-15 a RF-20, RF-33)</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-ghost" onClick={() => navigate('/compras')}>
            <X size={16} /> Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving || items.length === 0}
          >
            <Save size={16} /> {saving ? 'Procesando Compra...' : 'Confirmar Compra e Ingresar Stock'}
          </button>
        </div>
      </div>

      <div className="npur-layout">
        {/* Left Column: Invoice & Payment Info */}
        <div className="card npur-sidebar-card">
          <div className="card-body">
            <div className="npur-section-title">
              <Truck size={16} /> 1. Datos del Proveedor y Factura
            </div>

            <div className="input-group">
              <label>Proveedor Abastecedor (RF-15) *</label>
              <select
                className="input-field"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
              >
                <option value="">— Seleccionar proveedor —</option>
                {activeSuppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {selectedSupplier && (
                <div className="input-hint">
                  Contacto: {selectedSupplier.contactName || 'N/A'} • {selectedSupplier.phone || ''}
                </div>
              )}
            </div>

            <div className="input-group">
              <label>Número de Factura / Remisión *</label>
              <input
                type="text"
                className="input-field"
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                placeholder="Ej. FAC-2026-001"
              />
            </div>

            <div className="input-group">
              <label>Fecha de Compra (RF-16) *</label>
              <input
                type="date"
                className="input-field"
                value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)}
              />
            </div>

            <div className="npur-divider" />

            <div className="npur-section-title">
              <Wallet size={16} /> 2. Cuenta de Pago (RF-96)
            </div>

            <div className="input-group">
              <label>Descontar Pago de la Cuenta *</label>
              <select
                className="input-field"
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Saldo: {formatCOP(acc.balance)})
                  </option>
                ))}
              </select>
            </div>

            {selectedAccount && (
              <div className={`npur-account-preview ${summary.projectedAccBalance < 0 ? 'warn' : ''}`}>
                <div className="npur-acc-row">
                  <span>Saldo disponible hoy:</span>
                  <strong>{formatCOP(summary.currentAccBalance)}</strong>
                </div>
                <div className="npur-acc-row">
                  <span>Egreso por esta compra:</span>
                  <strong className="text-danger">-{formatCOP(summary.totalCost)}</strong>
                </div>
                <div className="npur-acc-row total">
                  <span>Saldo proyectado tras pago:</span>
                  <strong>{formatCOP(summary.projectedAccBalance)}</strong>
                </div>
              </div>
            )}

            <div className="input-group" style={{ marginTop: 14 }}>
              <label>Observaciones / Condiciones de Entrega</label>
              <textarea
                className="input-field"
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej. Pedido recibido completo en bodega principal, pago de contado..."
              ></textarea>
            </div>
          </div>
        </div>

        {/* Right Column: Items & Weighted Average Cost Calculation */}
        <div className="card npur-items-card">
          <div className="card-body">
            <div className="npur-items-header">
              <div>
                <div className="npur-section-title" style={{ marginBottom: 2 }}>
                  <Package size={16} /> 3. Productos y Cantidades Adquiridas (RF-17, RF-18, RF-33)
                </div>
                <p className="npur-subtitle">
                  Cada línea calcula automáticamente el nuevo stock y el <strong>Costo Promedio Ponderado</strong>.
                </p>
              </div>
              {supplierProducts.length > 0 && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={handleLoadSupplierProducts}
                >
                  <Sparkles size={13} /> Cargar {supplierProducts.length} prod. del proveedor
                </button>
              )}
            </div>

            {/* Product Selector Bar */}
            <div className="npur-add-bar">
              <select
                className="input-field npur-product-select"
                value={productToAdd}
                onChange={e => setProductToAdd(e.target.value)}
              >
                <option value="">Seleccionar producto del catálogo para agregar a la factura...</option>
                {supplierProducts.length > 0 && (
                  <optgroup label={`⭐ Productos asociados a ${selectedSupplier?.name || 'este proveedor'}`}>
                    {supplierProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name} (Stock actual: {p.stock} uds • Costo actual: {formatCOP(p.cost)})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="📦 Otros productos del catálogo">
                  {otherProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name} (Stock actual: {p.stock} uds • Costo actual: {formatCOP(p.cost)})
                    </option>
                  ))}
                </optgroup>
              </select>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleAddProductRow()}
                disabled={!productToAdd}
              >
                <Plus size={16} /> Agregar Línea
              </button>
            </div>

            {/* Items Table */}
            <div className="table-wrapper npur-table-wrapper">
              {items.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Proyección Stock (RF-20)</th>
                      <th>Cantidad a Comprar *</th>
                      <th>Costo Unit. Compra *</th>
                      <th>Nuevo Costo Promedio (RF-33)</th>
                      <th>Subtotal</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(it => {
                      const prod = productsById.get(it.productId);
                      const curStock = Number(prod?.stock) || 0;
                      const curCost = Number(prod?.cost) || 0;
                      const qty = Math.max(0, parseInt(it.quantity, 10) || 0);
                      const unitCost = Math.max(0, Number(it.unitCost) || 0);
                      const resultingStock = curStock + qty;
                      const newAvgCost = calculateWeightedAverageCost(curStock, curCost, qty, unitCost);
                      const subtotal = qty * unitCost;

                      return (
                        <tr key={it.productId}>
                          <td>
                            <div className="npur-prod-name">{prod?.name || it.productId}</div>
                            <div className="npur-prod-meta">
                              <span>{prod?.sku}</span> • <span>Costo actual: {formatCOP(curCost)}</span>
                            </div>
                          </td>
                          <td>
                            <div className="npur-stock-badge">
                              <span>{curStock}</span>
                              <span className="npur-arrow">→</span>
                              <strong>{resultingStock} uds</strong>
                            </div>
                          </td>
                          <td style={{ width: 130 }}>
                            <input
                              type="number"
                              min="1"
                              className="input-field npur-table-input"
                              value={it.quantity}
                              onChange={e => handleItemChange(it.productId, 'quantity', e.target.value)}
                            />
                          </td>
                          <td style={{ width: 160 }}>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              className="input-field npur-table-input"
                              value={it.unitCost}
                              onChange={e => handleItemChange(it.productId, 'unitCost', e.target.value)}
                            />
                          </td>
                          <td>
                            <div className="npur-avg-cost-box" title="Fórmula: ((StockActual × CostoActual) + (CantComprada × CostoCompra)) / StockTotal">
                              <Calculator size={13} />
                              <span>{formatCOP(newAvgCost)}</span>
                              {newAvgCost !== curCost && (
                                <small className={newAvgCost > curCost ? 'cost-up' : 'cost-down'}>
                                  ({newAvgCost > curCost ? '+' : ''}{formatCOP(newAvgCost - curCost)})
                                </small>
                              )}
                            </div>
                          </td>
                          <td className="npur-subtotal-cell">{formatCOP(subtotal)}</td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost text-danger"
                              onClick={() => handleRemoveItem(it.productId)}
                              title="Quitar producto de la compra"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
                  <p>No hay productos en la factura. Selecciona un producto arriba o haz clic en "Cargar productos del proveedor".</p>
                </div>
              )}
            </div>

            {/* Summary Bar (RF-19) */}
            <div className="npur-summary-footer">
              <div className="npur-summary-metrics">
                <div className="npur-metric">
                  <span>Referencias:</span>
                  <strong>{items.length} productos</strong>
                </div>
                <div className="npur-metric">
                  <span>Unidades Totales a Ingresar:</span>
                  <strong>+{summary.totalUnits} unidades</strong>
                </div>
              </div>
              <div className="npur-grand-total">
                <span>Costo Total de la Compra (RF-19):</span>
                <strong>{formatCOP(summary.totalCost)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
