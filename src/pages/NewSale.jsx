import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP } from '../utils/currency';
import { ArrowLeft, Search, Plus, Minus, Trash2, CircleCheck, Store } from 'lucide-react';
import './NewSale.css';

const CATEGORIES = [
  { key: 'all', label: 'Todos' },
  { key: 'vivero', label: 'Vivero & Plantas' },
  { key: 'merchandising', label: 'Merchandising' },
  { key: 'comestibles', label: 'Comestibles' }
];

const PAYMENT_METHODS = ['Efectivo', 'Nequi', 'Bancolombia'];

export default function NewSale() {
  const { products, addSale, showToast } = useAppData();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({
    document: '1.114.890.342',
    name: 'Carlos Mendoza',
    phone: '+57 315 890 4422',
    email: 'carlos.mendoza@email.com'
  });
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [received, setReceived] = useState('');
  const [errors, setErrors] = useState({});

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.active) return false;
      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, categoryFilter, searchTerm]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(c => c.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          showToast('No hay stock suficiente', 'error');
          return prev;
        }
        return prev.map(c =>
          c.productId === product.id
            ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.unitPrice }
            : c
        );
      }
      if (product.stock <= 0) {
        showToast('No hay stock suficiente', 'error');
        return prev;
      }
      return [...prev, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
        subtotal: product.price,
        maxStock: product.stock
      }];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => prev.map(c => {
      if (c.productId !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      if (newQty > c.maxStock) {
        showToast('No hay stock suficiente', 'error');
        return c;
      }
      return { ...c, quantity: newQty, subtotal: newQty * c.unitPrice };
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(c => c.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.subtotal, 0);
  const receivedNum = parseFloat(received.replace(/\D/g, '')) || 0;
  const change = paymentMethod === 'Efectivo' ? Math.max(0, receivedNum - cartTotal) : 0;

  const getProductStock = (productId) => {
    const inCart = cart.find(c => c.productId === productId);
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    return product.stock - (inCart ? inCart.quantity : 0);
  };

  const handleConfirm = () => {
    const newErrors = {};
    if (cart.length === 0) newErrors.cart = 'Agrega al menos un producto';
    if (!customer.name.trim()) newErrors.name = 'Nombre requerido';
    if (paymentMethod === 'Efectivo' && receivedNum < cartTotal) {
      newErrors.received = 'El monto recibido es insuficiente';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showToast('Completa los campos obligatorios', 'error');
      return;
    }

    addSale({
      customer: {
        document: customer.document,
        name: customer.name
      },
      items: cart.map(c => ({
        productId: c.productId,
        name: c.name,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        subtotal: c.subtotal
      })),
      paymentMethod,
      total: cartTotal
    });

    showToast('Venta registrada correctamente', 'success');
    navigate('/ventas');
  };

  return (
    <div className="new-sale-page">
      {/* Custom header */}
      <div className="new-sale-header">
        <div className="new-sale-header-left">
          <button className="ns-back-btn" onClick={() => navigate('/ventas')}>
            <ArrowLeft size={16} /> Volver a Ventas
          </button>
          <span className="ns-divider">|</span>
          <span className="ns-title">Registro de Nueva Venta • Confirmación</span>
        </div>
        <div className="ns-caja-badge">
          <Store size={14} /> CAJA #01 ABIERTA
        </div>
      </div>

      <div className="new-sale-body">
        <div className="ns-two-col">
          {/* Left Column - Product Selection */}
          <div className="ns-left">
            <div className="card">
              <div className="card-header">
                <div className="card-header-title">1. Selección de Productos</div>
                <span className="badge badge-green">Catálogo en tiempo real</span>
              </div>
              <div className="card-body">
                <div className="ns-search-row">
                  <div className="ns-search-input">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Escanear código o escribir nombre del producto..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      aria-label="Buscar producto"
                    />
                  </div>
                  <button className="btn btn-primary btn-sm">Buscar</button>
                </div>

                <div className="chip-group ns-chips">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.key}
                      className={`chip ${categoryFilter === c.key ? 'active' : ''}`}
                      onClick={() => setCategoryFilter(c.key)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="ns-products-grid">
                  {filteredProducts.map(p => {
                    const remainingStock = getProductStock(p.id);
                    const stockClass = remainingStock <= p.minStock * 0.5 ? 'stock-critical' :
                      remainingStock <= p.minStock + 5 ? 'stock-warning' : 'stock-ok';
                    return (
                      <div key={p.id} className="ns-product-card">
                        <div className="ns-product-name">{p.name}</div>
                        <div className="ns-product-price">{formatCOP(p.price)}</div>
                        <div className={`ns-product-stock ${stockClass}`}>
                          Stock: {remainingStock} uds
                        </div>
                        <div className="ns-product-sku">{p.sku}</div>
                        <button
                          className="btn btn-sm ns-add-btn"
                          onClick={() => addToCart(p)}
                          disabled={remainingStock <= 0}
                        >
                          <Plus size={14} /> Añadir
                        </button>
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                      <p>No se encontraron productos.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="ns-right">
            {/* Customer Data */}
            <div className="card">
              <div className="card-header">
                <div className="card-header-title">2. Toma de Datos del Cliente</div>
                <span className="badge badge-blue">Cliente Frecuente</span>
              </div>
              <div className="card-body">
                <div className="ns-form-grid">
                  <div className="input-group">
                    <label>Documento / Cédula *</label>
                    <div className="ns-doc-input">
                      <input
                        type="text"
                        className="input-field"
                        value={customer.document}
                        onChange={e => setCustomer({ ...customer, document: e.target.value })}
                        placeholder="Número de documento"
                      />
                      {customer.document && <CircleCheck size={16} className="ns-check-icon" />}
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Nombre Completo *</label>
                    <input
                      type="text"
                      className={`input-field ${errors.name ? 'error' : ''}`}
                      value={customer.name}
                      onChange={e => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="Nombre del cliente"
                    />
                    {errors.name && <div className="input-error">{errors.name}</div>}
                  </div>
                  <div className="input-group">
                    <label>Teléfono / WhatsApp</label>
                    <input
                      type="text"
                      className="input-field"
                      value={customer.phone}
                      onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="+57 300 000 0000"
                    />
                  </div>
                  <div className="input-group">
                    <label>Correo Electrónico (Para factura)</label>
                    <input
                      type="email"
                      className="input-field"
                      value={customer.email}
                      onChange={e => setCustomer({ ...customer, email: e.target.value })}
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cart */}
            <div className="card">
              <div className="card-header">
                <div className="card-header-title">
                  Ítems en la Venta ({cart.length} producto{cart.length !== 1 ? 's' : ''})
                </div>
              </div>
              <div className="card-body">
                {cart.length === 0 ? (
                  <div className="empty-state">
                    <p>Agrega productos desde el catálogo</p>
                    {errors.cart && <div className="input-error" style={{marginTop: 8}}>{errors.cart}</div>}
                  </div>
                ) : (
                  <div className="ns-cart-list">
                    {cart.map(item => (
                      <div key={item.productId} className="ns-cart-item">
                        <div className="ns-cart-item-info">
                          <span className="ns-cart-item-qty">{item.quantity}×</span>
                          <span className="ns-cart-item-name">{item.name}</span>
                        </div>
                        <div className="ns-cart-item-controls">
                          <button className="ns-qty-btn" onClick={() => updateCartQty(item.productId, -1)} aria-label="Disminuir cantidad">
                            <Minus size={14} />
                          </button>
                          <button className="ns-qty-btn" onClick={() => updateCartQty(item.productId, 1)} aria-label="Aumentar cantidad">
                            <Plus size={14} />
                          </button>
                          <button className="ns-qty-btn ns-remove-btn" onClick={() => removeFromCart(item.productId)} aria-label="Eliminar producto">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="ns-cart-item-subtotal">{formatCOP(item.subtotal)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="card">
              <div className="card-header">
                <div className="card-header-title">Forma de Pago</div>
              </div>
              <div className="card-body">
                <div className="ns-payment-methods">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m}
                      className={`ns-pay-btn ${paymentMethod === m ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="ns-total-box">
              <div className="ns-total-left">
                <div className="ns-total-label">TOTAL A COBRAR</div>
                <div className="ns-total-value">{formatCOP(cartTotal)} COP</div>
              </div>
              {paymentMethod === 'Efectivo' && (
                <div className="ns-total-right">
                  <div className="input-group">
                    <label>Recibido:</label>
                    <input
                      type="text"
                      className={`input-field ns-received-input ${errors.received ? 'error' : ''}`}
                      value={received}
                      onChange={e => setReceived(e.target.value)}
                      placeholder="$0"
                    />
                    {errors.received && <div className="input-error">{errors.received}</div>}
                  </div>
                  <div className="ns-change">
                    Cambio: <strong>{formatCOP(change)}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Button */}
            <button className="btn btn-primary btn-lg btn-block ns-confirm-btn" onClick={handleConfirm}>
              <CircleCheck size={18} /> Confirmar y Emitir Venta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
