// ============================================================
// DATOS SEMILLA - VIVERO COLIBRÍ
// Estos datos se cargan al iniciar la aplicación si no hay
// datos previos en localStorage.
// ============================================================

export const seedSuppliers = [
  {
    id: 1,
    name: 'Distribuidora Central de Abarrotes',
    contactName: 'Javier Peña',
    phone: '+57 312 456 7890',
    email: 'ventas@distribuidoracentral.co',
    address: 'Bodega 14 • Central Mayorista',
    active: true
  },
  {
    id: 2,
    name: 'FEMSA Colombia',
    contactName: 'Atención Comercial',
    phone: '+57 300 123 4567',
    email: 'pedidos@femsa.com.co',
    address: 'Zona Industrial Norte',
    active: true
  },
  {
    id: 3,
    name: 'Bimbo de Colombia S.A.',
    contactName: 'Ruta 102 Vivero',
    phone: '+57 315 987 6543',
    email: 'entregas@bimbo.com.co',
    address: 'Autopista Sur Km 8',
    active: true
  },
  {
    id: 4,
    name: 'Sustratos & Abonos Orgánicos del Valle',
    contactName: 'Dra. Elena Gómez',
    phone: '+57 318 654 3210',
    email: 'contacto@abonosvalle.org',
    address: 'Finca El Porvenir • Vereda La Selva',
    active: true
  }
];

export const seedPurchases = [];

export const seedProducts = [
  {
    id: 'PRD-001',
    sku: 'PRD-001',
    name: 'Cereal',
    category: 'comestibles',
    origin: 'Adquirido (Distribuidora)',
    stock: 203,
    minStock: 20,
    cost: 21500,
    price: 30000,
    active: true,
    location: 'Estante B-12 • Bodega Principal',
    unit: 'Unidad / Paquete',
    description: 'Cereal de distribución, venta directa al consumidor.',
    supplierId: 1
  },
  {
    id: 'PRD-002',
    sku: 'PRD-002',
    name: 'Coca Cola 500ml',
    category: 'comestibles',
    origin: 'Adquirido (Distribuidora)',
    stock: 96,
    minStock: 24,
    cost: 2600,
    price: 3900,
    active: true,
    location: 'Refrigerador R-01 • Zona Tienda',
    unit: 'Unidad / Botella',
    description: 'Bebida gaseosa Coca Cola presentación 500ml.',
    supplierId: 2
  },
  {
    id: 'PRD-003',
    sku: 'PRD-003',
    name: 'Pan Bimbo',
    category: 'comestibles',
    origin: 'Adquirido (Distribuidora)',
    stock: 30,
    minStock: 25,
    cost: 3800,
    price: 5200,
    active: true,
    location: 'Estante A-01 • Zona Tienda',
    unit: 'Unidad / Paquete Mediano',
    description: 'Pan de molde blanco, presentación mediana.',
    supplierId: 3
  },
  {
    id: 'VIV-014',
    sku: 'VIV-014',
    name: 'Suculenta Jade',
    category: 'vivero',
    origin: 'Producción Vivero',
    stock: 4,
    minStock: 15,
    cost: 4200,
    price: 12000,
    active: true,
    location: 'Estante A-02 • Zona Plantas',
    unit: 'Unidad / Maceta Pequeña',
    description: 'Planta suculenta Jade, riego cada 10 días, luz directa.',
    supplierId: 4
  },
  {
    id: 'VIV-022',
    sku: 'VIV-022',
    name: 'Orquídea Phalaenopsis',
    category: 'vivero',
    origin: 'Producción Vivero',
    stock: 12,
    minStock: 8,
    cost: 16500,
    price: 38000,
    active: true,
    location: 'Estante A-03 • Zona Climatizada',
    unit: 'Unidad / Maceta Decorativa',
    description: 'Orquídea Phalaenopsis de flor blanca, luz indirecta, riego moderado.',
    supplierId: 4
  },
  {
    id: 'MER-009',
    sku: 'MER-009',
    name: 'Camiseta Merch Personalizada',
    category: 'merchandising',
    origin: 'Merchandising Social',
    stock: 18,
    minStock: 10,
    cost: 27000,
    price: 45000,
    active: true,
    location: 'Vitrina V-01 • Zona Merchandising',
    unit: 'Unidad / Prenda',
    description: 'Camiseta personalizada con diseño comunitario, serigrafía de alta calidad.',
    supplierId: null
  }
];

export const seedCustomers = [
  {
    document: '1.114.890.342',
    name: 'Carlos Mendoza',
    phone: '+57 315 890 4422',
    email: 'carlos.mendoza@email.com'
  },
  {
    document: '31.849.201',
    name: 'Mariana Gómez',
    phone: '+57 320 456 7890',
    email: 'mariana.gomez@email.com'
  },
  {
    document: '1.144.520',
    name: 'Andrés Felipe Rojas',
    phone: '+57 310 123 4567',
    email: 'andres.rojas@email.com'
  }
];

export const seedSales = [
  {
    id: 'VTA-1049',
    date: new Date().toISOString().split('T')[0],
    time: '14:32',
    customer: {
      document: '1.114.890.342',
      name: 'Carlos Mendoza'
    },
    items: [
      { productId: 'PRD-001', name: 'Cereal', quantity: 2, unitPrice: 30000, subtotal: 60000 },
      { productId: 'PRD-002', name: 'Coca Cola 500ml', quantity: 1, unitPrice: 3900, subtotal: 3900 }
    ],
    paymentMethod: 'Efectivo',
    total: 63900
  },
  {
    id: 'VTA-1048',
    date: new Date().toISOString().split('T')[0],
    time: '14:15',
    customer: {
      document: '31.849.201',
      name: 'Mariana Gómez'
    },
    items: [
      { productId: 'VIV-014', name: 'Suculenta Echeveria', quantity: 3, unitPrice: 12000, subtotal: 36000 }
    ],
    paymentMethod: 'Nequi',
    total: 36000
  },
  {
    id: 'VTA-1047',
    date: new Date().toISOString().split('T')[0],
    time: '13:50',
    customer: {
      document: '1.144.520',
      name: 'Andrés Felipe Rojas'
    },
    items: [
      { productId: 'MER-009', name: 'Camiseta Merch Personalizada', quantity: 1, unitPrice: 55000, subtotal: 55000 }
    ],
    paymentMethod: 'Bancolombia',
    total: 55000
  },
  {
    id: 'VTA-1046',
    date: new Date().toISOString().split('T')[0],
    time: '12:40',
    customer: {
      document: '',
      name: 'Consumidor Final'
    },
    items: [
      { productId: 'PRD-003', name: 'Pan Bimbo', quantity: 1, unitPrice: 5200, subtotal: 5200 },
      { productId: 'PRD-002', name: 'Coca Cola 500ml', quantity: 1, unitPrice: 3900, subtotal: 3900 }
    ],
    paymentMethod: 'Efectivo',
    total: 9100
  }
];

export const seedTransactions = [
  {
    id: 'VTA-1049',
    type: 'venta',
    summary: '2× Cereal, 1× Coca Cola',
    time: '14:32',
    method: 'Efectivo',
    amount: 63900
  },
  {
    id: 'VTA-1048',
    type: 'venta',
    summary: '3× Suculenta Echeveria',
    time: '14:15',
    method: 'Nequi',
    amount: 36000
  },
  {
    id: 'VTA-1047',
    type: 'venta',
    summary: '1× Camiseta Merch',
    time: '13:50',
    method: 'Bancolombia',
    amount: 55000
  },
  {
    id: 'CMP-0284',
    type: 'compra',
    summary: 'Compra Abono & Sustrato',
    time: '12:10',
    method: 'Prov',
    amount: -180000
  }
];

export const seedAlerts = [
  {
    id: 'alert-1',
    type: 'danger',
    title: 'Stock Bajo Crítico: Suculenta Jade',
    description: 'Quedan 4 unidades (Stock mínimo configurado: 15). Requiere reabastecimiento.',
    action: 'Reponer',
    productId: 'VIV-014'
  },
  {
    id: 'alert-2',
    type: 'warning',
    title: 'Stock Próximo a Mínimo: Pan Bimbo',
    description: 'Quedan 30 unidades (Mínimo: 25). Proveedor habitual: Bimbo Distribución.',
    action: 'Pedir',
    productId: 'PRD-003'
  },
  {
    id: 'alert-3',
    type: 'success',
    title: 'Proceso de Cultivo Activo: Lote #P-104 Orquídeas',
    description: '45 plantas en fase "En crecimiento". Disponibilidad comercial estimada: 25/09.',
    action: 'Ver Lote'
  },
  {
    id: 'alert-4',
    type: 'purple',
    title: 'Merchandising en Producción: Pedido #M-88',
    description: '15 Camisetas personalizadas en serigrafía social. Costo est.: $390.000.',
    action: 'Taller'
  }
];

export const seedStatistics = {
  totalIngresos: 8450000,
  totalEgresos: 4620000,
  gananciaNeta: 3830000,
  margenGlobal: 45.3,
  conciliacion: 2470000,
  transaccionesCount: 218,
  weeks: [
    { label: 'Semana 1', ingresos: 2100000, costos: 1150000, ganancia: 950000 },
    { label: 'Semana 2', ingresos: 1950000, costos: 1130000, ganancia: 820000 },
    { label: 'Semana 3', ingresos: 2350000, costos: 1230000, ganancia: 1120000 },
    { label: 'Semana 4 (Actual)', ingresos: 2050000, costos: 1110000, ganancia: 940000 }
  ],
  distribution: [
    { label: 'Plantas & Vivero', percentage: 58, amount: 4900000, color: 'green' },
    { label: 'Merchandising Social', percentage: 27, amount: 2280000, color: 'blue' },
    { label: 'Comestibles / Tienda', percentage: 15, amount: 1270000, color: 'yellow' }
  ],
  reconciliation: {
    efectivo: { sistema: 720000, conteo: 720000, status: 'Cuadrado', diff: 0 },
    nequi: { registrado: 1150000, enCuenta: 1150000, status: 'Verificado' },
    bancolombia: { registrado: 600000, extracto: 600000, status: 'Verificado' }
  },
  cajaBase: 150000,
  retiroProgramado: 1500000
};

// Counter para generar IDs secuenciales de venta
export const seedNextSaleId = 1050;
export const seedNextProductId = {
  vivero: 35,
  merchandising: 10,
  comestibles: 4
};
