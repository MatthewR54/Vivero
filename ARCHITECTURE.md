# 📐 Arquitectura del Sistema — Vivero Colibrí

Este documento profundiza en la estructura técnica, distribución por capas y flujos de información del sistema **Vivero Colibrí**, complementando la especificación inicial descrita en [`docs/disenio_tecnico_inicial.docx`](docs/disenio_tecnico_inicial.docx).

---

## 🏛️ 1. Visión Arquitectónica General

El sistema se fundamenta en una **arquitectura por capas desacopladas** (Clean Architecture / N-Tier Architecture) para garantizar mantenibilidad, trazabilidad contable y evolución modular conforme a los requisitos no funcionales RNF-30 a RNF-33:

```mermaid
flowchart TD
    subgraph CapaPresentacion ["1. Capa de Presentación & Perfiles"]
        U1["👤 Administrador General"]
        U2["🛒 Personal de Ventas (Caja)"]
        U3["🌱 Operador de Cultivo & Producción"]
        U4["🚚 Gestor de Compras & Proveedores"]
    end

    subgraph CapaFrontend ["2. Capa de Aplicación Frontend (SPA)"]
        Router["React Router v7"]
        Views["Vistas Modulares (Dashboard, Inventario, POS, Finanzas)"]
        State["Gestión de Estado (TanStack Query + Context UI)"]
        ValidationFE["Validación Temprana de Formularios"]
        Http["Cliente HTTP Interceptor (Token Auth)"]
    end

    subgraph CapaBackend ["3. Capa de Lógica de Negocio (Backend API)"]
        AuthMiddleware["Middleware de Autenticación & RBAC"]
        Controllers["Controladores REST"]
        
        subgraph ModulosNegocio ["Servicios de Dominio"]
            S_Prod["Servicio de Productos & Kardex"]
            S_Sale["Servicio de Ventas & Facturación"]
            S_Plant["Servicio de Producción Biológica"]
            S_Merch["Servicio de Merchandising Personalizado"]
            S_Treasury["Servicio de Tesorería & Conciliación"]
            S_Purchase["Servicio de Compras & Costeo Ponderado"]
        end

        TxManager["Gestor de Transacciones ACID"]
    end

    subgraph CapaDatos ["4. Capa de Persistencia & Almacenamiento"]
        ORM["Prisma ORM / Conexión Nativa Pool"]
        DB[("PostgreSQL 16 Engine")]
        Tables["Tablas Relacionales + Índices + JSONB"]
    end

    subgraph ServiciosTransversales ["5. Servicios de Soporte & Respaldo"]
        BackupService["Respaldos Automáticos Diarios (PITR)"]
        ExportService["Generación y Exportación CSV / Reportes"]
    end

    CapaPresentacion -->|"HTTPS / Navegadores Modernos"| CapaFrontend
    Router --> Views
    Views --> State
    State --> ValidationFE
    ValidationFE --> Http
    Http -->|"REST API (JSON / Bearer Token)"| AuthMiddleware
    AuthMiddleware --> Controllers
    Controllers --> ModulosNegocio
    ModulosNegocio --> TxManager
    TxManager --> ORM
    ORM --> DB
    DB --> Tables
    DB -.-> BackupService
    Controllers -.-> ExportService
```

---

## 👥 2. Perfiles de Usuario y Matriz de Control de Acceso (RBAC)

El acceso a las funcionalidades y rutas se controla mediante roles (RNF-22 y RNF-23):

| Módulo / Función | Administrador | Vendedor / Caja | Operador de Producción |
| :--- | :---: | :---: | :---: |
| **Panel de Inicio (Dashboard General)** | Total | Limitado (solo KPIs de turno) | Limitado (solo alertas de cultivo) |
| **Punto de Venta (Nueva Venta, Carrito, Cobro)** | Total | Total | Sin acceso |
| **Historial de Ventas & Reimpresión de Tickets** | Total | Total | Sin acceso |
| **Gestión de Inventario (Edición de Precios/Costos)** | Total | Solo lectura | Solo lectura |
| **Ajustes de Inventario (Entradas/Salidas manuales)** | Total | Sin acceso | Con aprobación |
| **Compras & Gestión de Proveedores** | Total | Sin acceso | Sin acceso |
| **Producción Propia (Cultivo, Insumos, Cosecha)** | Total | Sin acceso | Total |
| **Merchandising Personalizado (Cotización)** | Total | Total | Sin acceso |
| **Tesorería, Arqueo de Caja y Conciliación Bancaria** | Total | Solo arqueo de caja turno | Sin acceso |
| **Métricas Financieras, Balance y Reportes** | Total | Sin acceso | Sin acceso |

---

## 🔄 3. Flujos de Información y Diagramas de Secuencia Transaccionales

Conforme a la sección 2.10 de [`docs/disenio_tecnico_inicial.docx`](docs/disenio_tecnico_inicial.docx), los siguientes diagramas de secuencia especifican la interacción exacta entre capas para los procesos neurálgicos del negocio:

### 3.1. Flujo 1: Registro de una Venta en Punto de Venta (POS)
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

### 3.2. Flujo 2: Ciclo de Vida de Producción Propia de Plantas
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

### 3.3. Flujo 3: Registro de Compra a Proveedor y Costeo Ponderado
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

### 3.4. Flujo 4: Arqueo y Conciliación de Fondos (Efectivo vs. Cuentas)
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

## 🔒 4. Integridad de la Información y Reglas Anti-Fraude

Para cumplir estrictamente con los RNF-16 a RNF-24:

1. **Inmutabilidad de Transacciones Cerradas:** Una venta o compra confirmada **nunca se elimina físicamente** de la base de datos (`NO HARD DELETE`). Si se requiere una anulación, se genera un registro de anulación que revierte el inventario y genera un movimiento compensatorio en tesorería.
2. **Restricción de Integridad Referencial:** Ningún producto o proveedor con transacciones históricas puede ser eliminado (`ON DELETE RESTRICT`). Solo se permite marcarlo como `active = false` para ocultarlo en nuevos formularios.
3. **Bloqueo Pesimista en Checkout:** Para evitar que dos clientes compren simultáneamente la última unidad de una orquídea en stock, la transacción bloquea la fila del producto (`SELECT ... FOR UPDATE`) hasta confirmar el decremento.
4. **Idempotencia en APIs de Cobro:** Cada petición de venta enviada desde el frontend lleva un identificador único idempotente para evitar duplicar cargos si el usuario presiona dos veces el botón de pago bajo mala conectividad.

---

## 🌐 5. Estrategia de Despliegue e Infraestructura

```mermaid
flowchart LR
    Dev["Desarrollador / Git Push"] --> GitHub["GitHub Repo (main)"]
    
    subgraph CI_CD ["CI / CD Automatizado"]
        GitHub --> ActionLint["Oxlint & Build Test"]
    end

    subgraph Produccion ["Entorno de Producción"]
        ActionLint -->|"Deploy Frontend"| Vercel["Vercel CDN Edge (React SPA)"]
        ActionLint -->|"Deploy Backend"| Railway["Railway / Supabase (Node API)"]
        Railway --> ManagedPG[("PostgreSQL Gestionado")]
        ManagedPG --> S3Snapshots[("Respaldos Diarios Automáticos")]
    end

    Users["Usuarios (Desktop / Tablet / Móvil)"] -->|"HTTPS"| Vercel
    Vercel -->|"API Calls (CORS)"| Railway
```

Esta arquitectura garantiza el cumplimiento de los 38 requisitos no funcionales, permitiendo a la iniciativa social contar con una plataforma robusta, segura y auditable.
