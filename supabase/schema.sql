-- ============================================================
-- ESQUEMA DDL POSTGRESQL — VIVERO COLIBRÍ (SUPABASE / POSTGRES 16+)
-- ============================================================
-- Este script crea la totalidad de las tablas, restricciones,
-- índices, funciones transaccionales y políticas de seguridad RLS
-- requeridas para el ERP de Vivero Colibrí.
-- ============================================================

-- Habilitar extensión para UUIDs (nativa en Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TABLA: CATEGORIES (Categorías de Producto)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TABLA: SUPPLIERS (Proveedores) — RF-10 a RF-14
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    contact_name VARCHAR(120),
    phone VARCHAR(50),
    email VARCHAR(120),
    address TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TABLA: ACCOUNTS (Cuentas y Medios de Dinero) — RF-93 a RF-101
-- ============================================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- 'Efectivo Caja Menor', 'Bancolombia', 'Nequi'
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN ('EFECTIVO', 'BANCO', 'BILLETERA_DIGITAL')),
    current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. TABLA: PRODUCTS (Catálogo e Inventario) — RF-01 a RF-09
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS product_sku_seq START 1;

CREATE TABLE IF NOT EXISTS public.products (
    id VARCHAR(50) PRIMARY KEY, -- 'PRD-001', 'VIV-014', 'MER-009' o UUID
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category_id INT REFERENCES public.categories(id) ON DELETE RESTRICT,
    origin VARCHAR(100) NOT NULL CHECK (origin IN (
        'Producción Vivero',
        'Merchandising Social',
        'Adquirido (Distribuidora)',
        'Adquirido'
    )),
    current_stock INT NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock INT NOT NULL DEFAULT 5 CHECK (min_stock >= 0),
    base_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_cost >= 0),
    base_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_price >= 0),
    location VARCHAR(150),
    unit VARCHAR(80) DEFAULT 'Unidad',
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    supplier_id INT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);

-- ============================================================
-- 5. TABLA: INVENTORY_MOVEMENTS (Kardex de Movimientos) — RF-24 a RF-30
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id VARCHAR(50) NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN (
        'ENTRADA_COMPRA',
        'SALIDA_VENTA',
        'ENTRADA_PRODUCCION',
        'AJUSTE_MANUAL_ENTRADA',
        'AJUSTE_MANUAL_SALIDA',
        'INICIAL'
    )),
    quantity INT NOT NULL CHECK (quantity != 0),
    previous_stock INT NOT NULL,
    resulting_stock INT NOT NULL,
    reason TEXT, -- Justificación obligatoria para ajustes (RF-27)
    reference_id VARCHAR(100), -- ID de venta (VTA-XXX), compra o lote
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON public.inventory_movements(created_at DESC);

-- ============================================================
-- 6. TABLA: PURCHASES (Compras a Proveedores) — RF-15 a RF-22
-- ============================================================
CREATE TABLE IF NOT EXISTS public.purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id INT NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_cost >= 0),
    account_id INT REFERENCES public.accounts(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON public.purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases(purchase_date DESC);

-- ============================================================
-- 7. TABLA: SALES & SALE_ITEMS (Ventas & Facturación) — RF-61 a RF-75
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sales (
    id VARCHAR(50) PRIMARY KEY, -- 'VTA-101', 'VTA-102'
    customer_name VARCHAR(150) NOT NULL DEFAULT 'Consumidor Final',
    customer_document VARCHAR(50),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(120),
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sale_time TIME NOT NULL DEFAULT CURRENT_TIME,
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN (
        'Efectivo',
        'Nequi',
        'Bancolombia',
        'Transferencia',
        'Otro'
    )),
    sale_channel VARCHAR(30) NOT NULL DEFAULT 'PRESENCIAL' CHECK (sale_channel IN ('PRESENCIAL', 'VIRTUAL')),
    account_id INT REFERENCES public.accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id VARCHAR(50) NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    product_name VARCHAR(200) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (unit_cost >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_name);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);

-- ============================================================
-- 8. TABLA: PRODUCTION_BATCHES (Producción de Plantas) — RF-36 a RF-50
-- ============================================================
CREATE TABLE IF NOT EXISTS public.production_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code VARCHAR(50) UNIQUE NOT NULL, -- 'LOT-001', 'LOT-002'
    target_product_id VARCHAR(50) REFERENCES public.products(id) ON DELETE SET NULL,
    plant_species VARCHAR(150) NOT NULL,
    initial_quantity INT NOT NULL CHECK (initial_quantity > 0),
    current_quantity INT NOT NULL CHECK (current_quantity >= 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    estimated_ready_date DATE NOT NULL,
    actual_ready_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'EN_PRODUCCION' CHECK (status IN (
        'EN_PRODUCCION',
        'EN_CRECIMIENTO',
        'DISPONIBLE',
        'PERDIDA_TOTAL'
    )),
    environmental_conditions TEXT,
    accumulated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (accumulated_cost >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.production_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
    input_name VARCHAR(150) NOT NULL, -- 'Sustrato orgánico', 'Maceta 12cm', 'Abono NPK'
    quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) DEFAULT 'Unidad',
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
    total_cost NUMERIC(12, 2) NOT NULL CHECK (total_cost >= 0),
    application_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_batches_status ON public.production_batches(status);

-- ============================================================
-- 9. TABLA: CUSTOM_MERCH_ORDERS (Merchandising Personalizado) — RF-51 a RF-60
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_merch_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_product_id VARCHAR(50) REFERENCES public.products(id) ON DELETE SET NULL,
    sale_id VARCHAR(50) REFERENCES public.sales(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    units INT NOT NULL DEFAULT 1 CHECK (units > 0),
    base_price NUMERIC(12, 2) NOT NULL CHECK (base_price >= 0),
    custom_costs NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (custom_costs >= 0),
    final_sale_price NUMERIC(12, 2) NOT NULL CHECK (final_sale_price >= 0),
    estimated_profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    custom_specifications JSONB NOT NULL DEFAULT '{}'::jsonb, -- Talla, color, técnica, notas
    status VARCHAR(50) NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN (
        'PENDIENTE',
        'EN_PROCESO',
        'ENTREGADO',
        'CANCELADO'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. TABLA: MONEY_MOVEMENTS & RECONCILIATIONS — RF-76 a RF-92 & RF-102 a RF-104
-- ============================================================
CREATE TABLE IF NOT EXISTS public.money_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id INT NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN (
        'INGRESO_VENTA',
        'INGRESO_OTRO',
        'EGRESO_COMPRA',
        'GASTO_OPERATIVO',
        'TRANSFERENCIA',
        'AJUSTE_CONCILIACION'
    )),
    amount NUMERIC(12, 2) NOT NULL, -- Positivo = entrada, Negativo = salida
    concept VARCHAR(200) NOT NULL,
    reference_id VARCHAR(100),
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id INT NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    reconciliation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    system_expected_balance NUMERIC(14, 2) NOT NULL,
    physical_counted_balance NUMERIC(14, 2) NOT NULL,
    difference NUMERIC(14, 2) NOT NULL,
    justification TEXT, -- Justificación obligatoria para descuadres (RF-104)
    status VARCHAR(50) NOT NULL CHECK (status IN ('CUADRADO', 'DESCUADRE_JUSTIFICADO')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_account ON public.money_movements(account_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON public.money_movements(movement_date DESC);
CREATE INDEX IF NOT EXISTS idx_reconciliations_account ON public.reconciliations(account_id);

-- ============================================================
-- 11. FUNCIÓN & TRIGGER: ACTUALIZACIÓN AUTOMÁTICA DE updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_batches_updated_at
BEFORE UPDATE ON public.production_batches
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- 12. PROCEDIMIENTO ALMACENADO: PROCESAR VENTA ATÓMICA (ACID)
-- ============================================================
-- Ejecuta en una sola transacción:
-- 1. Verificación y descuento de stock
-- 2. Inserción de venta y detalle
-- 3. Registro en Kardex de inventario
-- 4. Entrada de dinero en la cuenta correspondiente
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_sale_transaction(payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_sale_id VARCHAR(50);
    v_item RECORD;
    v_current_stock INT;
    v_account_id INT;
    v_total NUMERIC(12, 2);
    v_method VARCHAR(50);
BEGIN
    v_sale_id := payload->>'id';
    v_total := (payload->>'total')::NUMERIC;
    v_method := payload->>'paymentMethod';

    -- 1. Determinar ID de cuenta según medio de pago
    IF v_method = 'Efectivo' THEN
        SELECT id INTO v_account_id FROM public.accounts WHERE name ILIKE '%Efectivo%' LIMIT 1;
    ELSIF v_method = 'Nequi' THEN
        SELECT id INTO v_account_id FROM public.accounts WHERE name ILIKE '%Nequi%' LIMIT 1;
    ELSE
        SELECT id INTO v_account_id FROM public.accounts WHERE name ILIKE '%Bancolombia%' LIMIT 1;
    END IF;

    -- 2. Insertar encabezado de venta
    INSERT INTO public.sales (
        id, customer_name, customer_document, customer_phone,
        subtotal, discount, total, payment_method, account_id
    ) VALUES (
        v_sale_id,
        COALESCE(payload->'customer'->>'name', 'Consumidor Final'),
        payload->'customer'->>'document',
        payload->'customer'->>'phone',
        (payload->>'subtotal')::NUMERIC,
        COALESCE((payload->>'discount')::NUMERIC, 0.00),
        v_total,
        v_method,
        v_account_id
    );

    -- 3. Iterar por cada ítem del carrito: validar, descontar y registrar en Kardex
    FOR v_item IN SELECT * FROM jsonb_to_recordset(payload->'items') AS x(
        "productId" VARCHAR(50),
        "name" VARCHAR(200),
        "quantity" INT,
        "unitPrice" NUMERIC,
        "subtotal" NUMERIC
    )
    LOOP
        -- Bloqueo pesimista para evitar concurrencia
        SELECT current_stock INTO v_current_stock
        FROM public.products
        WHERE id = v_item."productId"
        FOR UPDATE;

        IF v_current_stock IS NULL THEN
            RAISE EXCEPTION 'Producto con ID % no encontrado', v_item."productId";
        END IF;

        IF v_current_stock < v_item."quantity" THEN
            RAISE EXCEPTION 'Stock insuficiente para % (Disponible: %, Solicitado: %)',
                v_item."name", v_current_stock, v_item."quantity";
        END IF;

        -- Descontar inventario
        UPDATE public.products
        SET current_stock = current_stock - v_item."quantity"
        WHERE id = v_item."productId";

        -- Insertar detalle de venta
        INSERT INTO public.sale_items (
            sale_id, product_id, product_name, quantity, unit_price, subtotal
        ) VALUES (
            v_sale_id, v_item."productId", v_item."name",
            v_item."quantity", v_item."unitPrice", v_item."subtotal"
        );

        -- Registrar movimiento en Kardex
        INSERT INTO public.inventory_movements (
            product_id, movement_type, quantity, previous_stock, resulting_stock,
            reason, reference_id
        ) VALUES (
            v_item."productId", 'SALIDA_VENTA', -v_item."quantity",
            v_current_stock, v_current_stock - v_item."quantity",
            'Venta en POS comprobante ' || v_sale_id, v_sale_id
        );
    END LOOP;

    -- 4. Actualizar saldo en la cuenta de dinero e insertar movimiento financiero
    IF v_account_id IS NOT NULL THEN
        UPDATE public.accounts
        SET current_balance = current_balance + v_total
        WHERE id = v_account_id;

        INSERT INTO public.money_movements (
            account_id, movement_type, amount, concept, reference_id
        ) VALUES (
            v_account_id, 'INGRESO_VENTA', v_total,
            'Venta comprobante ' || v_sale_id, v_sale_id
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'saleId', v_sale_id,
        'total', v_total
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 13. POLÍTICAS DE SEGURIDAD (ROW LEVEL SECURITY - RLS)
-- ============================================================
-- Habilita RLS en todas las tablas para permitir consultas
-- seguras desde clientes web mediante la clave pública anon.
-- ============================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_merch_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.money_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura abiertas para usuarios autenticados y clave anon (ajustables a roles)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Permitir acceso completo a %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Permitir acceso completo a %I" ON public.%I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END;
$$;
