-- ============================================================
-- SCRIPT DE INICIALIZACIÓN Y DATOS SEMILLA (SEED DATA)
-- VIVERO COLIBRÍ — SUPABASE / POSTGRESQL 16+
-- ============================================================
-- Este script pobla la base de datos con los datos iniciales
-- del catálogo, proveedores, cuentas de dinero y ventas de prueba.
-- ============================================================

-- 1. CATEGORÍAS INICIALES
INSERT INTO public.categories (id, name, description) VALUES
    (1, 'comestibles', 'Alimentos empaquetados y bebidas adquiridas para venta en tienda comunitaria'),
    (2, 'vivero', 'Plantas vivas, suculentas, bonsáis y especies cultivadas o aclimatadas en vivero'),
    (3, 'merchandising', 'Prendas y artículos personalizados elaborados como iniciativa de labor social')
ON CONFLICT (id) DO NOTHING;

-- 2. PROVEEDORES INICIALES (RF-10)
INSERT INTO public.suppliers (id, name, contact_name, phone, email, address) VALUES
    (1, 'Distribuidora Central de Abarrotes', 'Javier Peña', '+57 312 456 7890', 'ventas@distribuidoracentral.co', 'Bodega 14 • Central Mayorista'),
    (2, 'FEMSA Colombia', 'Atención Comercial', '+57 300 123 4567', 'pedidos@femsa.com.co', 'Zona Industrial Norte'),
    (3, 'Bimbo de Colombia S.A.', 'Ruta 102 Vivero', '+57 315 987 6543', 'entregas@bimbo.com.co', 'Autopista Sur Km 8'),
    (4, 'Sustratos & Abonos Orgánicos del Valle', 'Dra. Elena Gómez', '+57 318 654 3210', 'contacto@abonosvalle.org', 'Finca El Porvenir • Vereda La Selva')
ON CONFLICT (id) DO NOTHING;

-- 3. CUENTAS DE DINERO INICIALES (RF-93, RF-94)
INSERT INTO public.accounts (id, name, account_type, current_balance) VALUES
    (1, 'Efectivo Caja Menor', 'EFECTIVO', 720000.00),
    (2, 'Nequi Comunitario', 'BILLETERA_DIGITAL', 1150000.00),
    (3, 'Bancolombia Principal', 'BANCO', 600000.00)
ON CONFLICT (id) DO NOTHING;

-- 4. PRODUCTOS DEL CATÁLOGO (seedProducts)
INSERT INTO public.products (
    id, sku, name, category_id, origin, current_stock, min_stock,
    base_cost, base_price, location, unit, description, active, supplier_id
) VALUES
    (
        'PRD-001', 'PRD-001', 'Cereal', 1, 'Adquirido (Distribuidora)',
        203, 20, 21500.00, 30000.00,
        'Estante B-12 • Bodega Principal', 'Unidad / Paquete',
        'Cereal de distribución, venta directa al consumidor.', true, 1
    ),
    (
        'PRD-002', 'PRD-002', 'Coca Cola 500ml', 1, 'Adquirido (Distribuidora)',
        96, 24, 2600.00, 3900.00,
        'Refrigerador R-01 • Zona Tienda', 'Unidad / Botella',
        'Bebida gaseosa Coca Cola presentación 500ml.', true, 2
    ),
    (
        'PRD-003', 'PRD-003', 'Pan Bimbo', 1, 'Adquirido (Distribuidora)',
        30, 25, 3800.00, 5200.00,
        'Estante A-01 • Zona Tienda', 'Unidad / Paquete Mediano',
        'Pan de molde blanco, presentación mediana.', true, 3
    ),
    (
        'VIV-014', 'VIV-014', 'Suculenta Jade', 2, 'Producción Vivero',
        4, 15, 4200.00, 12000.00,
        'Estante A-02 • Zona Plantas', 'Unidad / Maceta Pequeña',
        'Planta suculenta Jade, riego cada 10 días, luz directa.', true, 4
    ),
    (
        'VIV-022', 'VIV-022', 'Orquídea Phalaenopsis', 2, 'Producción Vivero',
        12, 8, 16500.00, 38000.00,
        'Estante A-03 • Zona Climatizada', 'Unidad / Maceta Decorativa',
        'Orquídea Phalaenopsis de flor blanca, luz indirecta, riego moderado.', true, 4
    ),
    (
        'MER-009', 'MER-009', 'Camiseta Merch Personalizada', 3, 'Merchandising Social',
        18, 10, 27000.00, 45000.00,
        'Vitrina V-01 • Zona Merchandising', 'Unidad / Prenda',
        'Camiseta personalizada con diseño comunitario, serigrafía de alta calidad.', true, NULL
    )
ON CONFLICT (id) DO NOTHING;

-- 5. MOVIMIENTOS INICIALES DE KARDEX (RF-28)
INSERT INTO public.inventory_movements (product_id, movement_type, quantity, previous_stock, resulting_stock, reason, reference_id) VALUES
    ('PRD-001', 'INICIAL', 203, 0, 203, 'Carga de inventario inicial', 'INIT-2026'),
    ('PRD-002', 'INICIAL', 96, 0, 96, 'Carga de inventario inicial', 'INIT-2026'),
    ('PRD-003', 'INICIAL', 30, 0, 30, 'Carga de inventario inicial', 'INIT-2026'),
    ('VIV-014', 'INICIAL', 4, 0, 4, 'Carga de inventario inicial', 'INIT-2026'),
    ('VIV-022', 'INICIAL', 12, 0, 12, 'Carga de inventario inicial', 'INIT-2026'),
    ('MER-009', 'INICIAL', 18, 0, 18, 'Carga de inventario inicial', 'INIT-2026');

-- 6. LOTES DE PRODUCCIÓN INICIALES (RF-36 a RF-50)
INSERT INTO public.production_batches (
    batch_code, target_product_id, plant_species, initial_quantity, current_quantity,
    start_date, estimated_ready_date, status, environmental_conditions, accumulated_cost
) VALUES
    (
        'LOT-001', 'VIV-022', 'Orquídea Phalaenopsis Blanca', 50, 45,
        CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '45 days',
        'EN_CRECIMIENTO', 'Zona sombra 70%, humedad 65%, riego por microaspersión cada 3 días',
        382500.00
    ),
    (
        'LOT-002', 'VIV-014', 'Suculenta Jade Enana', 60, 58,
        CURRENT_DATE - INTERVAL '15 days', CURRENT_DATE + INTERVAL '20 days',
        'EN_PRODUCCION', 'Exposición solar matutina 4 horas, sustrato mineral con perlita',
        145000.00
    )
ON CONFLICT (batch_code) DO NOTHING;

-- 7. VENTAS DE EJEMPLO (seedSales)
INSERT INTO public.sales (
    id, customer_name, customer_document, customer_phone,
    sale_date, sale_time, subtotal, discount, total, payment_method, account_id
) VALUES
    (
        'VTA-1049', 'Carlos Mendoza', '1.114.890.342', '+57 315 890 4422',
        CURRENT_DATE, '14:32:00', 63900.00, 0.00, 63900.00, 'Efectivo', 1
    ),
    (
        'VTA-1048', 'Mariana Gómez', '31.849.201', '+57 320 456 7890',
        CURRENT_DATE, '14:15:00', 36000.00, 0.00, 36000.00, 'Nequi', 2
    ),
    (
        'VTA-1047', 'Andrés Felipe Rojas', '1.144.520', '+57 310 123 4567',
        CURRENT_DATE, '13:50:00', 55000.00, 0.00, 55000.00, 'Bancolombia', 3
    )
ON CONFLICT (id) DO NOTHING;

-- 8. DETALLE DE VENTAS DE EJEMPLO
INSERT INTO public.sale_items (sale_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal) VALUES
    ('VTA-1049', 'PRD-001', 'Cereal', 2, 30000.00, 21500.00, 60000.00),
    ('VTA-1049', 'PRD-002', 'Coca Cola 500ml', 1, 3900.00, 2600.00, 3900.00),
    ('VTA-1048', 'VIV-014', 'Suculenta Echeveria / Jade', 3, 12000.00, 4200.00, 36000.00),
    ('VTA-1047', 'MER-009', 'Camiseta Merch Personalizada', 1, 55000.00, 27000.00, 55000.00);

-- 9. MOVIMIENTOS MONETARIOS INICIALES (seedTransactions)
INSERT INTO public.money_movements (account_id, movement_type, amount, concept, reference_id, movement_date) VALUES
    (1, 'INGRESO_VENTA', 63900.00, 'Venta en efectivo comprobante VTA-1049', 'VTA-1049', CURRENT_DATE),
    (2, 'INGRESO_VENTA', 36000.00, 'Venta Nequi comprobante VTA-1048', 'VTA-1048', CURRENT_DATE),
    (3, 'INGRESO_VENTA', 55000.00, 'Venta Bancolombia comprobante VTA-1047', 'VTA-1047', CURRENT_DATE),
    (1, 'EGRESO_COMPRA', -180000.00, 'Compra insumos abono y sustrato orgánico', 'CMP-0284', CURRENT_DATE);

-- 10. CONCILIACIÓN INICIAL EN LIBROS (RF-102 a RF-104)
INSERT INTO public.reconciliations (
    account_id, reconciliation_date, system_expected_balance, physical_counted_balance,
    difference, justification, status
) VALUES
    (1, CURRENT_DATE, 720000.00, 720000.00, 0.00, 'Arqueo de cierre de turno cuadrado 100%', 'CUADRADO'),
    (2, CURRENT_DATE, 1150000.00, 1150000.00, 0.00, 'Saldos validados contra app Nequi', 'CUADRADO'),
    (3, CURRENT_DATE, 600000.00, 600000.00, 0.00, 'Conciliado con extracto digital Bancolombia', 'CUADRADO');
