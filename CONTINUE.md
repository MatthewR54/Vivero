# 🚀 Handover & Continuation Guide — Vivero Colibrí

> **Crucial Instruction for the Next Agent:**
> While this continuation prompt is written in English for clarity and technical detail, **ALL user-facing communication, UI text, form labels, code comments, documentation entries, and tracking matrices MUST be written in Spanish** (`es-CO`). The client and team are Spanish speakers and the entire application is localized in Spanish.

---

## 📌 Executive Summary & Project Context

This workspace is a web application (React 19 + Vite + Tailwind/CSS variables + Supabase + Cloudflare Pages) built for **Vivero Colibrí**, a vivarium and social merchandising enterprise.
- **Single-User Architecture:** All authentication, user management, and security/RBAC requirements (`RNF-22`, `RNF-23`, `RNF-24`) were formally scrapped because the client herself is the sole operator. Never re-introduce authentication or login screens.
- **Dual Persistence Architecture:** The application operates in dual mode:
  1. **Supabase Mode:** Enabled automatically when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist in `.env`. Queries live tables via TanStack Query and services in [`src/services/`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/services/).
  2. **Local Fallback Mode (`localStorage`):** Active when credentials are absent or during offline testing, using data in [`src/data/seedData.js`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/data/seedData.js).
  *Rule:* Every new feature must preserve both paths without breaking offline functionality.
- **Requirement Tracking:** Always update [`PENDING_TASKS.md`](file:///C:/Users/Janus/Documents/GitHub/Vivero/PENDING_TASKS.md), [`ROADMAP.md`](file:///C:/Users/Janus/Documents/GitHub/Vivero/ROADMAP.md), and [`docs/seguimiento_requisitos.csv`](file:///C:/Users/Janus/Documents/GitHub/Vivero/docs/seguimiento_requisitos.csv) whenever tasks or requirements are completed.

---

## 🏁 Progress Accomplished So Far

Sprint 1 and Sprint 2 from [`ROADMAP.md`](file:///C:/Users/Janus/Documents/GitHub/Vivero/ROADMAP.md) are **100% completed**.
Current requirement count: **84 Completed (`Completado`)**, **10 In Progress (`En progreso`)**, **1 In Testing/Simulated**, **53 Not Started (`No iniciado`)** out of 148 functional requirements (`RF-*`).

### Completed Modules:
1. **Section 1: Dynamic Dashboard & Date Filters (Sprint 4)**
   - Replaced all hardcoded values with real-time aggregates from Supabase.
   - Connected temporal filter chips (*Hoy*, *Ayer*, *Últimos 7 días*, *Este Mes*).
   - Dynamic KPIs, real-time alerts for low stock and active cultivation batches.
2. **Section 2: Cash Reconciliation & Treasury (Sprint 4)**
   - Interactive cash count and bank reconciliation modals in [`src/pages/Statistics.jsx`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/pages/Statistics.jsx).
   - Automatic discrepancy calculation (Surplus/Deficit), mandatory justification notes, account balance adjustment, and account-to-account transfers (`RF-101`–`RF-104`).
   - Audit history table in `Statistics.jsx` connected to `public.reconciliations`.
3. **Section 3: Inventory Control & Kardex (Sprint 2)**
   - Manual Stock Adjustment modal in [`src/pages/Inventory.jsx`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/pages/Inventory.jsx) (`RF-26`, `RF-27`) with mandatory reason category and real-time stock preview (`AJUSTE_MANUAL_ENTRADA` / `AJUSTE_MANUAL_SALIDA`).
   - Kardex Movement History modal (`RF-09`, `RF-28`–`RF-30`) with product and date filtering, and CSV export.
   - Active/Inactive product visibility toggle (`RF-08`) and complete technical sheet editing (`unit`, `location`, `description` — `RF-02`, `RF-07`).
4. **Section 4: Suppliers Management Module (Sprint 2)**
   - Created [`src/services/suppliersService.js`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/services/suppliersService.js) and [`src/pages/Suppliers.jsx`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/pages/Suppliers.jsx) (`RF-10`–`RF-14`).
   - Route `/proveedores` added in Navbar and `App.jsx`.
   - Supplier–Product linkage enabled in New Product, Inventory edit modal, and Supplier details modal.
5. **Section 5: Purchase Orders & Supply Module (Sprint 2)**
   - Implemented [`calculateWeightedAverageCost`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/utils/calculations.js) (`RF-33`).
   - Implemented purchase transaction [`createPurchase`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/services/suppliersService.js) and `addPurchase` in [`src/context/AppDataContext.jsx`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/context/AppDataContext.jsx).
   - Created `/compras/nueva` in [`src/pages/NewPurchase.jsx`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/pages/NewPurchase.jsx): allows selecting a supplier, auto-loading their habitual products, recording quantities and costs, calculating weighted average costs in real time, and deducting payment from the chosen account (`RF-15`–`RF-20`, `RF-96`).
   - Created `/compras` in [`src/pages/Purchases.jsx`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/pages/Purchases.jsx): shows purchase invoices, filters by period/supplier, shows invoice item breakdowns, and exports to CSV (`RF-21`, `RF-22`, `RF-127`).
   - Connected all "Registrar Compra" buttons in Dashboard, Inventory, and Suppliers to `/compras/nueva`.

---

## 🎯 What to Develop Next

Refer directly to [`PENDING_TASKS.md`](file:///C:/Users/Janus/Documents/GitHub/Vivero/PENDING_TASKS.md) for the detailed checklist. The immediate priority is **Section 6** (Sprint 3):

### 1. Section 6: Lotes de Cultivo y Producción Propia de Plantas (`RF-36` to `RF-50`)
- **Database Context:** The tables `public.production_batches` and `public.production_inputs` already exist in [`supabase/schema.sql`](file:///C:/Users/Janus/Documents/GitHub/Vivero/supabase/schema.sql#L137-L177).
- **Service Layer:** In [`src/services/financeService.js`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/services/financeService.js), `fetchProductionBatches` already exists, but you need functions to:
  - Create a new batch (`createProductionBatch`).
  - Add inputs/supplies to a batch (`addProductionInput` or update `accumulated_cost`).
  - Update batch status (`EN_PRODUCCION` → `EN_CRECIMIENTO` → `DISPONIBLE`).
  - Complete a batch / Transfer to inventory (`closeProductionBatch`): calculates unit cost (`accumulatedCost / finalQuantity`), increases product stock in `products` (or creates a new product), and registers `ENTRADA_PRODUCCION` in `inventory_movements`.
- **UI:** Create `src/pages/Production.jsx` and `src/pages/Production.css` (accessible via route `/produccion` and link in Navbar):
  - Batch monitoring cards / table showing stage, days in cultivation, estimated readiness vs today's date (highlighting delayed batches — `RF-50`).
  - Modals for creating batch, adding inputs, and closing batch into sales inventory.

### 2. Section 7: Cotizador de Merchandising Personalizado (`RF-51` to `RF-60`)
- In [`src/pages/NewSale.jsx`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/pages/NewSale.jsx), allow custom pricing, base garment cost + customization cost inputs, and custom design notes saved into `custom_merch_orders` / sale ticket.

### 3. Section 8: Búsquedas, Reportes y Validaciones Inmediatas
- Multi-product search in [`src/pages/Sales.jsx`](file:///C:/Users/Janus/Documents/GitHub/Vivero/src/pages/Sales.jsx) (`RF-72`, `RF-73`, `RF-75`).
- Input validation guards in form submissions (`RNF-16`, `RNF-17`).

---

## 🔍 Unmentioned Things & Subtleties to Keep in Mind

1. **`edit_file` on Windows CRLF:**
   - Multi-line `edit_file` targets on CRLF files can fail if line breaks differ. If replacing whole files, prefer `write_file` with `Overwrite: true`. For CSV updates, use a small Python script via `python .../scratch/...` to avoid formatting anomalies.
2. **PostgreSQL Enum / Check Constraints in Supabase:**
   - `inventory_movements.movement_type`: allowed values are strictly `'INICIAL'`, `'ENTRADA_COMPRA'`, `'ENTRADA_PRODUCCION'`, `'AJUSTE_MANUAL_ENTRADA'`, `'AJUSTE_MANUAL_SALIDA'`, `'SALIDA_VENTA'`.
   - `products.origin`: allowed values are strictly `'Producción Vivero'`, `'Merchandising Social'`, `'Adquirido (Distribuidora)'`, `'Adquirido'`.
   - `money_movements.movement_type`: allowed values are strictly `'INGRESO_VENTA'`, `'EGRESO_COMPRA'`, `'GASTO_OPERATIVO'`, `'TRANSFERENCIA'`, `'AJUSTE_CONCILIACION'`.
3. **Sales List in `Sales.jsx`:**
   - Currently, all sales are fetched and filtered in-memory. For small-to-medium datasets this works smoothly, but keep in mind that pagination is in memory.
4. **Verification Step:**
   - Always run `npm run lint; npm run build` before reporting completion to ensure zero lint errors and a passing production build.
