import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP } from '../utils/currency';
import { calculateMargin, generateSKU } from '../utils/calculations';
import { ArrowLeft, Save, X, Truck } from 'lucide-react';
import './NewProduct.css';

const ORIGINS = [
  { value: 'vivero', label: '🌿 Producción Propia de Vivero', origin: 'Producción Vivero' },
  { value: 'merchandising', label: '🎨 Merchandising Social', origin: 'Merchandising Social' },
  { value: 'comestibles', label: '🏪 Adquirido (Distribuidora)', origin: 'Adquirido (Distribuidora)' }
];

export default function NewProduct() {
  const { addProduct, suppliers, showToast, nextProductId } = useAppData();
  const navigate = useNavigate();

  const activeSuppliers = useMemo(
    () => (suppliers || []).filter(s => s.active !== false),
    [suppliers]
  );

  const [form, setForm] = useState({
    category: 'vivero',
    name: 'Bonsái Ficus Retusa 3 Años',
    description: 'Planta de interior, riego moderado dos veces por semana, requiere luz indirecta filtrada.',
    stock: 15,
    minStock: 5,
    unit: 'Unidad / Maceta de Cerámica',
    location: 'Estante A-04 • Zona Climatizada',
    cost: 28000,
    price: 65000,
    supplierId: ''
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const autoSku = useMemo(() => {
    const num = nextProductId[form.category] || 1;
    return generateSKU(form.category, num);
  }, [form.category, nextProductId]);

  const selectedOrigin = ORIGINS.find(o => o.value === form.category);
  const margin = calculateMargin(form.price, form.cost);

  const handleChange = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Si selecciona origen "Adquirido" (comestibles) y aún no tiene proveedor, preseleccionar el primero activo
      if (field === 'category' && value === 'comestibles' && !prev.supplierId && activeSuppliers.length > 0) {
        next.supplierId = String(activeSuppliers[0].id);
      }
      return next;
    });
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Nombre requerido';
    if (!form.stock && form.stock !== 0) newErrors.stock = 'Stock requerido';
    if (!form.cost) newErrors.cost = 'Costo requerido';
    if (!form.price) newErrors.price = 'Precio requerido';
    if (form.category === 'comestibles' && !form.supplierId && activeSuppliers.length > 0) {
      newErrors.supplierId = 'Selecciona el proveedor distribuidor para productos adquiridos';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showToast('Completa los campos obligatorios', 'error');
      return;
    }

    setSaving(true);
    try {
      await addProduct({
        sku: autoSku,
        name: form.name,
        category: form.category,
        origin: selectedOrigin?.origin || '',
        stock: parseInt(form.stock, 10),
        minStock: parseInt(form.minStock, 10),
        cost: parseInt(form.cost, 10),
        price: parseInt(form.price, 10),
        unit: form.unit,
        location: form.location,
        description: form.description,
        supplierId: form.supplierId ? Number(form.supplierId) : null
      });

      showToast('Producto agregado al catálogo', 'success');
      navigate('/inventario');
    } catch (err) {
      showToast(`No se pudo guardar el producto: ${err.message}`, 'error');
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <button className="btn btn-ghost np-back" onClick={() => navigate('/inventario')}>
        <ArrowLeft size={16} /> Volver
      </button>

      <div className="page-header">
        <div className="page-header-left">
          <h1>Registrar Nuevo Producto en Catálogo</h1>
          <p>Formulario estructurado de captura de especificaciones, costos y parámetros de inventario</p>
        </div>
        <div className="page-header-right">
          <button className="btn btn-ghost" onClick={() => navigate('/inventario')}>
            <X size={16} /> Descartar
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar y Publicar en Catálogo'}
          </button>
        </div>
      </div>

      <div className="three-col np-columns">
        {/* Column 1: Identification */}
        <div className="card">
          <div className="card-body">
            <div className="np-section-num">1. Identificación y Origen</div>
            <div className="np-section-desc">Datos base para reconocimiento en sistema</div>

            <div className="input-group">
              <label>Tipo de Producto / Origen *</label>
              <select
                className="input-field"
                value={form.category}
                onChange={e => handleChange('category', e.target.value)}
              >
                {ORIGINS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* RF-13: Asociación de Proveedor */}
            <div className="input-group">
              <label>
                <Truck size={13} style={{ marginRight: 5, display: 'inline', verticalAlign: 'middle' }} />
                Proveedor Asociado (RF-13) {form.category === 'comestibles' ? '*' : '(Opcional)'}
              </label>
              <select
                className={`input-field ${errors.supplierId ? 'error' : ''}`}
                value={form.supplierId}
                onChange={e => handleChange('supplierId', e.target.value)}
              >
                <option value="">
                  {form.category === 'comestibles'
                    ? '— Selecciona un proveedor distribuidor —'
                    : '— Sin proveedor externo (Producción propia) —'}
                </option>
                {activeSuppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.contactName ? ` (${s.contactName})` : ''}
                  </option>
                ))}
              </select>
              {errors.supplierId && <div className="input-error">{errors.supplierId}</div>}
              <div className="input-hint">
                {form.category === 'comestibles'
                  ? 'Obligatorio para trazabilidad de productos adquiridos a terceros'
                  : 'Puedes vincular un proveedor de insumos, semillas o abonos'}
              </div>
            </div>

            <div className="input-group">
              <label>Código de Identificación (SKU) *</label>
              <input type="text" className="input-field" value={autoSku + ' (Generado Automático)'} disabled />
            </div>

            <div className="input-group">
              <label>Nombre del Producto *</label>
              <input
                type="text"
                className={`input-field ${errors.name ? 'error' : ''}`}
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="Nombre del producto"
              />
              {errors.name && <div className="input-error">{errors.name}</div>}
            </div>

            <div className="input-group">
              <label>Descripción / Cuidados</label>
              <textarea
                className="input-field"
                value={form.description}
                onChange={e => handleChange('description', e.target.value)}
                rows={3}
                placeholder="Descripción del producto..."
              ></textarea>
            </div>
          </div>
        </div>

        {/* Column 2: Inventory Control */}
        <div className="card">
          <div className="card-body">
            <div className="np-section-num">2. Control de Inventario</div>
            <div className="np-section-desc">Niveles iniciales y reglas de reabastecimiento</div>

            <div className="input-group">
              <label>Cantidad Inicial Disponible *</label>
              <input
                type="number"
                className={`input-field ${errors.stock ? 'error' : ''}`}
                value={form.stock}
                onChange={e => handleChange('stock', e.target.value)}
                placeholder="0"
              />
              {errors.stock && <div className="input-error">{errors.stock}</div>}
            </div>

            <div className="input-group">
              <label>Stock Mínimo de Seguridad (Alerta) *</label>
              <input
                type="number"
                className="input-field np-minstock-input"
                value={form.minStock}
                onChange={e => handleChange('minStock', e.target.value)}
                placeholder="5"
              />
              <div className="input-hint" style={{ color: '#b45309' }}>Activa Alerta Naranja</div>
            </div>

            <div className="input-group">
              <label>Unidad de Medida</label>
              <input
                type="text"
                className="input-field"
                value={form.unit}
                onChange={e => handleChange('unit', e.target.value)}
                placeholder="Unidad / Maceta"
              />
            </div>

            <div className="input-group">
              <label>Ubicación en Vivero / Bodega</label>
              <input
                type="text"
                className="input-field"
                value={form.location}
                onChange={e => handleChange('location', e.target.value)}
                placeholder="Estante A-01 • Zona..."
              />
            </div>
          </div>
        </div>

        {/* Column 3: Costs & Price */}
        <div className="card">
          <div className="card-body">
            <div className="np-section-num">3. Costos y Precio de Venta</div>
            <div className="np-section-desc">Finanzas y margen de ganancia proyectado</div>

            <div className="input-group">
              <label>Costo Unitario de Producción / Compra *</label>
              <input
                type="number"
                className={`input-field ${errors.cost ? 'error' : ''}`}
                value={form.cost}
                onChange={e => handleChange('cost', e.target.value)}
                placeholder="$0"
              />
              {errors.cost && <div className="input-error">{errors.cost}</div>}
            </div>

            <div className="input-group">
              <label>Precio de Venta Sugerido al Público *</label>
              <input
                type="number"
                className={`input-field np-price-input ${errors.price ? 'error' : ''}`}
                value={form.price}
                onChange={e => handleChange('price', e.target.value)}
                placeholder="$0"
              />
              {errors.price && <div className="input-error">{errors.price}</div>}
            </div>

            <div className="np-margin-box">
              <div className="np-margin-title">Análisis de Margen:</div>
              <div className="np-margin-label">Ganancia Neta por Venta:</div>
              <div className="np-margin-value">
                +{formatCOP(margin.profit)} ({margin.margin}%)
              </div>
            </div>

            <div className="input-group" style={{ marginTop: 16 }}>
              <label>Afecta Dinero en Caja Inicial</label>
              <div className="np-indicator">Genera registro automático de insumos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
