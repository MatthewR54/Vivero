# 📐 Arquitectura del Sistema — Vivero Colibrí

Este documento profundiza en la estructura técnica, distribución por capas y flujos de información del sistema **Vivero Colibrí**, complementando la especificación inicial descrita en [`docs/disenio_tecnico_inicial.docx`](docs/disenio_tecnico_inicial.docx).

---

## 🏛️ 1. Visión Arquitectónica General

El sistema se fundamenta en una **arquitectura por capas desacopladas** para garantizar mantenibilidad, trazabilidad contable y evolución modular conforme a los requisitos no funcionales RNF-30 a RNF-33. Dado que la aplicación será operada directamente por la clienta, se prescinde de módulos de autenticación y control de roles:

```mermaid
flowchart TD
    subgraph CapaPresentacion ["1. Capa de Presentación"]
        U1["👤 Usuaria (Administración, Ventas, Producción y Compras)"]
    end

    subgraph CapaFrontend ["2. Capa de Aplicación Frontend (SPA)"]
        Router["React Router v7"]
        Views["Vistas Modulares (Dashboard, Inventario, POS, Finanzas)"]
        State["Gestión de Estado (TanStack Query + Context UI)"]
        ValidationFE["Validación Temprana de Formularios"]
        Services["Capa de Servicios (src/services/*)"]
    end

    subgraph CapaBackend ["3. Capa de Lógica de Negocio (Supabase / API REST + RPC)"]
        PostgREST["API REST Autogenerada (PostgREST)"]
        
        subgraph ModulosNegocio ["Lógica y Servicios de Dominio"]
            S_Prod["Productos & Kardex"]
            S_Sale["Ventas & Facturación (RPC process_sale_transaction)"]
            S_Plant["Producción Biológica"]
            S_Merch["Merchandising Personalizado"]
            S_Treasury["Tesorería & Conciliación"]
            S_Purchase["Compras & Costeo Ponderado"]
        end

        TxManager["Transacciones ACID en PostgreSQL"]
    end

    subgraph CapaDatos ["4. Capa de Persistencia & Almacenamiento"]
        DB[("PostgreSQL 16 Engine (Supabase)")]
        Tables["Tablas Relacionales + Índices + JSONB"]
    end

    subgraph ServiciosTransversales ["5. Servicios de Soporte & Exportación"]
        KeepAlive["GitHub Actions Keep-Alive Diario"]
        ExportService["Generación y Exportación CSV / Reportes"]
    end

    CapaPresentacion -->|"HTTPS / Navegadores Modernos"| CapaFrontend
    Router --> Views
    Views --> State
    State --> ValidationFE
    ValidationFE --> Services
    Services -->|"HTTPS / @supabase/supabase-js"| PostgREST
    PostgREST --> ModulosNegocio
    ModulosNegocio --> TxManager
    TxManager --> DB
    DB --> Tables
    KeepAlive -.->|"Ping Diario"| PostgREST
    Views -.-> ExportService
```

---

## 🔄 2. Flujos de Información y Diagramas de Secuencia Transaccionales

Conforme a la sección 2.10 de [`docs/disenio_tecnico_inicial.docx`](docs/disenio_tecnico_inicial.docx), los siguientes diagramas de secuencia especifican la interacción exacta entre capas para los procesos neurálgicos del negocio:

### 2.1. Flujo 1: Registro de una Venta en Punto de Venta (POS)
Garantiza que la venta, el descuento de stock, el movimiento en el kardex y la entrada de dinero en la cuenta de pago ocurran de forma atómica:

```mermaid
sequenceDiagram
    actor Vendedor
    participant POS as Frontend (NewSale.jsx)
    participant API as Backend (SalesController)
    participant Tx as Gestor de Transacciones (DB)
    participant Stock as Tabla Products
    participant Kardex as Tabla InventoryMovements
    participant Account as Tabla Accounts

    Vendedor->>POS: Agrega productos al carrito y selecciona medio de pago (Ej. Efectivo)
    POS->>POS: Valida stock visual y calcula totales y cambio
    Vendedor->>POS: Clic en "Completar Venta"
    POS->>API: POST /api/vistas/sales (payload con cliente, items, total, medio de pago)
    
    API->>Tx: Iniciar Transacción ACID (BEGIN)
    API->>Stock: SELECT stock FROM products WHERE id IN (...) FOR UPDATE
    alt Stock insuficiente para algún ítem
        Stock-->>API: Stock no disponible
        API->>Tx: ROLLBACK
        API-->>POS: Error 409 (Conflicto de stock)
        POS-->>Vendedor: Muestra notificación Toast de error
    else Stock confirmado
        API->>Stock: UPDATE products SET stock = stock - qty
        API->>Kardex: INSERT INTO inventory_movements (tipo='SALIDA_VENTA')
        API->>Account: UPDATE accounts SET balance = balance + total WHERE name='Efectivo'
        API->>Tx: INSERT INTO sales + sale_items
        API->>Tx: Confirmar Transacción (COMMIT)
        API-->>POS: Venta registrada con éxito + comprobante generado (VTA-XXX)
        POS-->>Vendedor: Muestra modal de confirmación y opción de imprimir ticket
    end
```

---

### 2.2. Flujo 2: Ciclo de Vida de Producción Propia de Plantas
Controla los tiempos biológicos no uniformes y la acumulación de costos hasta la incorporación al inventario comercial:

```mermaid
sequenceDiagram
    actor Productor
    participant UI as Frontend (Modulo Produccion)
    participant API as Backend (ProductionController)
    participant Batches as Tabla ProductionBatches
    participant Inputs as Tabla ProductionInputs
    participant Products as Tabla Products
    participant Kardex as Tabla InventoryMovements

    Productor->>UI: Registra nuevo lote (Ej. 50 Orquídeas, fecha estimada 90 días)
    UI->>API: POST /api/production/batches
    API->>Batches: INSERT estado='EN_PRODUCCION', costo_acumulado=0
    
    loop Durante el ciclo de cultivo (Semanas 1 a 12)
        Productor->>UI: Registra consumo de sustrato, macetas y fertilizante
        UI->>API: POST /api/production/batches/:id/inputs
        API->>Inputs: INSERT insumo, cantidad, costo_unitario
        API->>Batches: UPDATE costo_acumulado = costo_acumulado + costo_insumo
    end

    alt Extensión por factores climáticos (RF-43, RF-50)
        Productor->>UI: Actualiza fecha estimada con justificación
        UI->>API: PATCH /api/production/batches/:id (nueva fecha + nota)
        API->>Batches: UPDATE fecha_estimada
    end

    Productor->>UI: Marca lote como "Disponible para venta" (Ej. 46 plantas logradas)
    UI->>API: POST /api/production/batches/:id/finalize
    API->>Batches: UPDATE estado='DISPONIBLE', cantidad_final=46
    Note over API: Calcula costo unitario: Costo acumulado / 46
    API->>Products: UPDATE products SET stock = stock + 46, base_cost = costo_unitario
    API->>Kardex: INSERT movimiento='ENTRADA_PRODUCCION', qty=46
    API-->>UI: Plantas incorporadas al inventario de venta
```

---

### 2.3. Flujo 3: Registro de Compra a Proveedor y Costeo Ponderado
Maneja el abastecimiento y la actualización automática del costo promedio:

```mermaid
sequenceDiagram
    actor GestorCompras
    participant UI as Frontend (Modulo Compras)
    participant API as Backend (PurchasesController)
    participant DB as Base de Datos

    GestorCompras->>UI: Ingresa proveedor, factura, productos, cantidades y costo unitario
    UI->>API: POST /api/purchases
    Note over API: Inicia Transacción ACID
    API->>DB: INSERT INTO purchases + purchase_items
    API->>DB: INSERT INTO inventory_movements (tipo='ENTRADA_COMPRA')
    
    Note over API: Cálculo de Costo Promedio Ponderado (RF-33):<br/>((StockActual * CostoActual) + (CantComprada * CostoCompra)) / (StockTotal)
    API->>DB: UPDATE products SET stock = stock + qty, base_cost = nuevo_costo_promedio
    API->>DB: UPDATE accounts SET balance = balance - total WHERE account_id = pago_origen
    API->>DB: COMMIT
    API-->>UI: Compra registrada y catálogo valorizado
```

---

### 2.4. Flujo 4: Arqueo y Conciliación de Fondos (Efectivo vs. Cuentas)
Responde a la pregunta clave del cliente: *¿Por qué el sistema dice que debería haber $X, pero en la realidad hay $Y?*:

```mermaid
sequenceDiagram
    actor Administrador
    participant UI as Frontend (Arqueo / Conciliación)
    participant API as Backend (TreasuryController)
    participant DB as Base de Datos

    Administrador->>UI: Abre pantalla de Conciliación para "Efectivo Caja Menor"
    UI->>API: GET /api/treasury/balance/:accountId
    API->>DB: SUM(ingresos) - SUM(egresos) en la cuenta
    DB-->>API: Saldo Teórico Esperado (Ej. $1.500.000)
    API-->>UI: Muestra Saldo Teórico en pantalla
    
    Administrador->>UI: Ingresa conteo físico real de billetes y monedas (Ej. $1.420.000)
    UI->>UI: Calcula descuadre: $1.420.000 - $1.500.000 = -$80.000 (Faltante)
    Administrador->>UI: Registra motivo: "Compra urgente de agua purificada no registrada"
    Administrador->>UI: Clic en "Guardar Conciliación"
    
    UI->>API: POST /api/treasury/reconciliations (saldo_esperado, saldo_real, diferencia, justificación)
    API->>DB: INSERT INTO reconciliations
    API->>DB: INSERT INTO money_movements (tipo='AJUSTE_CONCILIACION', monto=-80000)
    API->>DB: UPDATE accounts SET balance = 1420000
    API-->>UI: Conciliación registrada. Alerta en Dashboard actualizada a "Cuadrado con Justificación".
```

---

## 🔒 3. Integridad de la Información y Reglas Operativas

Para cumplir estrictamente con los RNF-16 a RNF-21:

1. **Inmutabilidad de Transacciones Cerradas:** Una venta o compra confirmada **nunca se elimina físicamente** de la base de datos (`NO HARD DELETE`). Si se requiere una anulación, se genera un registro de anulación que revierte el inventario y genera un movimiento compensatorio en tesorería.
2. **Restricción de Integridad Referencial:** Ningún producto o proveedor con transacciones históricas puede ser eliminado (`ON DELETE RESTRICT`). Solo se permite marcarlo como `active = false` para ocultarlo en nuevos formularios.
3. **Bloqueo Pesimista en Checkout:** Para evitar condiciones de carrera en el inventario, la transacción bloquea la fila del producto (`SELECT ... FOR UPDATE`) hasta confirmar el decremento.
4. **Control de Duplicados en Cobro:** El botón de confirmación se bloquea durante el envío y la base de datos asigna el consecutivo único (`VTA-XXXX`) mediante secuencia transaccional.

---

## 🌐 4. Estrategia de Despliegue e Infraestructura (En Producción)

```mermaid
flowchart LR
    Dev["Desarrollador / Git Push"] --> GitHub["GitHub Repo (main)"]
    
    subgraph CI_CD ["Automatización (GitHub Actions + Cloudflare)"]
        GitHub --> CFBuild["Cloudflare Pages Build (Vite)"]
        Cron["GitHub Actions Cron Diario"]
    end

    subgraph Produccion ["Entorno de Producción Activo"]
        CFBuild -->|"Deploy Frontend"| CFPages["Cloudflare Pages CDN (React SPA)"]
        Supabase[("Supabase (PostgreSQL 16 + API REST/RPC)")]
        Cron -.->|"Keep-Alive Ping"| Supabase
    end

    Users["Usuaria (Desktop / Tablet / Móvil)"] -->|"HTTPS"| CFPages
    CFPages -->|"HTTPS (REST / RPC)"| Supabase
```

Esta arquitectura garantiza el cumplimiento de los 35 requisitos no funcionales, permitiendo a la iniciativa social contar con una plataforma robusta y auditable a costo $0.00.
