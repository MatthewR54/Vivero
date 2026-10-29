import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP } from '../utils/currency';
import { exportToCSV } from '../utils/exportCSV';
import { getTodayString } from '../utils/calculations';
import { Plus, Search, Download, X, FileText, Palette, Sparkles } from 'lucide-react';
import colibriLogo from '../assets/colibri_logo.png';
import './Sales.css';

const PAYMENT_METHODS = ['Todos los métodos', 'Efectivo', 'Nequi', 'Bancolombia'];

export default function Sales() {
  const { sales, customMerchOrders, showToast } = useAppData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('Todos los métodos');
  const [ticketModal, setTicketModal] = useState(null);
  const [merchHistoryOpen, setMerchHistoryOpen] = useState(false);

  const filtered = sales.filter(sale => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q ||
      sale.id.toLowerCase().includes(q) ||
      sale.customer.name.toLowerCase().includes(q) ||
      (sale.customer.document && sale.customer.document.toLowerCase().includes(q)) ||
      (sale.items && sale.items.some(i => i.name?.toLowerCase().includes(q)));

    const matchMethod = methodFilter === 'Todos los métodos' ||
      sale.paymentMethod === methodFilter;

    return matchSearch && matchMethod;
  });

  const handleExport = () => {
    const headers = [
      'ID Venta',
      'Fecha',
      'Hora',
      'Canal',
      'Cliente',
      'Documento',
      'Productos',
      'Método de Pago',
      'Descuento (COP)',
      'Total (COP)'
    ];
    const rows = filtered.map(s => [
      s.id,
      s.date,
      s.time,
      s.channel || 'PRESENCIAL',
      s.customer.name,
      s.customer.document || 'Sin datos',
      s.items.map(i => `${i.quantity}× ${i.name}`).join(' | '),
      s.paymentMethod,
      s.discount || 0,
      s.total
    ]);
    exportToCSV(`ventas_vivero_colibri_${getTodayString()}.csv`, headers, rows);
  };

  // Exportar Reporte de Merchandising Personalizado (RF-129)
  const handleExportMerchCSV = () => {
    const headers = [
      'Comprobante',
      'Fecha',
      'Cliente',
      'Producto Base',
      'Unidades',
      'Talla / Formato',
      'Color',
      'Técnica',
      'Diseño / Especificación',
      'Costo Base Unit. (COP)',
      'Costo Personalización Unit. (COP)',
      'Costo Total Unit. (COP)',
      'Precio Venta Unit. (COP)',
      'Total Venta (COP)',
      'Ganancia Estimada Total (COP)',
      'Margen (%)'
    ];
    const rows = (customMerchOrders || []).map(o => [
      o.saleId || 'Cotización',
      o.date,
      o.customerName,
      o.productName,
      o.units,
      o.size,
      o.color,
      o.technique,
      o.designNotes,
      o.baseCost,
      o.customCost,
      o.totalUnitCost,
      o.finalUnitPrice,
      o.totalSaleAmount,
      o.estimatedProfit,
      `${o.marginPercent}%`
    ]);
    exportToCSV(`merchandising_personalizado_${getTodayString()}.csv`, headers, rows);
    if (showToast) {
      showToast('Reporte de merchandising personalizado exportado a CSV', 'success');
    }
  };

  const merchStats = useMemo(() => {
    const list = customMerchOrders || [];
    const totalUnits = list.reduce((sum, o) => sum + (Number(o.units) || 0), 0);
    const totalRevenue = list.reduce((sum, o) => sum + (Number(o.totalSaleAmount) || 0), 0);
    const totalCost = list.reduce((sum, o) => sum + ((Number(o.totalUnitCost) || 0) * (Number(o.units) || 1)), 0);
    const totalProfit = list.reduce((sum, o) => sum + (Number(o.estimatedProfit) || 0), 0);
    return { count: list.length, totalUnits, totalRevenue, totalCost, totalProfit };
  }, [customMerchOrders]);

  const totalDayAmount = sales.reduce((sum, s) => sum + s.total, 0);
  const avgTicket = sales.length > 0 ? Math.round(totalDayAmount / sales.length) : 0;
  const avgProducts = sales.length > 0
    ? (sales.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.quantity, 0), 0) / sales.length).toFixed(1)
    : '0';

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1>Módulo de Ventas & Facturación</h1>
          <p>Control de transacciones, tickets emitidos, merchandising personalizado y registro de ingresos en caja</p>
        </div>
        <div className="page-header-right" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline sales-merch-history-btn"
            onClick={() => setMerchHistoryOpen(true)}
          >
            <Palette size={16} /> Historial Merch Personalizado ({merchStats.count})
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/ventas/nueva')}>
            <Plus size={16} /> Registrar Venta
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Ventas registradas</div>
          <div className="kpi-value">{formatCOP(totalDayAmount)}</div>
          <div className="kpi-sub">{sales.length} comprobantes emitidos</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ticket Promedio</div>
          <div className="kpi-value">{formatCOP(avgTicket)}</div>
          <div className="kpi-sub">{avgProducts} productos / venta</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Medio más usado</div>
          <div className="kpi-value blue">Nequi / Transferencia</div>
          <div className="kpi-sub">58% del volumen total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Merchandising Personalizado</div>
          <div className="kpi-value purple">{merchStats.totalUnits} unidades</div>
          <div className="kpi-sub">
            Ganancia est.: {formatCOP(merchStats.totalProfit)} ({merchStats.count} pedidos)
          </div>
        </div>
      </div>

      {/* Filters & Table */}
      <div className="card">
        <div className="sales-filters">
          <div className="sales-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="input-field"
              placeholder="Buscar por # de comprobante, cliente, cédula o producto vendido..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Buscar ventas"
            />
          </div>
          <div className="sales-filter-right">
            <button className="chip active">Hoy</button>
            <select
              className="input-field sales-method-select"
              value={methodFilter}
              onChange={e => setMethodFilter(e.target.value)}
              aria-label="Filtrar por método de pago"
            >
              {PAYMENT_METHODS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button className="btn btn-dark" onClick={handleExport}>
              <Download size={14} /> Exportar
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          {filtered.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Venta</th>
                  <th>Fecha / Hora</th>
                  <th>Cliente Registrado</th>
                  <th>Resumen Productos</th>
                  <th>Método / Canal</th>
                  <th>Total</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sale => (
                  <tr key={sale.id}>
                    <td><span className="sale-id">{sale.id}</span></td>
                    <td className="td-muted">
                      {sale.date === getTodayString() ? 'Hoy' : sale.date}, {sale.time}
                    </td>
                    <td>
                      {sale.customer.name}
                      {sale.customer.document && (
                        <span className="td-doc"> (CC {sale.customer.document})</span>
                      )}
                      {!sale.customer.document && (
                        <span className="td-doc"> (Sin datos)</span>
                      )}
                    </td>
                    <td>{sale.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</td>
                    <td>
                      <div>{sale.paymentMethod}</div>
                      <span className={`sales-channel-pill ${sale.channel === 'VIRTUAL' ? 'virtual' : 'presencial'}`}>
                        {sale.channel === 'VIRTUAL' ? 'Virtual' : 'Presencial'}
                      </span>
                    </td>
                    <td className="td-total">{formatCOP(sale.total)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline sale-ticket-btn"
                        onClick={() => setTicketModal(sale)}
                      >
                        <FileText size={13} /> Ver Ticket
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>No se encontraron resultados para la búsqueda.</p>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Modal (RF-58, RF-60, RF-74) */}
      {ticketModal && (
        <div className="modal-overlay" onClick={() => setTicketModal(null)}>
          <div className="modal-content ticket-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-title ticket-header-brand">
                <img src={colibriLogo} alt="Vivero Colibrí" className="ticket-logo" />
                <div>
                  <h3>Ticket de Venta {ticketModal.id}</h3>
                  <p>Vivero Colibrí • Comprobante de transacción</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setTicketModal(null)} aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="ticket-row">
                <span className="ticket-label">Número:</span>
                <span className="ticket-val">{ticketModal.id}</span>
              </div>
              <div className="ticket-row">
                <span className="ticket-label">Fecha:</span>
                <span className="ticket-val">{ticketModal.date} - {ticketModal.time}</span>
              </div>
              <div className="ticket-row">
                <span className="ticket-label">Cliente:</span>
                <span className="ticket-val">{ticketModal.customer.name}</span>
              </div>
              <div className="ticket-row">
                <span className="ticket-label">Método / Canal:</span>
                <span className="ticket-val">
                  {ticketModal.paymentMethod} ({ticketModal.channel === 'VIRTUAL' ? 'Venta Virtual' : 'Presencial'})
                </span>
              </div>
              <div className="ticket-divider"></div>
              <div className="ticket-items-header">Productos y Especificaciones:</div>
              {ticketModal.items.map((item, idx) => (
                <div key={idx} className="ticket-item-block">
                  <div className="ticket-item-row">
                    <span>{item.quantity}× {item.baseName || item.name}</span>
                    <span>{formatCOP(item.subtotal)}</span>
                  </div>
                  {item.customization && (
                    <div className="ticket-custom-spec">
                      🎨 <strong>Personalización:</strong> {item.customization.size} • {item.customization.color} • {item.customization.technique}
                      <br />
                      <em>Diseño: "{item.customization.designNotes}"</em>
                    </div>
                  )}
                </div>
              ))}
              <div className="ticket-divider"></div>
              {Number(ticketModal.discount) > 0 && (
                <>
                  <div className="ticket-row">
                    <span className="ticket-label">Subtotal:</span>
                    <span className="ticket-val">{formatCOP(ticketModal.subtotal || (ticketModal.total + ticketModal.discount))}</span>
                  </div>
                  <div className="ticket-row">
                    <span className="ticket-label">Descuento aplicado:</span>
                    <span className="ticket-val" style={{ color: 'var(--danger)' }}>
                      -{formatCOP(ticketModal.discount)}
                    </span>
                  </div>
                </>
              )}
              <div className="ticket-total-row">
                <span>TOTAL</span>
                <span className="ticket-total-val">{formatCOP(ticketModal.total)}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setTicketModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: HISTORIAL DE MERCHANDISING PERSONALIZADO (RF-59, RF-60, RF-129)
          ============================================================ */}
      {merchHistoryOpen && (
        <div className="modal-overlay" onClick={() => setMerchHistoryOpen(false)}>
          <div className="modal-card sales-merch-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  <Sparkles size={18} style={{ verticalAlign: 'middle', marginRight: 6, color: '#7e22ce' }} />
                  Historial y Costeo de Merchandising Personalizado (RF-59, RF-60)
                </h3>
                <p className="modal-subtitle">
                  Consulta el costo base, costos adicionales de personalización, precio final de venta y ganancia de cada artículo personalizado vendido.
                </p>
              </div>
              <button className="modal-close" onClick={() => setMerchHistoryOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="sales-merch-summary-grid">
                <div className="sales-merch-stat-box">
                  <span>Unidades Personalizadas (RF-58)</span>
                  <strong>{merchStats.totalUnits} prendas / artículos</strong>
                </div>
                <div className="sales-merch-stat-box">
                  <span>Costo Total Acumulado (RF-56)</span>
                  <strong>{formatCOP(merchStats.totalCost)}</strong>
                </div>
                <div className="sales-merch-stat-box">
                  <span>Ventas Totales Personalizadas</span>
                  <strong>{formatCOP(merchStats.totalRevenue)}</strong>
                </div>
                <div className="sales-merch-stat-box highlight">
                  <span>Ganancia Neta Estimada (RF-57)</span>
                  <strong>{formatCOP(merchStats.totalProfit)}</strong>
                </div>
              </div>

              <div className="sales-merch-actions-bar">
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Mostrando {customMerchOrders.length} registros de personalización social
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-outline btn-sm" onClick={handleExportMerchCSV}>
                    <Download size={14} /> Exportar Reporte CSV (RF-129)
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      setMerchHistoryOpen(false);
                      navigate('/ventas/nueva');
                    }}
                  >
                    <Plus size={14} /> Nueva Cotización / Venta
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Comprobante / Fecha</th>
                      <th>Cliente</th>
                      <th>Producto & Unidades</th>
                      <th>Especificaciones de Personalización (RF-53)</th>
                      <th>Costo Base + Pers. = Total (RF-56)</th>
                      <th>Precio Venta Final (RF-55)</th>
                      <th>Ganancia & Margen (RF-57, RF-59)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customMerchOrders.map(order => (
                      <tr key={order.id}>
                        <td>
                          <div className="sale-id">{order.saleId || 'Directo'}</div>
                          <div className="td-muted">{order.date}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>{order.customerName}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{order.productName}</div>
                          <span className="sales-merch-units-badge">{order.units} unidad{order.units !== 1 ? 'es' : ''}</span>
                        </td>
                        <td>
                          <div style={{ fontSize: '12px', fontWeight: 600 }}>
                            {order.size} • {order.color} • {order.technique}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            "{order.designNotes}"
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700 }}>{formatCOP(order.totalUnitCost)} / ud</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Base: {formatCOP(order.baseCost)} + Pers.: {formatCOP(order.customCost)}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--green-primary)' }}>
                            {formatCOP(order.totalSaleAmount)}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {formatCOP(order.finalUnitPrice)} / ud
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--green-primary)' }}>
                            +{formatCOP(order.estimatedProfit)}
                          </div>
                          <span className="badge badge-green" style={{ fontSize: '10px' }}>
                            Margen {order.marginPercent}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {customMerchOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                          No hay productos personalizados registrados todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setMerchHistoryOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
