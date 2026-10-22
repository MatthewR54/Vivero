-- ============================================================
-- MIGRACIÓN 01 — CONEXIÓN DEL FRONTEND CON SUPABASE
-- Vivero Colibrí · Responsable: Samuel Solarte (Base de datos)
-- ============================================================
-- Ejecutar DESPUÉS de schema.sql y seed.sql (SQL Editor → Run).
-- Es idempotente: se puede volver a ejecutar sin romper nada.
--
-- Qué cambia:
--   1. Fecha y hora de ventas en hora de Colombia (Supabase usa UTC).
--   2. Consecutivo de ventas (VTA-XXXX) generado por la base de datos,
--      para que dos cajas no generen el mismo número.
--   3. process_sale_transaction v2:
--        - genera el ID de la venta,
--        - recalcula subtotales y total en el servidor (RNF-16),
--        - guarda el costo unitario (para calcular ganancias),
--        - guarda canal (presencial/virtual) y correo del cliente,
--        - rechaza ventas vacías o cantidades inválidas.
--   4. Registro automático en el Kardex del stock inicial al crear
--      un producto (RF-24, RF-28).
--   5. Permisos (GRANT) para que la app pueda usar las tablas con
--      la anon key; schema.sql solo crea las políticas RLS.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Fecha/hora local de Colombia por defecto en ventas
-- ------------------------------------------------------------
ALTER TABLE public.sales
    ALTER COLUMN sale_date SET DEFAULT (NOW() AT TIME ZONE 'America/Bogota')::DATE,
    ALTER COLUMN sale_time SET DEFAULT (NOW() AT TIME ZONE 'America/Bogota')::TIME(0);

-- ------------------------------------------------------------
-- 2. Consecutivo de ventas
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.sale_number_seq;

-- Arranca después del mayor VTA-XXXX que ya exista (mínimo 1049).
SELECT setval(
    'public.sale_number_seq',
    GREATEST(
        1049,
        COALESCE(
            (SELECT MAX(SUBSTRING(id FROM '^VTA-([0-9]+)$')::INT) FROM public.sales),
            0
        ),
        (SELECT last_value FROM public.sale_number_seq)
    )
);

-- ------------------------------------------------------------
-- 3. Venta atómica v2
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_sale_transaction(payload JSONB)
RETURNS JSONB AS $$
DECLARE
    v_sale_id      VARCHAR(50);
    v_item         RECORD;
    v_product      RECORD;
    v_account_id   INT;
    v_method       VARCHAR(50);
    v_channel      VARCHAR(30);
    v_discount     NUMERIC(12, 2);
    v_subtotal     NUMERIC(12, 2) := 0;
    v_total        NUMERIC(12, 2);
    v_line_total   NUMERIC(12, 2);
    v_now          TIMESTAMP := NOW() AT TIME ZONE 'America/Bogota';
BEGIN
    -- Validaciones básicas del payload
    IF payload->'items' IS NULL
       OR jsonb_typeof(payload->'items') <> 'array'
       OR jsonb_array_length(payload->'items') = 0 THEN
        RAISE EXCEPTION 'La venta debe tener al menos un producto';
    END IF;

    v_method   := COALESCE(payload->>'paymentMethod', 'Efectivo');
    v_channel  := UPPER(COALESCE(payload->>'channel', 'PRESENCIAL'));
    v_discount := COALESCE((payload->>'discount')::NUMERIC, 0);

    IF v_discount < 0 THEN
        RAISE EXCEPTION 'El descuento no puede ser negativo';
    END IF;

    -- ID de venta: el que mande el cliente o el siguiente consecutivo
    v_sale_id := NULLIF(payload->>'id', '');
    IF v_sale_id IS NULL THEN
        v_sale_id := 'VTA-' || nextval('public.sale_number_seq');
    END IF;

    -- Cuenta de dinero según medio de pago
    IF v_method = 'Efectivo' THEN
        SELECT id INTO v_account_id FROM public.accounts WHERE name ILIKE '%Efectivo%' AND active LIMIT 1;
    ELSIF v_method = 'Nequi' THEN
        SELECT id INTO v_account_id FROM public.accounts WHERE name ILIKE '%Nequi%' AND active LIMIT 1;
    ELSE
        SELECT id INTO v_account_id FROM public.accounts WHERE name ILIKE '%Bancolombia%' AND active LIMIT 1;
    END IF;

    -- Encabezado (los totales se actualizan al final, ya recalculados)
    INSERT INTO public.sales (
        id, customer_name, customer_document, customer_phone, customer_email,
        sale_date, sale_time, subtotal, discount, total,
        payment_method, sale_channel, account_id
    ) VALUES (
        v_sale_id,
        COALESCE(NULLIF(TRIM(payload->'customer'->>'name'), ''), 'Consumidor Final'),
        NULLIF(TRIM(payload->'customer'->>'document'), ''),
        NULLIF(TRIM(payload->'customer'->>'phone'), ''),
        NULLIF(TRIM(payload->'customer'->>'email'), ''),
        v_now::DATE, v_now::TIME(0),
        0, v_discount, 0,
        v_method, v_channel, v_account_id
    );

    -- Ítems: validar, bloquear fila, descontar stock, detalle y Kardex
    FOR v_item IN
        SELECT * FROM jsonb_to_recordset(payload->'items') AS x(
            "productId" VARCHAR(50),
            "quantity"  INT,
            "unitPrice" NUMERIC
        )
    LOOP
        IF v_item."quantity" IS NULL OR v_item."quantity" <= 0 THEN
            RAISE EXCEPTION 'Cantidad inválida para el producto %', v_item."productId";
        END IF;

        SELECT id, name, current_stock, base_cost, base_price, active
          INTO v_product
          FROM public.products
         WHERE id = v_item."productId"
           FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto con ID % no encontrado', v_item."productId";
        END IF;

        IF NOT v_product.active THEN
            RAISE EXCEPTION 'El producto % está inactivo', v_product.name;
        END IF;

        IF v_product.current_stock < v_item."quantity" THEN
            RAISE EXCEPTION 'Stock insuficiente para % (Disponible: %, Solicitado: %)',
                v_product.name, v_product.current_stock, v_item."quantity";
        END IF;

        -- Precio: el enviado (RF-65 permite ajustarlo) o el del catálogo
        IF v_item."unitPrice" IS NOT NULL AND v_item."unitPrice" < 0 THEN
            RAISE EXCEPTION 'Precio inválido para %', v_product.name;
        END IF;
        v_line_total := v_item."quantity" * COALESCE(v_item."unitPrice", v_product.base_price);
        v_subtotal   := v_subtotal + v_line_total;

        UPDATE public.products
           SET current_stock = current_stock - v_item."quantity"
         WHERE id = v_product.id;

        INSERT INTO public.sale_items (
            sale_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal
        ) VALUES (
            v_sale_id, v_product.id, v_product.name, v_item."quantity",
            COALESCE(v_item."unitPrice", v_product.base_price),
            v_product.base_cost, v_line_total
        );

        INSERT INTO public.inventory_movements (
            product_id, movement_type, quantity, previous_stock, resulting_stock,
            reason, reference_id
        ) VALUES (
            v_product.id, 'SALIDA_VENTA', -v_item."quantity",
            v_product.current_stock, v_product.current_stock - v_item."quantity",
            'Venta en POS comprobante ' || v_sale_id, v_sale_id
        );
    END LOOP;

    IF v_discount > v_subtotal THEN
        RAISE EXCEPTION 'El descuento (%) supera el subtotal (%)', v_discount, v_subtotal;
    END IF;
    v_total := v_subtotal - v_discount;

    UPDATE public.sales
       SET subtotal = v_subtotal, total = v_total
     WHERE id = v_sale_id;

    -- Entrada de dinero en la cuenta correspondiente
    IF v_account_id IS NOT NULL AND v_total > 0 THEN
        UPDATE public.accounts
           SET current_balance = current_balance + v_total,
               updated_at = NOW()
         WHERE id = v_account_id;

        INSERT INTO public.money_movements (
            account_id, movement_type, amount, concept, reference_id, movement_date
        ) VALUES (
            v_account_id, 'INGRESO_VENTA', v_total,
            'Venta comprobante ' || v_sale_id, v_sale_id, v_now::DATE
        );
    END IF;

    RETURN jsonb_build_object(
        'success',  true,
        'saleId',   v_sale_id,
        'date',     v_now::DATE,
        'time',     TO_CHAR(v_now, 'HH24:MI'),
        'subtotal', v_subtotal,
        'discount', v_discount,
        'total',    v_total
    );
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 4. Kardex automático del stock inicial al crear un producto
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_initial_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.current_stock > 0 THEN
        INSERT INTO public.inventory_movements (
            product_id, movement_type, quantity, previous_stock, resulting_stock,
            reason, reference_id
        ) VALUES (
            NEW.id, 'INICIAL', NEW.current_stock, 0, NEW.current_stock,
            'Stock inicial al registrar el producto', NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_initial_stock ON public.products;
CREATE TRIGGER trg_products_initial_stock
AFTER INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.log_initial_stock();

-- ------------------------------------------------------------
-- 5. Permisos de la API para la app (anon key)
-- ------------------------------------------------------------
-- Sin estos GRANT, Supabase responde "permission denied for table"
-- aunque existan las políticas RLS de acceso completo.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
