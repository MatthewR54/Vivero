import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP } from '../utils/currency';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  CircleCheck,
  Store,
  Palette,
  X,
  Sparkles,
  Globe,
  Tag,
  Pencil
} from 'lucide-react';
import colibriLogo from '../assets/colibri_logo.png';
import './NewSale.css';

const CATEGORIES = [
  { key: 'all', label: 'Todos' },
  { key: 'vivero', label: 'Vivero & Plantas' },
  { key: 'merchandising', label: 'Merchandising' },
  { key: 'comestibles', label: 'Comestibles' }
];

const PAYMENT_METHODS = ['Efectivo', 'Nequi', 'Bancolombia'];

const SALE_CHANNELS = [
  { key: 'PRESENCIAL', label: 'Presencial en Vivero' },
  { key: 'VIRTUAL', label: 'Virtual (WhatsApp / Redes)' }
];

const SIZE_OPTIONS = [
  'Talla S',
  'Talla M',
  'Talla L',
  'Talla XL',
  'Talla XS',
  'Única / Estándar',
  'Pieza Artesanal'
];

const TECHNIQUE_PRESETS = [
  { label: 'Serigrafía Social (1-2 tintas)', cost: 10000 },
  { label: 'Estampado DTF / Full Color', cost: 12000 },
  { label: 'Bordado Comunitario', cost: 15000 },
  { label: 'Pintura Artesanal a Mano', cost: 8000 }
];

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
  const [saleChannel, setSaleChannel] = useState('PRESENCIAL');
  const [discountInput, setDiscountInput] = useState('');
  const [received, setReceived] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ---------- Cotizador de Merchandising Personalizado (RF-51 a RF-60) ----------
  const [merchModalOpen, setMerchModalOpen] = useState(false);
  const [editingCartItemId, setEditingCartItemId] = useState(null);
  const [merchForm, setMerchForm] = useState({
    productId: '',
    units: 1,
    baseCost: 27000,
    customCost: 10000,
    finalUnitPrice: 55000,
    size: 'Talla M',
    color: 'Blanco Natural',
    technique: 'Serigrafía Social (1-2 tintas)',
    designNotes: ''
  });

  const merchProducts = useMemo(
    () => products.filter(p => p.active && (p.category === 'merchandising' || p.origin === 'Merchandising Social')),
    [products]
  );

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

  // Stock restante descontando todas las líneas del mismo productId en el carrito
  const getProductStock = useCallback((productId, ignoreCartItemId = null) => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    const inCartQty = cart
      .filter(c => c.productId === productId && c.cartItemId !== ignoreCartItemId)
      .reduce((sum, c) => sum + c.quantity, 0);
    return Math.max(0, product.stock - inCartQty);
  }, [products, cart]);

  const addToCart = (product) => {
    const remaining = getProductStock(product.id);
    if (remaining <= 0) {
      showToast('No hay stock suficiente para este producto', 'error');
      return;
    }

    setCart(prev => {
      // Buscar línea estándar (sin personalización) del mismo producto
      const existing = prev.find(c => c.productId === product.id && !c.customization);
      if (existing) {
        return prev.map(c =>
          c.cartItemId === existing.cartItemId
            ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * c.unitPrice }
            : c
        );
      }
      return [
        ...prev,
        {
          cartItemId: `std-${product.id}`,
          productId: product.id,
          baseName: product.name,
          name: product.name,
          quantity: 1,
          unitPrice: product.price,
          unitCost: product.cost,
          subtotal: product.price,
          maxStock: product.stock,
          customization: null
        }
      ];
    });
  };

  // Abrir Cotizador de Merchandising para crear o editar una línea personalizada
  const openMerchCustomizer = (product = null, existingCartItem = null) => {
    if (existingCartItem && existingCartItem.customization) {
      const cust = existingCartItem.customization;
      setEditingCartItemId(existingCartItem.cartItemId);
      setMerchForm({
        productId: existingCartItem.productId,
        units: existingCartItem.quantity,
        baseCost: cust.baseCost,
        customCost: cust.customCost,
        finalUnitPrice: existingCartItem.unitPrice,
        size: cust.size || 'Talla M',
        color: cust.color || 'Blanco Natural',
        technique: cust.technique || 'Serigrafía Social (1-2 tintas)',
        designNotes: cust.designNotes || ''
      });
      setMerchModalOpen(true);
      return;
    }

    const targetProd = product || merchProducts[0] || products.find(p => p.active);
    if (!targetProd) {
      showToast('No hay productos disponibles para personalizar', 'error');
      return;
    }

    const defaultBaseCost = Number(targetProd.cost) || 25000;
    const defaultCustomCost = 10000;
    const defaultFinalPrice = Math.max(
      Number(targetProd.price) + defaultCustomCost,
      defaultBaseCost + defaultCustomCost + 15000
    );

    setEditingCartItemId(null);
    setMerchForm({
      productId: targetProd.id,
      units: 1,
      baseCost: defaultBaseCost,
      customCost: defaultCustomCost,
      finalUnitPrice: defaultFinalPrice,
      size: 'Talla M',
      color: 'Blanco Natural',
      technique: 'Serigrafía Social (1-2 tintas)',
      designNotes: 'Logo Comunitario en pecho'
    });
    setMerchModalOpen(true);
  };

  const merchCalc = useMemo(() => {
    const units = Math.max(1, Math.floor(Number(merchForm.units) || 1));
    const baseCost = Math.max(0, Number(merchForm.baseCost) || 0);
    const customCost = Math.max(0, Number(merchForm.customCost) || 0);
    const totalUnitCost = baseCost + customCost;
    const totalOrderCost = totalUnitCost * units;
    const finalUnitPrice = Math.max(0, Number(merchForm.finalUnitPrice) || 0);
    const totalSalePrice = finalUnitPrice * units;
    const unitProfit = finalUnitPrice - totalUnitCost;
    const totalProfit = unitProfit * units;
    const marginPercent = finalUnitPrice > 0
      ? Math.round((unitProfit / finalUnitPrice) * 1000) / 10
      : 0;

    const availableStock = getProductStock(merchForm.productId, editingCartItemId);

    return {
      units,
      baseCost,
      customCost,
      totalUnitCost,
      totalOrderCost,
      finalUnitPrice,
      totalSalePrice,
      unitProfit,
      totalProfit,
      marginPercent,
      availableStock
    };
  }, [merchForm, editingCartItemId, getProductStock]);

  const handleSaveMerchToCart = () => {
    const targetProd = products.find(p => p.id === merchForm.productId);
    if (!targetProd) {
      showToast('Selecciona un producto base de merchandising', 'error');
      return;
    }
    if (merchCalc.units <= 0) {
      showToast('La cantidad de unidades personalizadas debe ser mayor a 0', 'error');
      return;
    }
    if (merchCalc.units > merchCalc.availableStock) {
      showToast(`Stock insuficiente para ${targetProd.name} (Disponible: ${merchCalc.availableStock} uds)`, 'error');
      return;
    }
    if (Number(merchForm.baseCost) <= 0) {
      showToast('El costo de prenda base debe ser mayor a $0 (RNF-16)', 'error');
      return;
    }
    if (Number(merchForm.customCost) < 0) {
      showToast('El costo de personalización no puede ser negativo (RNF-16)', 'error');
      return;
    }
    if (merchCalc.finalUnitPrice <= 0) {
      showToast('El precio final de venta debe ser mayor a $0 (RNF-16)', 'error');
      return;
    }
    if (!merchForm.designNotes.trim()) {
      showToast('Ingresa las características o notas de diseño de la personalización (RF-53)', 'error');
      return;
    }

    const specParts = [
      merchForm.size,
      merchForm.color,
      `${merchForm.technique}: ${merchForm.designNotes.trim()}`
    ].filter(Boolean);
    const displayName = `${targetProd.name} [${specParts.join(' • ')}]`;

    const customizationPayload = {
      size: merchForm.size,
      color: merchForm.color.trim(),
      technique: merchForm.technique,
      designNotes: merchForm.designNotes.trim(),
      baseCost: merchCalc.baseCost,
      customCost: merchCalc.customCost,
      totalUnitCost: merchCalc.totalUnitCost,
      finalUnitPrice: merchCalc.finalUnitPrice,
      unitProfit: merchCalc.unitProfit,
      totalProfit: merchCalc.totalProfit,
      marginPercent: merchCalc.marginPercent,
      status: 'ENTREGADO'
    };

    if (editingCartItemId) {
      setCart(prev => prev.map(item =>
        item.cartItemId === editingCartItemId
          ? {
              ...item,
              productId: targetProd.id,
              baseName: targetProd.name,
              name: displayName,
              quantity: merchCalc.units,
              unitPrice: merchCalc.finalUnitPrice,
              unitCost: merchCalc.totalUnitCost,
              subtotal: merchCalc.units * merchCalc.finalUnitPrice,
              customization: customizationPayload
            }
          : item
      ));
      showToast('Personalización actualizada en el comprobante', 'success');
    } else {
      setCart(prev => [
        ...prev,
        {
          cartItemId: `cust-${targetProd.id}-${Date.now()}`,
          productId: targetProd.id,
          baseName: targetProd.name,
          name: displayName,
          quantity: merchCalc.units,
          unitPrice: merchCalc.finalUnitPrice,
          unitCost: merchCalc.totalUnitCost,
          subtotal: merchCalc.units * merchCalc.finalUnitPrice,
          maxStock: targetProd.stock,
          customization: customizationPayload
        }
      ]);
      showToast('Producto personalizado añadido al carrito', 'success');
    }

    setMerchModalOpen(false);
  };

  const updateCartQty = (cartItemId, delta) => {
    setCart(prev => prev.map(c => {
      if (c.cartItemId !== cartItemId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      const remainingOther = getProductStock(c.productId, c.cartItemId);
      if (newQty > remainingOther) {
        showToast('No hay stock suficiente', 'error');
        return c;
      }
      const updatedCustomization = c.customization
        ? {
            ...c.customization,
            totalProfit: (c.unitPrice - c.customization.totalUnitCost) * newQty
          }
        : null;
      return {
        ...c,
        quantity: newQty,
        subtotal: newQty * c.unitPrice,
        customization: updatedCustomization
      };
    }));
  };

  // RF-65 / RF-55: Permitir establecer o ajustar el precio final unitario de cada producto en la venta
  const updateCartUnitPrice = (cartItemId, newPriceValue) => {
    const priceNum = Math.max(0, Number(newPriceValue) || 0);
    setCart(prev => prev.map(c => {
      if (c.cartItemId !== cartItemId) return c;
      const updatedCustomization = c.customization
        ? {
            ...c.customization,
            finalUnitPrice: priceNum,
            unitProfit: priceNum - c.customization.totalUnitCost,
            totalProfit: (priceNum - c.customization.totalUnitCost) * c.quantity,
            marginPercent: priceNum > 0
              ? Math.round(((priceNum - c.customization.totalUnitCost) / priceNum) * 1000) / 10
              : 0
          }
        : null;
      return {
        ...c,
        unitPrice: priceNum,
        subtotal: c.quantity * priceNum,
        customization: updatedCustomization
      };
    }));
  };

  const removeFromCart = (cartItemId) => {
    setCart(prev => prev.filter(c => c.cartItemId !== cartItemId));
  };

  const cartSubtotal = cart.reduce((sum, c) => sum + c.subtotal, 0);
  const discountNum = Math.max(0, Math.min(cartSubtotal, Number(discountInput) || 0));
  const cartTotal = Math.max(0, cartSubtotal - discountNum);
  const receivedNum = parseFloat(String(received).replace(/\D/g, '')) || 0;
  const change = paymentMethod === 'Efectivo' ? Math.max(0, receivedNum - cartTotal) : 0;

  const handleConfirm = async () => {
    if (submitting) return;
    const newErrors = {};

    // RNF-16, RNF-17: Validaciones estrictas de negocio y formato de datos
    if (cart.length === 0) {
      newErrors.cart = 'Agrega al menos un producto a la venta';
    } else if (cart.some(c => !c.unitPrice || Number(c.unitPrice) <= 0)) {
      newErrors.cart = 'Todos los productos deben tener un precio unitario mayor a $0 (RNF-16)';
    } else if (cartTotal <= 0) {
      newErrors.cart = 'El total final de la venta debe ser mayor a $0';
    }

    const trimmedName = customer.name.trim();
    if (!trimmedName) {
      newErrors.name = 'El nombre del cliente es obligatorio';
    } else if (trimmedName.length < 3) {
      newErrors.name = 'El nombre del cliente debe tener al menos 3 caracteres';
    }

    const trimmedDoc = customer.document.trim();
    const docDigits = trimmedDoc.replace(/\D/g, '');
    if (!trimmedDoc) {
      newErrors.document = 'El documento o cédula del cliente es obligatorio';
    } else if (!/^[0-9.\-\s]+$/.test(trimmedDoc) || docDigits.length < 5 || docDigits.length > 15) {
      newErrors.document = 'Formato inválido: ingresa solo números (5 a 15 dígitos)';
    }

    const trimmedPhone = customer.phone.trim();
    if (trimmedPhone) {
      const phoneDigits = trimmedPhone.replace(/\D/g, '');
      if (!/^[0-9+\-\s()]+$/.test(trimmedPhone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
        newErrors.phone = 'Teléfono inválido: ingresa un número válido (7 a 15 dígitos)';
      }
    }

    const trimmedEmail = customer.email.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Ingresa un correo electrónico válido';
    }

    if (paymentMethod === 'Efectivo' && receivedNum < cartTotal) {
      newErrors.received = 'El monto recibido en efectivo es insuficiente para cubrir el total';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showToast('Revisa los campos marcados antes de emitir la venta', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const { saleId } = await addSale({
        customer: {
          document: customer.document.trim(),
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          email: customer.email.trim()
        },
        items: cart.map(c => ({
          productId: c.productId,
          baseName: c.baseName || c.name,
          name: c.name,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          unitCost: c.unitCost,
          subtotal: c.subtotal,
          customization: c.customization || null
        })),
        paymentMethod,
        channel: saleChannel,
        subtotal: cartSubtotal,
        discount: discountNum,
        total: cartTotal
      });

      showToast(`Venta ${saleId ?? ''} registrada correctamente`, 'success');
      navigate('/ventas');
    } catch (err) {
      showToast(`No se pudo registrar la venta: ${err.message}`, 'error');
      setSubmitting(false);
    }
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
          <img src={colibriLogo} alt="Vivero Colibrí" className="ns-header-logo" />
          <span className="ns-title">Registro de Nueva Venta & Cotizador de Merchandising</span>
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
                <div className="ns-catalog-header-right">
                  <button
                    type="button"
                    className="btn btn-sm ns-merch-quoter-trigger"
                    onClick={() => openMerchCustomizer()}
                  >
                    <Palette size={14} /> Cotizador Merch Personalizado
                  </button>
                  <span className="badge badge-green">Catálogo en tiempo real</span>
                </div>
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
                    const isMerch = p.category === 'merchandising' || p.origin === 'Merchandising Social';

                    return (
                      <div key={p.id} className={`ns-product-card ${isMerch ? 'ns-product-card-merch' : ''}`}>
                        <div className="ns-product-top-row">
                          <div className="ns-product-name">{p.name}</div>
                          {isMerch && <span className="ns-merch-pill">Personalizable</span>}
                        </div>
                        <div className="ns-product-price">{formatCOP(p.price)}</div>
                        <div className={`ns-product-stock ${stockClass}`}>
                          Stock: {remainingStock} uds
                        </div>
                        <div className="ns-product-sku">
                          {p.sku} • Costo base: {formatCOP(p.cost)}
                        </div>
                        <div className="ns-product-card-actions">
                          <button
                            className="btn btn-sm ns-add-btn"
                            onClick={() => addToCart(p)}
                            disabled={remainingStock <= 0}
                          >
                            <Plus size={14} /> Añadir
                          </button>
                          {isMerch && (
                            <button
                              type="button"
                              className="btn btn-sm ns-customize-btn"
                              onClick={() => openMerchCustomizer(p)}
                              disabled={remainingStock <= 0}
                              title="Abrir calculadora de personalización (RF-53 a RF-57)"
                            >
                              <Palette size={14} /> Personalizar
                            </button>
                          )}
                        </div>
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
                        inputMode="numeric"
                        className={`input-field ${errors.document ? 'error' : ''}`}
                        value={customer.document}
                        onChange={e => {
                          setCustomer({ ...customer, document: e.target.value });
                          if (errors.document) setErrors(prev => ({ ...prev, document: null }));
                        }}
                        placeholder="Ej: 1.114.890.342"
                      />
                      {customer.document && !errors.document && <CircleCheck size={16} className="ns-check-icon" />}
                    </div>
                    {errors.document && <div className="input-error">{errors.document}</div>}
                  </div>
                  <div className="input-group">
                    <label>Nombre Completo *</label>
                    <input
                      type="text"
                      className={`input-field ${errors.name ? 'error' : ''}`}
                      value={customer.name}
                      onChange={e => {
                        setCustomer({ ...customer, name: e.target.value });
                        if (errors.name) setErrors(prev => ({ ...prev, name: null }));
                      }}
                      placeholder="Nombre del cliente"
                    />
                    {errors.name && <div className="input-error">{errors.name}</div>}
                  </div>
                  <div className="input-group">
                    <label>Teléfono / WhatsApp</label>
                    <input
                      type="tel"
                      inputMode="tel"
                      className={`input-field ${errors.phone ? 'error' : ''}`}
                      value={customer.phone}
                      onChange={e => {
                        setCustomer({ ...customer, phone: e.target.value });
                        if (errors.phone) setErrors(prev => ({ ...prev, phone: null }));
                      }}
                      placeholder="+57 300 000 0000"
                    />
                    {errors.phone && <div className="input-error">{errors.phone}</div>}
                  </div>
                  <div className="input-group">
                    <label>Correo Electrónico (Para factura)</label>
                    <input
                      type="email"
                      className={`input-field ${errors.email ? 'error' : ''}`}
                      value={customer.email}
                      onChange={e => {
                        setCustomer({ ...customer, email: e.target.value });
                        if (errors.email) setErrors(prev => ({ ...prev, email: null }));
                      }}
                      placeholder="email@ejemplo.com"
                    />
                    {errors.email && <div className="input-error">{errors.email}</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Cart */}
            <div className="card">
              <div className="card-header">
                <div className="card-header-title">
                  Ítems en la Venta ({cart.length} línea{cart.length !== 1 ? 's' : ''})
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Puedes ajustar el precio final unitario si corresponde (RF-65)
                </span>
              </div>
              <div className="card-body">
                {cart.length === 0 ? (
                  <div className="empty-state">
                    <p>Agrega productos desde el catálogo o usa el Cotizador de Merchandising</p>
                    {errors.cart && <div className="input-error" style={{ marginTop: 8 }}>{errors.cart}</div>}
                  </div>
                ) : (
                  <div className="ns-cart-list">
                    {cart.map(item => (
                      <div key={item.cartItemId} className={`ns-cart-item ${item.customization ? 'ns-cart-item-custom' : ''}`}>
                        <div className="ns-cart-item-info">
                          <div>
                            <span className="ns-cart-item-qty">{item.quantity}×</span>
                            <span className="ns-cart-item-name">{item.baseName || item.name}</span>
                            {item.customization && (
                              <span className="ns-custom-badge">Personalizado</span>
                            )}
                          </div>

                          {item.customization && (
                            <div className="ns-cart-custom-details">
                              <div>
                                <strong>Especificación:</strong> {item.customization.size} • {item.customization.color} • {item.customization.technique} — <em>"{item.customization.designNotes}"</em>
                              </div>
                              <div className="ns-cart-custom-finance">
                                Costo base: {formatCOP(item.customization.baseCost)} + Pers.: {formatCOP(item.customization.customCost)} ={' '}
                                <strong>Costo total: {formatCOP(item.customization.totalUnitCost)}/ud</strong> •{' '}
                                <span className="ns-profit-tag">
                                  Ganancia est.: {formatCOP(item.customization.totalProfit)} ({item.customization.marginPercent}%)
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="ns-cart-price-edit" title="Precio unitario final pactado (RF-55, RF-65)">
                          <span className="ns-price-prefix">$</span>
                          <input
                            type="number"
                            min="100"
                            step="500"
                            className="ns-unit-price-input"
                            value={item.unitPrice}
                            onChange={e => updateCartUnitPrice(item.cartItemId, e.target.value)}
                            aria-label={`Precio unitario de ${item.name}`}
                          />
                        </div>

                        <div className="ns-cart-item-controls">
                          {item.customization && (
                            <button
                              type="button"
                              className="ns-qty-btn"
                              onClick={() => openMerchCustomizer(null, item)}
                              title="Editar personalización"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          <button
                            className="ns-qty-btn"
                            onClick={() => updateCartQty(item.cartItemId, -1)}
                            aria-label="Disminuir cantidad"
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            className="ns-qty-btn"
                            onClick={() => updateCartQty(item.cartItemId, 1)}
                            aria-label="Aumentar cantidad"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            className="ns-qty-btn ns-remove-btn"
                            onClick={() => removeFromCart(item.cartItemId)}
                            aria-label="Eliminar producto"
                          >
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

            {/* Payment Method, Sale Channel & Discount (RF-64, RF-67, RF-68) */}
            <div className="card">
              <div className="card-header">
                <div className="card-header-title">3. Forma de Pago, Canal y Descuento</div>
              </div>
              <div className="card-body">
                <div className="ns-payment-methods">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m}
                      type="button"
                      className={`ns-pay-btn ${paymentMethod === m ? 'active' : ''}`}
                      onClick={() => setPaymentMethod(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                <div className="ns-channel-discount-row">
                  <div className="input-group">
                    <label>
                      <Globe size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Canal de Venta (RF-68)
                    </label>
                    <select
                      className="input-field"
                      value={saleChannel}
                      onChange={e => setSaleChannel(e.target.value)}
                    >
                      {SALE_CHANNELS.map(ch => (
                        <option key={ch.key} value={ch.key}>{ch.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label>
                      <Tag size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                      Descuento Aplicado (COP) (RF-64)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      className="input-field"
                      placeholder="0"
                      value={discountInput}
                      onChange={e => setDiscountInput(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="ns-total-box">
              <div className="ns-total-left">
                <div className="ns-total-label">TOTAL A COBRAR</div>
                <div className="ns-total-value">{formatCOP(cartTotal)} COP</div>
                {discountNum > 0 && (
                  <div className="ns-subtotal-breakdown">
                    Subtotal: {formatCOP(cartSubtotal)} − Descuento: {formatCOP(discountNum)}
                  </div>
                )}
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
            <button
              className="btn btn-primary btn-lg btn-block ns-confirm-btn"
              onClick={handleConfirm}
              disabled={submitting}
            >
              <CircleCheck size={18} /> {submitting ? 'Registrando venta...' : 'Confirmar y Emitir Venta'}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          MODAL: COTIZADOR DE MERCHANDISING PERSONALIZADO (RF-51 a RF-60)
          ============================================================ */}
      {merchModalOpen && (
        <div className="modal-overlay" onClick={() => setMerchModalOpen(false)}>
          <div className="modal-card ns-merch-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  <Sparkles size={18} style={{ verticalAlign: 'middle', marginRight: 6, color: '#7e22ce' }} />
                  Cotizador de Merchandising Personalizado
                </h3>
                <p className="modal-subtitle">
                  Calcula el costo total (prenda base + personalización), fija el precio final pactado y proyecta la ganancia antes de facturar.
                </p>
              </div>
              <button className="modal-close" onClick={() => setMerchModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Tarjeta resumen financiero de la personalización (RF-56, RF-57, RF-59) */}
              <div className="ns-merch-summary-banner">
                <div>
                  <span className="ns-merch-banner-label">Costo Total Unitario (RF-56)</span>
                  <div className="ns-merch-banner-val">{formatCOP(merchCalc.totalUnitCost)}</div>
                  <span className="ns-merch-banner-sub">
                    Base {formatCOP(merchCalc.baseCost)} + Pers. {formatCOP(merchCalc.customCost)}
                  </span>
                </div>
                <div>
                  <span className="ns-merch-banner-label">Precio Venta Final ({merchCalc.units} uds)</span>
                  <div className="ns-merch-banner-val">{formatCOP(merchCalc.totalSalePrice)}</div>
                  <span className="ns-merch-banner-sub">
                    {formatCOP(merchCalc.finalUnitPrice)} por unidad
                  </span>
                </div>
                <div>
                  <span className="ns-merch-banner-label">Ganancia Estimada (RF-57)</span>
                  <div className={`ns-merch-banner-val ${merchCalc.totalProfit >= 0 ? 'positive' : 'negative'}`}>
                    {formatCOP(merchCalc.totalProfit)} ({merchCalc.marginPercent}%)
                  </div>
                  <span className="ns-merch-banner-sub">
                    {formatCOP(merchCalc.unitProfit)} de ganancia / ud
                  </span>
                </div>
              </div>

              <div className="ns-merch-form-grid">
                <div className="form-group ns-col-span-2">
                  <label className="form-label">Artículo / Prenda Base de Merchandising (RF-51, RF-52) *</label>
                  <select
                    className="input-field"
                    value={merchForm.productId}
                    onChange={e => {
                      const prod = products.find(p => p.id === e.target.value);
                      if (prod) {
                        const bCost = Number(prod.cost) || 25000;
                        const cCost = Number(merchForm.customCost) || 10000;
                        setMerchForm(prev => ({
                          ...prev,
                          productId: prod.id,
                          baseCost: bCost,
                          finalUnitPrice: Number(prod.price) + cCost
                        }));
                      }
                    }}
                  >
                    {merchProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name} (Precio base catálogo: {formatCOP(p.price)} | Costo base: {formatCOP(p.cost)} | Stock: {getProductStock(p.id, editingCartItemId)} uds)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Cantidad de Unidades Personalizadas (RF-58) *</label>
                  <input
                    type="number"
                    min="1"
                    max={merchCalc.availableStock || 99}
                    className="input-field"
                    value={merchForm.units}
                    onChange={e => setMerchForm({ ...merchForm, units: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Talla / Presentación (RF-53)</label>
                  <select
                    className="input-field"
                    value={merchForm.size}
                    onChange={e => setMerchForm({ ...merchForm, size: e.target.value })}
                  >
                    {SIZE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Color / Acabado de la Prenda</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ej. Blanco Natural, Verde Vivero, Crudo..."
                    value={merchForm.color}
                    onChange={e => setMerchForm({ ...merchForm, color: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Técnica de Personalización</label>
                  <select
                    className="input-field"
                    value={merchForm.technique}
                    onChange={e => {
                      const preset = TECHNIQUE_PRESETS.find(t => t.label === e.target.value);
                      setMerchForm(prev => ({
                        ...prev,
                        technique: e.target.value,
                        customCost: preset ? preset.cost : prev.customCost
                      }));
                    }}
                  >
                    {TECHNIQUE_PRESETS.map(t => (
                      <option key={t.label} value={t.label}>
                        {t.label} (+{formatCOP(t.cost)} sugerido)
                      </option>
                    ))}
                    <option value="Personalización Especial / Mixta">Personalización Especial / Mixta</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Costo Base de la Prenda / Artículo (COP) *</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="input-field"
                    value={merchForm.baseCost}
                    onChange={e => setMerchForm({ ...merchForm, baseCost: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Costo Adicional de Personalización / Estampado (RF-54) *</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    className="input-field"
                    value={merchForm.customCost}
                    onChange={e => setMerchForm({ ...merchForm, customCost: e.target.value })}
                  />
                </div>

                <div className="form-group ns-col-span-2">
                  <label className="form-label">
                    Precio de Venta Unitario Final Pactado con el Cliente (COP) (RF-55) *
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="500"
                    className="input-field"
                    value={merchForm.finalUnitPrice}
                    onChange={e => setMerchForm({ ...merchForm, finalUnitPrice: e.target.value })}
                  />
                </div>

                <div className="form-group ns-col-span-2">
                  <label className="form-label">
                    Características Específicas y Notas de Diseño para el Comprobante (RF-53, RF-60) *
                  </label>
                  <textarea
                    rows={2}
                    className="input-field"
                    placeholder="Ej. Logo Colibrí Comunitario en pecho izquierdo + ilustración botánica en espalda..."
                    value={merchForm.designNotes}
                    onChange={e => setMerchForm({ ...merchForm, designNotes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setMerchModalOpen(false)}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleSaveMerchToCart}>
                <Palette size={15} />{' '}
                {editingCartItemId ? 'Actualizar Personalización' : 'Añadir Personalización a la Venta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
