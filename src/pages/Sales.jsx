import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP } from '../utils/currency';
import { exportToCSV } from '../utils/exportCSV';
import { Plus, Search, Download, X, FileText } from 'lucide-react';
import colibriLogo from '../assets/colibri_logo.png';
import './Sales.css';

const PAYMENT_METHODS = ['Todos los métodos', 'Efectivo', 'Nequi', 'Bancolombia'];

export default function Sales() {
  const { sales } = useAppData();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('Todos los métodos');
  const [ticketModal, setTicketModal] = useState(null);

  const filtered = sales.filter(sale => {
    const matchSearch = !search ||
      sale.id.toLowerCase().includes(search.toLowerCase()) ||
      sale.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      (sale.customer.document && sale.customer.document.includes(search));

    const matchMethod = methodFilter === 'Todos los métodos' ||
      sale.paymentMethod === methodFilter;

    return matchSearch && matchMethod;
  });

  const handleExport = () => {
    const rows = filtered.map(s => ({
      'ID Venta': s.id,
      'Fecha': s.date,
      'Hora': s.time,
      'Cliente': s.customer.name,
      'Documento': s.customer.document || 'Sin datos',
      'Productos': s.items.map(i => `${i.quantity}× ${i.name}`).join(', '),
      'Método de Pago': s.paymentMethod,
      'Total': s.total
    }));
    exportToCSV(rows, 'ventas_vivero_colibri.csv');
  };

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
          <p>Control de transacciones, tickets emitidos y registro de ingresos en caja</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-primary" onClick={() => navigate('/ventas/nueva')}>
            <Plus size={16} /> Registrar Venta
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Ventas del día (Hoy)</div>
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
          <div className="kpi-label">Clientes nuevos registrados</div>
          <div className="kpi-value purple">19 Clientes</div>
          <div className="kpi-sub">Fidelización comunitaria</div>
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
              placeholder="Buscar por # de comprobante, cliente o cédula..."
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
                  <th>Método de Pago</th>
                  <th>Total</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sale => (
                  <tr key={sale.id}>
                    <td><span className="sale-id">{sale.id}</span></td>
                    <td className="td-muted">Hoy, {sale.time}</td>
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
                    <td>{sale.paymentMethod}</td>
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

      {/* Ticket Modal */}
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
                <span className="ticket-label">Método:</span>
                <span className="ticket-val">{ticketModal.paymentMethod}</span>
              </div>
              <div className="ticket-divider"></div>
              <div className="ticket-items-header">Productos:</div>
              {ticketModal.items.map((item, idx) => (
                <div key={idx} className="ticket-item-row">
                  <span>{item.quantity}× {item.name}</span>
                  <span>{formatCOP(item.subtotal)}</span>
                </div>
              ))}
              <div className="ticket-divider"></div>
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
    </div>
  );
}
