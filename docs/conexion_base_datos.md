# Conexión del frontend con la base de datos (Supabase)

**Responsable:** Samuel Solarte — Conexión y gestión de la base de datos

## Qué se hizo

Antes de este cambio, la aplicación guardaba todo en `localStorage` (en el navegador de cada persona). Aunque Supabase ya estaba configurado, ninguna pantalla lo usaba. Ahora **productos y ventas se leen y escriben en PostgreSQL (Supabase)**, así que los datos se comparten entre dispositivos y quedan respaldados.

| Pantalla | Antes | Ahora |
| :--- | :--- | :--- |
| Inventario (consultar, modificar) | localStorage | Tabla `products` |
| Registrar producto | localStorage | `INSERT` en `products` + movimiento `INICIAL` en el Kardex |
| Nueva venta | localStorage | Función `process_sale_transaction` (una sola transacción) |
| Historial de ventas | localStorage | Tablas `sales` + `sale_items` |
| Panel y Estadísticas | Datos de ejemplo | Sin cambios (tickets de otros módulos) |

## Cómo funciona

```
Página (React) → AppDataContext → services/*.js → supabase-js → Supabase (PostgreSQL)
```

- `src/services/supabaseClient.js`: crea el cliente. Si no hay credenciales, la app entra en **modo local** (localStorage) para que se pueda trabajar en diseño sin la BD.
- `src/services/productsService.js`: consulta, crea y modifica productos. Traduce los nombres de columnas (`current_stock` ↔ `stock`, `base_price` ↔ `price`, `category_id` ↔ `category`, etc.) para no tener que cambiar las páginas.
- `src/services/salesService.js`: consulta ventas con su detalle y registra ventas llamando a la función de la BD.
- `src/context/AppDataContext.jsx`: usa TanStack Query para cargar y refrescar los datos; las funciones `addSale`, `addProduct` y `updateProduct` ahora esperan la respuesta de la BD y muestran el error si algo falla.
- `src/components/ui/DataStatusBanner.jsx`: aviso de "Cargando..." o de error de conexión (por ejemplo, si el proyecto de Supabase se pausó).

## Cambios en la base de datos (`supabase/migration_01_conexion_frontend.sql`)

1. **Número de venta generado por la BD** (`VTA-XXXX` con una secuencia): dos cajas no pueden generar el mismo número. Si una venta falla, ese número se pierde y queda un salto en la numeración (comportamiento normal de PostgreSQL).
2. **Totales recalculados en el servidor** (RNF-16, RNF-24): el total no depende de lo que mande el navegador.
3. **Venta atómica** (RNF-18): descuento de stock, detalle, Kardex (`SALIDA_VENTA`) y entrada de dinero en la cuenta del medio de pago ocurren juntos o no ocurre nada. Rechaza carritos vacíos, cantidades inválidas, productos inactivos, stock insuficiente y descuentos mayores al subtotal.
4. **Costo unitario guardado en cada venta**: permite calcular ganancias reales después.
5. **Hora de Colombia**: Supabase usa UTC; las ventas ahora quedan con la hora local.
6. **Kardex del stock inicial** (RF-24, RF-28): al crear un producto se registra automáticamente su movimiento `INICIAL`.

## Pruebas realizadas

- Esquema + datos semilla + migración ejecutados en PostgreSQL local (dos veces, para comprobar que la migración es repetible).
- Función de ventas: 19 comprobaciones (venta normal, consecutivo, descuento, cuenta de dinero correcta, Kardex, y 6 casos de error que deben deshacer todo).
- Servicios del frontend contra PostgREST (la misma API que usa Supabase): consultar, crear, modificar, vender, error por SKU duplicado y por stock insuficiente.
- Navegador automatizado: el inventario carga desde la BD, se registra una venta desde la pantalla y aparece de primera en el historial con el stock actualizado.
- Modo local sin credenciales: sigue funcionando como antes.

## Pendiente / limitaciones conocidas

- **Seguridad:** las políticas RLS actuales permiten leer y modificar todas las tablas con la clave pública `anon`. Sirve para la demo, pero en producción debería agregarse inicio de sesión (Supabase Auth) y políticas por rol (RNF-22, RNF-23).
- Panel y Estadísticas siguen con datos de ejemplo; deben calcularse desde `sales`, `money_movements` y `accounts`.
- El campo "Motivo del cambio" del modal de Inventario aún no se guarda (RF-27); la tabla `inventory_movements` ya tiene la columna `reason` para eso.
