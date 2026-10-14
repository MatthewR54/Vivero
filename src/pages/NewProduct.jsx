import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { formatCOP } from '../utils/currency';
import { calculateMargin, generateSKU } from '../utils/calculations';
import { ArrowLeft, Save, X } from 'lucide-react';
import './NewProduct.css';

const ORIGINS = [
  { value: 'vivero', label: '🌿 Producción Propia de Vivero', origin: 'Producción Vivero' },
  { value: 'merchandising', label: '🎨 Merchandising Social', origin: 'Merchandising Social' },
  { value: 'comestibles', label: '🏪 Adquirido (Distribuidora)', origin: 'Adquirido (Distribuidora)' }
];

export default function NewProduct() {
  const { addProduct, showToast, nextProductId } = useAppData();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    category: 'vivero',
    name: 'Bonsái Ficus Retusa 3 Años',
    description: 'Planta de interior, riego moderado dos veces por semana, requiere luz indirecta filtrada.',
    stock: 15,
    minStock: 5,
    unit: 'Unidad / Maceta de Cerámica',
    location: 'Estante A-04 • Zona Climatizada',
    cost: 28000,
    price: 65000
  });

  const [errors, setErrors] = useState({});

  const autoSku = useMemo(() => {
    const num = nextProductId[form.category] || 1;
    return generateSKU(form.category, num);
  }, [form.category, nextProductId]);

  const selectedOrigin = ORIGINS.find(o => o.value === form.category);
  const margin = calculateMargin(form.price, form.cost);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleSave = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Nombre requerido';
    if (!form.stock && form.stock !== 0) newErrors.stock = 'Stock requerido';
    if (!form.cost) newErrors.cost = 'Costo requerido';
    if (!form.price) newErrors.price = 'Precio requerido';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      showToast('Completa los campos obligatorios', 'error');
      return;
    }

    addProduct({
      sku: autoSku,
      name: form.name,
      category: form.category,
      origin: selectedOrigin?.origin || '',
      stock: parseInt(form.stock),
      minStock: parseInt(form.minStock),
      cost: parseInt(form.cost),
      price: parseInt(form.price),
      unit: form.unit,
      location: form.location,
      description: form.description
    });

    showToast('Producto agregado al catálogo', 'success');
    navigate('/inventario');
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
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} /> Guardar y Publicar en Catálogo
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
                rows={4}
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
