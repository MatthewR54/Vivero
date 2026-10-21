# 🗺️ Hoja de Ruta de Desarrollo (Roadmap a 4 Semanas) — Vivero Colibrí

Este documento traza el plan de ejecución táctico para que el equipo de desarrollo transforme el prototipo actual en una solución **100% lista para el cliente (Client-Ready)** en el plazo perentorio de **un mes**.

El plan aborda sistemáticamente las simulaciones ("play-pretends") identificadas en el código fuente y en la matriz de seguimiento [`docs/seguimiento_requisitos.csv`](docs/seguimiento_requisitos.csv).

---

## 🔍 1. Diagnóstico del Estado Actual vs. Brechas Críticas

```mermaid
pie title Estado de los 148 Requisitos Funcionales (docs/seguimiento_requisitos.csv)
    "Completados (Frontend)" : 17
    "En Progreso / Parciales" : 14
    "Simulados (Play-Pretend / Fijos)" : 28
    "No Iniciados (Falta Backend/Módulo)" : 89
```

### Principales Simulaciones a Eliminar:
1. **Persistencia en Navegador:** Datos almacenados en `localStorage` con límite de ~5 MB; si se borran cookies o se abre desde otro dispositivo, los datos no existen (RNF-15, RNF-22, RNF-37).
2. **Dashboard con Datos Estáticos:** Los KPIs diarios ("+18% vs día anterior", $1.850.000 de ganancia, 116 unidades vendidas) están codificados fijamente en [`src/pages/Dashboard.jsx`](src/pages/Dashboard.jsx).
3. **Conciliación Falsa ($0 Descuadre):** La sección de arqueo en [`src/pages/Statistics.jsx`](src/pages/Statistics.jsx) muestra "$0.00 Diferencia (Cuadrado)" sin permitir ingresar el conteo físico de dinero real ni registrar justificaciones (RF-102 a RF-104).
4. **Filtros Temporales Inactivos:** Los selectores *Hoy / Ayer / Últimos 7 días / Este Mes* son decorativos y no filtran registros reales por fecha.
5. **Módulos Faltantes:** Proveedores, Compras, Producción Propia de Plantas y Kardex de Inventario aún no tienen pantallas ni tablas en el backend.

---

## 📅 2. Cronograma de Sprints (Plan de 4 Semanas)

```mermaid
gantt
    title Plan de Entrega a Producción (4 Semanas)
    dateFormat  YYYY-MM-DD
    section Sprint 1: Persistencia & API
    Despliegue PostgreSQL & Migraciones     :s1_1, 2026-10-15, 3d
    Autenticación y Roles (RBAC)           :s1_2, after s1_1, 2d
    Migración Productos/Ventas a API       :s1_3, after s1_2, 3d
    section Sprint 2: Core ERP & Kardex
    Módulo de Proveedores                  :s2_1, 2026-10-22, 2d
    Módulo de Compras & Costo Promedio     :s2_2, after s2_1, 3d
    Kardex de Inventario & Ajustes         :s2_3, after s2_2, 3d
    section Sprint 3: Procesos Especializados
    Producción Propia de Plantas           :s3_1, 2026-10-29, 4d
    Merchandising Personalizado            :s3_2, after s3_1, 3d
    section Sprint 4: Tesorería & Cierre
    Cuentas, Arqueo y Conciliación         :s4_1, 2026-11-05, 3d
    Dashboard Dinámico & Reportes          :s4_2, after s4_1, 2d
    Pruebas Responsive y Despliegue Final  :s4_3, after s4_2, 2d
```

---

### 🚀 Sprint 1 (Semana 1): Capa de Datos Real y Backend Base
> **Objetivo:** Erradicar `localStorage` y conectar el frontend existente a una base de datos relacional con autenticación.

- [x] **Infraestructura de Datos:**
  - ~~Crear proyecto PostgreSQL en Supabase / Railway.~~ ✅ Proyecto Supabase creado y configurado.
  - ~~Ejecutar migraciones del esquema relacional definido en [`TECHSTACK.md`](TECHSTACK.md).~~ ✅ Esquema ejecutado vía `supabase/schema.sql`.
  - ~~Ejecutar script de seed inicial con los datos de [`src/data/seedData.js`](src/data/seedData.js).~~ ✅ Datos semilla cargados vía `supabase/seed.sql`.
- [ ] **Autenticación & Seguridad:**
  - Implementar login con correo y contraseña.
  - Generar sesión con JWT y control de roles (*Administrador*, *Vendedor*, *Operador*).
  - Añadir pantalla de inicio de sesión (`/login`) y protección de rutas en React Router.
- [x] **Migración de Módulos Existentes:**
  - ~~Instalar `@tanstack/react-query` en el frontend.~~ ✅ Instalado `@tanstack/react-query` v5 y `@supabase/supabase-js`. `QueryClientProvider` configurado en `src/main.jsx` con caché de 5 min, gc de 30 min y retry de 1 intento.
  - ~~Crear cliente Supabase y capa de servicios.~~ ✅ Creados `src/services/supabaseClient.js`, `src/services/productsService.js` y `src/hooks/useProducts.js`.
  - Conectar [`src/pages/Inventory.jsx`](src/pages/Inventory.jsx) al endpoint `GET /api/products` y `PATCH /api/products/:id`.
  - Conectar [`src/pages/NewSale.jsx`](src/pages/NewSale.jsx) al endpoint transaccional `POST /api/sales`.
  - Conectar [`src/pages/Sales.jsx`](src/pages/Sales.jsx) con paginación y búsqueda en servidor.

---

### 📦 Sprint 2 (Semana 2): Proveedores, Compras y Kardex de Inventario
> **Objetivo:** Cerrar el ciclo de abastecimiento de productos adquiridos y habilitar la trazabilidad de inventario.

- [ ] **Módulo de Proveedores (RF-10 a RF-14):**
  - Crear vista `/proveedores` con listado, buscador y formulario de alta/edición.
  - Asociar productos del catálogo con sus respectivos proveedores habituales.
- [ ] **Módulo de Compras (RF-15 a RF-22):**
  - Implementar vista `/compras/nueva` para registrar facturas de proveedores.
  - Actualización automática de existencias al ingresar una compra.
  - Recálculo automático del **costo promedio ponderado** (RF-33).
- [ ] **Kardex y Movimientos de Inventario (RF-24 a RF-30):**
  - Pantalla o pestaña de *Historial de Movimientos* por producto.
  - Modal para **Ajustes de Inventario** con campo obligatorio de justificación/motivo (merma, rotura, donación social).

---

### 🌿 Sprint 3 (Semana 3): Producción Propia de Plantas & Merchandising
> **Objetivo:** Incorporar las dinámicas especializadas de cultivo biológico y personalización comunitaria.

- [ ] **Producción Biológica de Vivero (RF-36 a RF-50):**
  - Vista `/produccion` para monitorear lotes activos.
  - Formulario de alta de lote: especie, cantidad inicial, fecha de inicio y fecha estimada de maduración.
  - Registro de insumos aplicados (sustrato, fertilizantes, macetas) y acumulación de costos.
  - Transición de estados: *En producción* → *En crecimiento* → *Disponible para venta*.
  - Acción de cierre de lote: cálculo del costo unitario real y traspaso automático al catálogo de venta.
  - Alerta de lotes con tiempo excedido o condiciones climáticas adversas (RF-43, RF-50).
- [ ] **Merchandising Personalizado (RF-51 a RF-60):**
  - Vista/Cotizador de personalizaciones comunitarias:
    - Selección de producto base (ej. camiseta, maceta artesanal).
    - Adición de costos de materiales extras y mano de obra.
    - Fijación de precio final y cálculo automático del margen de ganancia proyectado.
  - Registro del pedido en el historial de productos personalizados vendidos.

---

### 💰 Sprint 4 (Semana 4): Tesorería, Conciliación Real, Dashboard y Despliegue
> **Objetivo:** Proveer transparencia financiera total, reportes auditables y dejar el sistema operando en producción.

- [ ] **Control de Fondos y Arqueo (RF-93 a RF-104):**
  - Módulo de cuentas: Efectivo (caja menor), Nequi, Bancolombia.
  - Pantalla interactiva de **Arqueo y Conciliación**:
    - Muestra el saldo teórico esperado calculado por el sistema.
    - Campo para ingresar el dinero físico contado.
    - Cálculo visual de diferencias (Faltante / Sobrante).
    - Campo obligatorio de justificación del descuadre para auditoría.
- [ ] **Cierre Diario y Métricas Reales (RF-105 a RF-122):**
  - Conectar el Dashboard para que los KPIs reflejen ventas, ingresos y egresos del día en tiempo real.
  - Hacer funcionales los botones de filtro temporal (*Hoy, Ayer, 7 días, Mes actual, Rango personalizado*).
  - Gráfico dinámico de ingresos vs. egresos con datos reales de la base de datos.
- [ ] **Reportes y Exportación (RF-123 a RF-138):**
  - Exportación en CSV de reportes de inventario, compras, conciliaciones y ventas.
- [ ] **Validación No Funcional & Entrega:**
  - Pruebas de diseño responsive en teléfonos inteligentes y tabletas (RNF-07 a RNF-10).
  - Verificación de copias de seguridad automáticas (RNF-25).
  - Despliegue final en producción (Frontend en Cloudflare Pages, Backend en Supabase).
  - Capacitación del cliente y entrega formal de credenciales.

---

## ⚠️ 3. Matriz de Riesgos y Planes de Contingencia

| Riesgo Identificado | Impacto | Probabilidad | Estrategia de Mitigación |
| :--- | :---: | :---: | :--- |
| **Poco tiempo del equipo para desarrollar backend desde cero** | Alto | Alta | **Usar Supabase BaaS**. Permite tener PostgreSQL, autenticación y API REST operativa en 2 días, ahorrando más del 60% del tiempo de desarrollo de backend. |
| **Resistencia o errores del usuario al registrar arqueos de caja** | Alto | Media | Interfaz simple paso a paso con advertencias claras de color ante faltantes y recordatorio amable de registrar la justificación. |
| **Pérdida de conectividad a internet en el vivero físico** | Medio | Media | El navegador mantiene la sesión abierta; en caso de caída temporal, el POS muestra alerta informativa clara para reintentar al reconectar. |

---

*Para dudas de implementación técnica o especificaciones de esquemas, referirse a [`TECHSTACK.md`](TECHSTACK.md) y [`ARCHITECTURE.md`](ARCHITECTURE.md).*
