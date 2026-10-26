# 🌿 Vivero Colibrí — Sistema de Gestión Integral & ERP Comunitario

[![React](https://img.shields.io/badge/Frontend-React%2019-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Bundler-Vite%208-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Oxlint](https://img.shields.io/badge/Linter-Oxlint-orange)](https://oxc.rs/)
[![Estado](https://img.shields.io/badge/Estado-Prototipo%20MVP%20%E2%86%92%20Transición%20a%20Producción-2ea44f)](#-estado-actual-del-desarrollo)
[![Licencia](https://img.shields.io/badge/Proyecto-Labor%20Social-green)](#-contexto-y-propósito)

Sistema web modular para la administración operativa, trazabilidad de producción agrícola, punto de venta y control financiero del emprendimiento social **Vivero Colibrí**. Desarrollado como parte de una iniciativa de labor social para optimizar el control de inventario, costos de cultivo, personalización de merchandising y conciliación de caja en tiempo real.

---

## 📋 Índice

- [Contexto y Propósito](#-contexto-y-propósito)
- [Funcionalidades y Módulos](#-funcionalidades-y-módulos)
- [Estado Actual del Desarrollo](#-estado-actual-del-desarrollo)
- [Estructura del Repositorio](#-estructura-del-repositorio)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Puesta en Marcha](#-instalación-y-puesta-en-marcha)
- [Scripts Disponibles](#-scripts-disponibles)
- [Arquitectura y Stack Tecnológico](#-arquitectura-y-stack-tecnológico)
- [Documentación del Proyecto](#-documentación-del-proyecto)
- [Flujo de Trabajo y Contribución](#-flujo-de-trabajo-y-contribución)

---

## 🎯 Contexto y Propósito

A diferencia de un software de inventario convencional, **Vivero Colibrí** requiere responder a una dinámica operativa mixta y especializada:

1. **Producción propia de plantas:** Los tiempos de cultivo son variables y dependen de factores biológicos y climáticos. No es un inventario inmediato: requiere rastrear etapas (*En producción* → *En crecimiento* → *Disponible para venta*), insumos acumulados (tierra, macetas, fertilizantes) y costeo real antes de incorporarse al stock comercial.
2. **Merchandising personalizado:** Artículos comunitarios (camisetas, accesorios, macetas decoradas) cuyo costo y precio final son variables y dependen de la mano de obra, insumos y especificaciones de cada cliente.
3. **Comercialización de productos adquiridos:** Reventa de insumos o productos terminados con cálculo de costo promedio ponderado y margen de ganancia.
4. **Control financiero riguroso y arqueo de caja:** Transparencia absoluta en el manejo de fondos para la labor social, diferenciando dinero en **Efectivo** vs. **Cuentas bancarias / billeteras virtuales (Nequi, Bancolombia)**, con conciliaciones periódicas y registro de justificaciones ante descuadres.

---

## 🧩 Funcionalidades y Módulos

El sistema está diseñado en torno a 14 bloques funcionales especificados en [`docs/requisitos.md`](docs/requisitos.md):

| Módulo | Alcance Principal |
| :--- | :--- |
| **🏠 Panel de Inicio (Dashboard)** | KPIs económicos diarios, alertas de bajo stock, procesos de cultivo en curso, resumen de transacciones y estado de conciliación. |
| **📦 Gestión de Inventario** | Catálogo unificado por origen (*Producción Vivero*, *Merchandising Social*, *Adquirido*), edición rápida de existencias, cálculo de márgenes y semáforo de alertas (*Crítico*, *Alerta Mínimo*, *Óptimo*). |
| **🛒 Punto de Venta (POS)** | Registro de ventas presenciales y virtuales, carrito con validación de stock disponible, cálculo de cambio en efectivo, soporte de múltiples medios de pago y generación de comprobantes. |
| **📊 Métricas & Estadísticas** | Resumen de ingresos vs. egresos, ganancia neta estimada, margen global, gráficos comparativos y reporte de conciliación en libros. |
| **🌱 Producción Propia** *(Próxima fase)* | Trazabilidad de lotes de siembra, registro de insumos consumidos, fechas estimadas de cosecha/maduración y pase automático a inventario al estar disponible. |
| **🎨 Merchandising Personalizado** *(Próxima fase)* | Cotizador de personalizaciones (costo base + materiales adicionales + mano de obra), margen proyectado e historial de pedidos especiales. |
| **🚚 Proveedores & Compras** *(Próxima fase)* | Directorio de proveedores, registro de órdenes de compra con actualización automática de stock y cálculo de costo promedio. |
| **💰 Tesorería & Arqueo** *(Próxima fase)* | Arqueo físico de caja, conciliación bancaria, registro de transferencias internas y justificación documentada de descuadres. |

---

## 📊 Estado Actual del Desarrollo

Actualmente, el repositorio cuenta con un **prototipo funcional** construido en React 19 + Vite, con productos y ventas ya conectados a **Supabase (PostgreSQL)**:

- ✅ **Interfaz de Usuario Completa:** Navegación modular responsive (computador, tablet y móvil).
- ✅ **Catálogo y Registro de Productos:** Creación con generación automática de SKU según categoría y edición modal.
- ✅ **Flujo de Venta Interactivo:** Selección visual de productos, carrito dinámico, validación de stock y emisión de tickets.
- ✅ **Exportación de Ventas:** Descarga de historial en formato CSV.
- ✅ **Persistencia Real en PostgreSQL (Supabase):** Inventario, registro de productos, nueva venta e historial de ventas leen y escriben en la base de datos mediante la capa [`src/services/`](src/services/) y TanStack Query. Cada venta es **atómica** (función `process_sale_transaction`): descuenta stock, registra el Kardex y suma el dinero a la cuenta del medio de pago. Detalles en [`docs/conexion_base_datos.md`](docs/conexion_base_datos.md).
- ⚠️ **Datos de Ejemplo Restantes:** El Panel de Inicio y Estadísticas aún muestran datos semilla de [`src/data/seedData.js`](src/data/seedData.js). Sin credenciales de Supabase, la app funciona en **modo local** (`localStorage`) mediante [`src/context/AppDataContext.jsx`](src/context/AppDataContext.jsx).
- 🎯 **Meta Inmediata:** Calcular Panel y Estadísticas desde la base de datos y construir los módulos faltantes (Proveedores, Compras, Kardex, Producción, Tesorería) para la entrega al cliente.

Para consultar el seguimiento detallado de cada uno de los 148 requisitos funcionales y 35 no funcionales, revisa [`docs/seguimiento_requisitos.csv`](docs/seguimiento_requisitos.csv).

---

## 📁 Estructura del Repositorio

```text
Vivero/
├── docs/                               # Especificación y diseño técnico formal
│   ├── conexion_base_datos.md          # Conexión del frontend con Supabase
│   ├── disenio_tecnico_inicial.docx    # Documento de arquitectura por capas
│   ├── disenio_tecnico_inicial.png     # Diagrama arquitectónico general
│   ├── requisitos.md                   # Catálogo oficial de RFs y RNFs
│   └── seguimiento_requisitos.csv      # Matriz de trazabilidad y cobertura
├── public/                             # Recursos estáticos servidos por Vite
├── src/                                # Código fuente de la aplicación
│   ├── assets/                         # Imágenes e iconografía
│   ├── components/
│   │   ├── layout/                     # Barras de navegación y envolventes
│   │   └── ui/                         # Notificaciones (Toast) y aviso de conexión (DataStatusBanner)
│   ├── context/
│   │   └── AppDataContext.jsx          # Estado global y orquestación de datos
│   ├── data/
│   │   └── seedData.js                 # Datos semilla iniciales (mock / modo local)
│   ├── hooks/                          # Hooks de TanStack Query (useProducts)
│   ├── pages/                          # Vistas principales del sistema
│   │   ├── Dashboard.jsx               # Panel de control e indicadores
│   │   ├── Inventory.jsx               # Tabla de inventario y edición
│   │   ├── NewProduct.jsx              # Formulario de alta de producto
│   │   ├── NewSale.jsx                 # Terminal Punto de Venta (POS)
│   │   ├── Sales.jsx                   # Historial de ventas y comprobantes
│   │   └── Statistics.jsx              # Métricas financieras y gráficos
│   ├── services/                       # Cliente Supabase y servicios de productos y ventas
│   ├── styles/                         # Variables CSS y estilos globales
│   ├── utils/                          # Utilidades matemáticas, moneda COP y exportación
│   ├── App.jsx                         # Enrutador principal (React Router v7)
│   └── main.jsx                        # Punto de entrada de la aplicación
├── supabase/                           # Scripts SQL para PostgreSQL y Supabase
│   ├── schema.sql                      # Esquema DDL completo (tablas, RLS, procedimientos)
│   ├── seed.sql                        # Datos semilla iniciales del catálogo y cuentas
│   └── migration_01_conexion_frontend.sql # Venta atómica v2, consecutivo VTA, Kardex inicial y permisos
├── ARCHITECTURE.md                     # Arquitectura de software y flujos de datos
├── CONTRIBUTING.md                     # Guía de contribución y ramas de Git
├── ROADMAP.md                          # Plan de trabajo a 4 semanas para entrega
├── TECHSTACK.md                        # Definición técnica y justificación de BD
├── package.json                        # Dependencias y scripts de npm
└── vite.config.js                      # Configuración de empaquetado Vite
```

---

## 💻 Requisitos Previos

Asegúrate de contar con las siguientes herramientas en tu entorno de desarrollo:

- **Node.js:** Versión `20.19.0+` o `22.12.0+` (Recomendado: LTS actual).
- **npm:** Versión `10.0.0+` (incluido con Node.js).
- **Git:** Para control de versiones.
- Navegador web moderno (Chrome, Edge, Firefox, Safari).

---

## 🚀 Instalación y Puesta en Marcha

Sigue estos pasos para clonar y ejecutar el entorno de desarrollo local:

```bash
# 1. Clonar el repositorio
git clone https://github.com/MatthewR54/Vivero.git
cd Vivero

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo local
npm run dev
```

La consola mostrará la URL local (usualmente `http://localhost:5173/`). Abre esta dirección en tu navegador para interactuar con la aplicación.

---

## 🛠️ Scripts Disponibles

En el directorio del proyecto puedes ejecutar:

| Comando | Descripción |
| :--- | :--- |
| `npm run dev` | Inicia el servidor de desarrollo Vite con Hot Module Replacement (HMR). |
| `npm run build` | Compila y empaqueta la aplicación para producción en la carpeta `dist/`. |
| `npm run preview` | Ejecuta un servidor local para previsualizar la compilación de producción. |
| `npm run lint` | Analiza el código fuente con [Oxlint](https://oxc.rs/) para detectar problemas de calidad y estilo. |

---

## 🏗️ Arquitectura y Stack Tecnológico

El proyecto ya opera como solución cliente-servidor sobre Supabase:

- **Frontend:** React 19, Vite 8, React Router DOM 7, TanStack Query v5, Lucide Icons, CSS Modular con variables nativas.
- **Backend:** ✅ **Supabase** (API REST autogenerada sobre PostgreSQL + funciones SQL transaccionales vía RPC).
- **Base de Datos:** ✅ **PostgreSQL** relacional con soporte ACID (evaluación y descarte fundamentado de NoSQL en [`TECHSTACK.md`](TECHSTACK.md)).
- **Despliegue:** Frontend en Cloudflare Pages; Base de Datos en Supabase (ver [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md)).

Para revisar la justificación arquitectónica completa y el análisis comparativo de bases de datos, consulta [`TECHSTACK.md`](TECHSTACK.md) y [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 📚 Documentación del Proyecto

El repositorio cuenta con documentación exhaustiva para guiar el desarrollo:

1. [**`DEPLOYMENT_GUIDE.md`**](DEPLOYMENT_GUIDE.md): Guía de despliegue y servicios a **costo $0.00** (Cloudflare Pages, Supabase con keep-alive, PocketBase y TanStack Query).
2. [**`PENDING_TASKS.md`**](PENDING_TASKS.md): Checklist de tareas pendientes que son **desarrollables de inmediato** sin servicios externos.
3. [**`TECHSTACK.md`**](TECHSTACK.md): Análisis técnico, resolución de la duda NoSQL vs. Relacional, modelo entidad-relación y stack de producción.
4. [**`ARCHITECTURE.md`**](ARCHITECTURE.md): Diagramas de capas, flujos de datos transaccionales y contratos de API.
5. [**`ROADMAP.md`**](ROADMAP.md): Plan de acción detallado semana a semana para alcanzar el estado *client-ready* el próximo mes.
6. [**`CONTRIBUTING.md`**](CONTRIBUTING.md): Guía de estilo, convención de ramas y flujo de pull requests.
7. [**`docs/requisitos.md`**](docs/requisitos.md): Especificación formal de requisitos funcionales y no funcionales.
8. [**`docs/seguimiento_requisitos.csv`**](docs/seguimiento_requisitos.csv): Matriz de progreso requisito por requisito.
9. [**`docs/conexion_base_datos.md`**](docs/conexion_base_datos.md): Cómo se conectaron productos y ventas con Supabase, pruebas realizadas y limitaciones conocidas.
10. [**`supabase/schema.sql`**](supabase/schema.sql), [**`supabase/seed.sql`**](supabase/seed.sql) & [**`supabase/migration_01_conexion_frontend.sql`**](supabase/migration_01_conexion_frontend.sql): Scripts SQL ejecutables para el aprovisionamiento de PostgreSQL, función transaccional ACID y datos de prueba.

---

## 🤝 Flujo de Trabajo y Contribución

1. Crea una rama descriptiva a partir de `main` (ejemplo: `feature/modulo-compras` o `fix/validacion-pago`).
2. Realiza cambios modulares preservando comentarios y estructura.
3. Ejecuta `npm run lint` y `npm run build` para asegurar que el proyecto compile sin advertencias críticas.
4. Envía un Pull Request describiendo los requisitos abordados. Consulta [`CONTRIBUTING.md`](CONTRIBUTING.md) para más detalles.

---

*Proyecto de desarrollo colaborativo para Labor Social — Vivero Colibrí © 2026*
