import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP } from '../utils/currency';
import { exportToCSV } from '../utils/exportCSV';
import { isDateInPeriod } from '../utils/calculations';
import {
  Plus,
  Search,
  Download,
  ShoppingBag,
  Truck,
  Package,
  DollarSign,
  Eye,
  X,
  FileText,
  Info
} from 'lucide-react';
import './Purchases.css';

const PERIOD_FILTERS = [
  { key: 'Todo', label: 'Todo el Historial' },
  { key: 'Hoy', label: 'Hoy' },
  { key: 'Últimos 7 días', label: 'Últimos 7 días' },
  { key: 'Este Mes', label: 'Este Mes' }
];

export default function Purchases() {
  const { purchases, suppliers, showToast } = useAppData();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('Todo');
  const [detailPurchase, setDetailPurchase] = useState(null);

  const supplierById = useMemo(() => {
    const map = new Map();
    for (const s of suppliers || []) {
      map.set(Number(s.id), s);
    }
    return map;
  }, [suppliers]);

  const filteredPurchases = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (purchases || []).filter(pur => {
      if (supplierFilter !== 'all' && Number(pur.supplierId) !== Number(supplierFilter)) {
        return false;
      }
      if (!isDateInPeriod(pur.date, periodFilter)) {
        return false;
      }
      if (!q) return true;
      const supName = (pur.supplierName || supplierById.get(Number(pur.supplierId))?.name || '').toLowerCase();
      const inv = (pur.invoiceNumber || '').toLowerCase();
      const notes = (pur.notes || '').toLowerCase();
      const itemsText = (pur.items || [])
        .map(it => `${it.productName} ${it.sku}`)
        .join(' ')
        .toLowerCase();

      return supName.includes(q) || inv.includes(q) || notes.includes(q) || itemsText.includes(q);
    });
  }, [purchases, search, supplierFilter, periodFilter, supplierById]);

  const stats = useMemo(() => {
    let totalInvested = 0;
    let totalUnits = 0;
    const uniqueSuppliers = new Set();

    for (const pur of filteredPurchases) {
      totalInvested += Number(pur.totalCost) || 0;
      if (pur.supplierId) uniqueSuppliers.add(Number(pur.supplierId));
      for (const it of pur.items || []) {
        totalUnits += Number(it.quantity) || 0;
      }
    }

    return {
      count: filteredPurchases.length,
      totalInvested,
      totalUnits,
      suppliersCount: uniqueSuppliers.size
    };
  }, [filteredPurchases]);

  const handleExportPurchasesCSV = () => {
    if (filteredPurchases.length === 0) {
      showToast('No hay compras en la vista actual para exportar', 'info');
      return;
    }
    const rows = filteredPurchases.map(pur => {
      const supName = pur.supplierName || supplierById.get(Number(pur.supplierId))?.name || 'Proveedor';
      const totalUnits = (pur.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0);
      return {
        Fecha: pur.date,
        Factura: pur.invoiceNumber || 'S/N',
        Proveedor: supName,
        Unidades_Ingresadas: totalUnits,
        Detalle_Productos: (pur.items || [])
          .map(it => `${it.quantity}x ${it.productName} ($${it.unitCost})`)
          .join('; '),
        Cuenta_Pago: pur.accountName || 'Caja / Banco',
        Costo_Total_COP: pur.totalCost,
        Observaciones: pur.notes || '—'
      };
    });
    exportToCSV(rows, `reporte_compras_${new Date().toISOString().slice(0, 10)}.csv`);
    showToast('Reporte de compras exportado a CSV', 'info');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Historial y Control de Compras a Proveedores</h1>
          <p>Consulta de facturas de abastecimiento, costos de adquisición y entradas de mercancía por período (RF-21, RF-22, RF-127)</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-outline" onClick={handleExportPurchasesCSV}>
            <Download size={16} /> Exportar Reporte CSV
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/compras/nueva')}>
            <Plus size={16} /> Registrar Compra
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="pur-kpi-grid">
        <div className="card pur-kpi-card">
          <div className="pur-kpi-icon green">
            <ShoppingBag size={20} />
          </div>
          <div>
            <div className="pur-kpi-label">Facturas en Período</div>
            <div className="pur-kpi-value">{stats.count} compras</div>
            <div className="pur-kpi-sub">Filtro: {periodFilter}</div>
          </div>
        </div>

        <div className="card pur-kpi-card">
          <div className="pur-kpi-icon amber">
            <DollarSign size={20} />
          </div>
          <div>
            <div className="pur-kpi-label">Inversión en Abastecimiento</div>
            <div className="pur-kpi-value">{formatCOP(stats.totalInvested)}</div>
            <div className="pur-kpi-sub">Total egresos por compras</div>
          </div>
        </div>

        <div className="card pur-kpi-card">
          <div className="pur-kpi-icon blue">
            <Package size={20} />
          </div>
          <div>
            <div className="pur-kpi-label">Unidades Ingresadas</div>
            <div className="pur-kpi-value">+{stats.totalUnits} uds</div>
            <div className="pur-kpi-sub">Sumadas al stock activo</div>
          </div>
        </div>

        <div className="card pur-kpi-card">
          <div className="pur-kpi-icon purple">
            <Truck size={20} />
          </div>
          <div>
            <div className="pur-kpi-label">Proveedores Activos en Filtro</div>
            <div className="pur-kpi-value">{stats.suppliersCount}</div>
            <div className="pur-kpi-sub">De {suppliers.length} en directorio</div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="card">
        <div className="pur-filters">
          <div className="pur-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="input-field"
              placeholder="Buscar por # de factura, proveedor o producto adquirido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Buscar compras"
            />
          </div>

          <select
            className="input-field pur-supplier-select"
            value={supplierFilter}
            onChange={e => setSupplierFilter(e.target.value)}
            aria-label="Filtrar por proveedor"
          >
            <option value="all">Todos los proveedores ({suppliers.length})</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <div className="chip-group">
            {PERIOD_FILTERS.map(pf => (
              <button
                key={pf.key}
                className={`chip ${periodFilter === pf.key ? 'active' : ''}`}
                onClick={() => setPeriodFilter(pf.key)}
              >
                {pf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrapper">
          {filteredPurchases.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Factura / Ref.</th>
                  <th>Proveedor</th>
                  <th>Productos Adquiridos</th>
                  <th>Unidades</th>
                  <th>Cuenta de Pago</th>
                  <th>Costo Total</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map(pur => {
                  const supName = pur.supplierName || supplierById.get(Number(pur.supplierId))?.name || 'Proveedor';
                  const itemsList = pur.items || [];
                  const totalUnits = itemsList.reduce((s, it) => s + (Number(it.quantity) || 0), 0);

                  return (
                    <tr key={pur.id}>
                      <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>
                        {pur.date}
                      </td>
                      <td>
                        <span className="pur-invoice-badge">{pur.invoiceNumber || 'S/N'}</span>
                      </td>
                      <td>
                        <div className="pur-supplier-name">{supName}</div>
                      </td>
                      <td>
                        <div className="pur-items-summary">
                          {itemsList.length > 0
                            ? itemsList.map(it => `${it.quantity}× ${it.productName}`).join(', ')
                            : pur.notes || 'Compra de inventario'}
                        </div>
                      </td>
                      <td>
                        <span className="pur-units-pill">+{totalUnits} uds</span>
                      </td>
                      <td className="td-muted">{pur.accountName || 'Caja / Banco'}</td>
                      <td className="pur-total-cell">{formatCOP(pur.totalCost)}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => setDetailPurchase(pur)}
                        >
                          <Eye size={13} /> Ver Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>
                No hay compras registradas para los filtros seleccionados. Haz clic en{' '}
                <strong>"Registrar Compra"</strong> para ingresar una nueva factura de proveedor.
              </p>
            </div>
          )}
        </div>

        <div className="pur-footer">
          <span className="pur-footer-count">
            Mostrando {filteredPurchases.length} de {purchases?.length || 0} compras registradas
          </span>
          <span className="pur-footer-hint">
            <Info size={13} /> Cada compra registrada incrementa automáticamente el stock, recalcula el costo promedio ponderado y registra el egreso en la cuenta de pago.
          </span>
        </div>
      </div>

      {/* Purchase Detail Modal */}
      {detailPurchase && (
        <div className="modal-overlay" onClick={() => setDetailPurchase(null)} role="dialog" aria-modal="true">
          <div className="modal-content pur-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title">
                <h3>
                  <FileText size={16} style={{ marginRight: 8, display: 'inline' }} />
                  Detalle de Factura de Compra: {detailPurchase.invoiceNumber || 'S/N'}
                </h3>
                <p>
                  Fecha: {detailPurchase.date} • Proveedor:{' '}
                  {detailPurchase.supplierName || supplierById.get(Number(detailPurchase.supplierId))?.name || 'Proveedor'}
                </p>
              </div>
              <button className="modal-close" onClick={() => setDetailPurchase(null)} aria-label="Cerrar modal">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="pur-detail-meta">
                <div>
                  <span>Cuenta de Pago:</span>
                  <strong>{detailPurchase.accountName || 'Caja / Banco'}</strong>
                </div>
                <div>
                  <span>Observaciones:</span>
                  <strong>{detailPurchase.notes || 'Sin observaciones adicionales'}</strong>
                </div>
              </div>

              <div className="table-wrapper" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Producto</th>
                      <th>Cantidad Ingresada</th>
                      <th>Costo Unitario Compra</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailPurchase.items || []).map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td><span className="pur-invoice-badge">{it.sku || it.productId}</span></td>
                        <td style={{ fontWeight: 600 }}>{it.productName}</td>
                        <td><span className="pur-units-pill">+{it.quantity} uds</span></td>
                        <td>{formatCOP(it.unitCost)}</td>
                        <td style={{ fontWeight: 700 }}>{formatCOP(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pur-detail-total">
                <span>Costo Total Pagado:</span>
                <strong>{formatCOP(detailPurchase.totalCost)}</strong>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setDetailPurchase(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
