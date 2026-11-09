El sistema no es simplemente un inventario + ventas, sino que maneja **costos promedio ponderados variables, lotes de producción biológica con tiempos diferentes y control financiero contra el dinero realmente disponible en efectivo y cuentas**.

En el merchandising personalizado, el precio final y la ganancia dependen del costo base de la prenda más el trabajo y técnica de personalización.

# **Requisitos funcionales**

## **1. Gestión de productos**

**RF-01.** El sistema deberá permitir registrar productos en el catálogo con generación automática de código SKU según su línea.

**RF-02.** El sistema deberá permitir modificar la información técnica, comercial y de inventario de los productos registrados.

**RF-03.** El sistema deberá permitir consultar y buscar productos en tiempo real por nombre, código SKU o ubicación.

**RF-04.** El sistema deberá permitir clasificar los productos en las categorías operativas del negocio (*Vivero y Plantas*, *Merchandising Social* y *Comestibles / Insumos Adquiridos*).

**RF-05.** El sistema deberá permitir registrar y actualizar el costo unitario y el precio base de venta para los productos, calculando su margen de rentabilidad.

**RF-06.** El sistema deberá permitir registrar si un producto es adquirido a un proveedor, producido por el vivero o elaborado como merchandising personalizado.

**RF-07.** El sistema deberá permitir registrar las características, unidad de medida, ubicación en vivero/bodega y descripción o notas de cuidado de cada producto.

**RF-08.** El sistema deberá permitir activar o desactivar la visibilidad de los productos en el punto de venta sin eliminar su historial de movimientos.

**RF-09.** El sistema deberá permitir consultar el historial completo de operaciones (Kardex) asociadas a cada producto.

# **2. Gestión de proveedores**

**RF-10.** El sistema deberá permitir registrar proveedores con sus datos de contacto comercial, teléfono, correo electrónico y dirección/bodega.

**RF-11.** El sistema deberá permitir modificar la información y el estado (activo/inactivo) de los proveedores registrados.

**RF-12.** El sistema deberá permitir consultar y buscar proveedores por razón social, contacto, teléfono, correo o ubicación.

**RF-13.** El sistema deberá permitir asociar productos del catálogo con sus respectivos proveedores habituales.

**RF-14.** El sistema deberá permitir consultar el historial de facturas de compras realizadas a cada proveedor.

# **3. Gestión de compras**

**RF-15.** El sistema deberá permitir registrar compras de abastecimiento realizadas a proveedores con número de factura o referencia.

**RF-16.** El sistema deberá permitir registrar la fecha de realización de cada compra.

**RF-17.** El sistema deberá permitir registrar los productos y cantidades adquiridas en cada compra, incluyendo la carga rápida de los productos habituales del proveedor.

**RF-18.** El sistema deberá permitir registrar el costo unitario de adquisición de cada producto comprado.

**RF-19.** El sistema deberá calcular automáticamente los subtotales por línea y el costo total de la compra.

**RF-20.** El sistema deberá incrementar automáticamente las existencias del inventario al confirmar una compra.

**RF-21.** El sistema deberá permitir consultar el historial de compras registradas y ver el detalle de cada factura.

**RF-22.** El sistema deberá permitir filtrar las compras realizadas por proveedor y por período determinado (*Todo*, *Hoy*, *Últimos 7 días*, *Este Mes*).

# **4. Gestión de inventario**

**RF-23.** El sistema deberá permitir consultar las existencias actuales de cada producto junto con su estado de abastecimiento (*Óptimo*, *Alerta*, *Crítico*).

**RF-24.** El sistema deberá registrar en el Kardex todas las entradas de productos al inventario (*Inventario inicial*, *Entrada por compra*, *Entrada por producción propia* y *Ajuste manual de entrada*).

**RF-25.** El sistema deberá registrar en el Kardex todas las salidas de productos del inventario (*Salida por venta* y *Ajuste manual de salida / merma*).

**RF-26.** El sistema deberá permitir registrar ajustes manuales de inventario tanto de entrada como de salida o merma, previsualizando el stock resultante.

**RF-27.** El sistema deberá exigir un motivo categorizado (*Planta marchita/dañada*, *Conteo físico*, *Donación*, *Autoconsumo vivero*, etc.) y permitir observaciones en cada ajuste de inventario.

**RF-28.** El sistema deberá mantener un historial inmutable de movimientos de inventario (Kardex) con el saldo posterior a cada operación.

**RF-29.** El sistema deberá permitir consultar y filtrar los movimientos de inventario por producto específico.

**RF-30.** El sistema deberá permitir consultar y filtrar los movimientos de inventario por período y por sentido del movimiento (entradas o salidas).

**RF-31.** El sistema deberá permitir establecer una cantidad mínima de inventario (stock mínimo de alerta) para cada producto.

**RF-32.** El sistema deberá generar alertas visuales automáticas en el Inventario y en el Panel Principal cuando las existencias de un producto estén por debajo o cerca del nivel mínimo establecido.

**RF-33.** El sistema deberá recalcular automáticamente el costo promedio ponderado de los productos al registrar nuevas compras o ingresos de producción.

**RF-34.** El sistema deberá diferenciar y permitir filtrar los productos adquiridos a distribuidores, los producidos por el vivero y los de merchandising social.

**RF-35.** El sistema deberá actualizar automáticamente el stock disponible cada vez que se registre una venta, compra, cosecha de lote o ajuste manual.

# **5. Gestión de producción propia**

Como las plantas **no tienen todas el mismo tiempo de producción**, el sistema gestiona lotes de cultivo con seguimiento de etapas biológicas, costos acumulados y fechas estimadas de disponibilidad.

**RF-36.** El sistema deberá permitir registrar lotes de procesos de producción y propagación de plantas con código único de lote.

**RF-37.** El sistema deberá permitir registrar la especie o tipo de planta en producción y vincularla opcionalmente a un producto del catálogo.

**RF-38.** El sistema deberá permitir registrar la cantidad inicial de plantas/esquejes sembrados y actualizar la cantidad sobreviviente actual del lote.

**RF-39.** El sistema deberá permitir registrar la fecha de inicio del proceso de producción.

**RF-40.** El sistema deberá permitir registrar y actualizar una fecha estimada de disponibilidad para la venta.

**RF-41.** El sistema deberá permitir registrar los insumos, materiales y labores utilizados durante el proceso de producción (*sustrato*, *macetas*, *fertilizante*, *mano de obra*, etc.).

**RF-42.** El sistema deberá permitir registrar la cantidad, unidad de medida y costo unitario de cada insumo aplicado al proceso de producción.

**RF-43.** El sistema deberá permitir registrar y editar las condiciones climáticas, de riego u otros factores relevantes que afecten el desarrollo del lote.

**RF-44.** El sistema deberá permitir actualizar la etapa biológica de un proceso de producción:

> *En producción* → *En crecimiento* → *Disponible para venta*.

**RF-45.** El sistema deberá permitir registrar la finalización (cosecha/cierre) de un lote de producción indicando la cantidad final lograda.

**RF-46.** El sistema deberá incorporar automáticamente al inventario de venta las plantas declaradas disponibles (sumándolas a un producto existente o creando uno nuevo) y registrar el movimiento `ENTRADA_PRODUCCION` en el Kardex.

**RF-47.** El sistema deberá calcular automáticamente el costo unitario real de producción de las plantas a partir del costo total acumulado dividido entre las unidades finales logradas.

**RF-48.** El sistema deberá permitir consultar los costos acumulados y la bitácora detallada de insumos de cada proceso de producción.

**RF-49.** El sistema deberá permitir consultar y filtrar los procesos de producción que se encuentran activos en el vivero.

**RF-50.** El sistema deberá identificar y alertar automáticamente aquellos lotes cuyo tiempo estimado de producción se haya extendido más allá de la fecha estimada (*Tiempo Excedido +X días*).

# **6. Gestión de merchandising personalizado**

**RF-51.** El sistema deberá permitir registrar productos base de merchandising social en el catálogo y cotizar pedidos personalizados desde el punto de venta.

**RF-52.** El sistema deberá permitir registrar y precargar el costo base y el precio base para cada artículo de merchandising.

**RF-53.** El sistema deberá permitir registrar las características específicas de cada personalización (*talla/presentación*, *color/acabado*, *técnica de estampado/bordado* y *notas de diseño*).

**RF-54.** El sistema deberá permitir registrar los costos adicionales unitarios asociados a la personalización o técnica seleccionada.

**RF-55.** El sistema deberá permitir establecer y modificar libremente el precio unitario final de venta pactado para el producto personalizado.

**RF-56.** El sistema deberá calcular automáticamente el costo total unitario y del pedido personalizado sumando el costo base de la prenda más el costo adicional de personalización.

**RF-57.** El sistema deberá calcular automáticamente en tiempo real la ganancia neta estimada y el porcentaje de margen del producto personalizado antes de facturar.

**RF-58.** El sistema deberá permitir registrar la cantidad de unidades personalizadas validando contra el stock disponible de la prenda base.

**RF-59.** El sistema deberá permitir consultar el desglose de costo base, costo de personalización, costo total, precio de venta final y ganancia de cada artículo personalizado.

**RF-60.** El sistema deberá mantener un historial dedicado de todos los pedidos de merchandising personalizado vendidos y mostrar sus especificaciones en el comprobante de venta.

# **7. Gestión de ventas**

**RF-61.** El sistema deberá permitir registrar ventas asociando los datos del cliente (documento/cédula, nombre completo, teléfono y correo electrónico).

**RF-62.** El sistema deberá permitir agregar múltiples productos (estándar o personalizados) y cantidades al carrito de venta validando el stock disponible en tiempo real.

**RF-63.** El sistema deberá calcular automáticamente el subtotal de cada línea y el subtotal acumulado de los productos en la venta.

**RF-64.** El sistema deberá permitir registrar descuentos en pesos (COP) aplicados al total de una venta.

**RF-65.** El sistema deberá permitir ajustar directamente el precio unitario final de venta de cualquier producto en el carrito cuando corresponda.

**RF-66.** El sistema deberá calcular automáticamente el valor total a cobrar de la venta y el cambio a devolver cuando el pago sea en efectivo.

**RF-67.** El sistema deberá permitir registrar el medio de pago utilizado (*Efectivo*, *Nequi* o *Bancolombia*).

**RF-68.** El sistema deberá permitir diferenciar y registrar el canal de la venta entre *Presencial en Vivero* y *Virtual (WhatsApp / Redes)*.

**RF-69.** El sistema deberá registrar automáticamente la fecha y hora exacta de emisión de cada venta.

**RF-70.** El sistema deberá descontar automáticamente las unidades vendidas del inventario y registrar la salida en el Kardex de forma atómica al confirmar la venta.

**RF-71.** El sistema deberá permitir consultar el historial completo de ventas emitidas junto con sus indicadores clave (total vendido, ventas del día, ticket promedio y medio de pago más usado).

**RF-72.** El sistema deberá permitir buscar y filtrar ventas por fecha específica.

**RF-73.** El sistema deberá permitir buscar ventas por número de comprobante, nombre o cédula del cliente, o por el nombre de cualquier producto incluido en la venta.

**RF-74.** El sistema deberá permitir consultar el comprobante (Ticket) detallado de cada venta con sus productos, especificaciones de personalización, descuentos y totales.

**RF-75.** El sistema deberá permitir consultar las ventas realizadas durante un período rápido (*Todo*, *Hoy*, *Últimos 7 días*, *Este Mes*) o mediante un rango de fechas personalizado (*Desde / Hasta*).

# **8. Gestión de ingresos**

**RF-76.** El sistema deberá registrar automáticamente los ingresos monetarios generados por cada venta confirmada en el registro de movimientos financieros.

**RF-77.** El sistema deberá registrar automáticamente el concepto del ingreso vinculándolo con el número de comprobante de venta correspondiente.

**RF-78.** El sistema deberá registrar la fecha y hora de cada ingreso percibido.

**RF-79.** El sistema deberá registrar el valor neto de cada ingreso abonado a la cuenta correspondiente.

**RF-80.** El sistema deberá clasificar los ingresos según la línea de negocio (*Plantas y Vivero*, *Merchandising Social*, *Comestibles / Tienda*) y el medio de pago recibido.

**RF-81.** El sistema deberá permitir consultar las transacciones e ingresos recientes desde el Panel Principal y el módulo de Ventas y Estadísticas.

**RF-82.** El sistema deberá permitir filtrar los ingresos y métricas de recaudación por período (*Hoy/Día*, *Ayer*, *Semana/Últimos 7 días*, *Este Mes* y *Año*).

**RF-83.** El sistema deberá mostrar la distribución porcentual y en pesos de los ingresos generados por cada categoría o línea de producto.

# **9. Gestión de egresos y costos operativos**

**RF-84.** El sistema deberá registrar automáticamente los egresos de dinero por compras a proveedores y contabilizar los costos de producción y de mercancía vendida.

**RF-85.** El sistema deberá registrar el concepto de cada egreso indicando la factura de compra, proveedor o lote de producción asociado.

**RF-86.** El sistema deberá registrar la fecha de cada compra a proveedor, aplicación de insumo o movimiento de salida de dinero.

**RF-87.** El sistema deberá registrar el valor total del egreso y descontarlo automáticamente del saldo de la cuenta de pago seleccionada.

**RF-88.** El sistema deberá clasificar las salidas y costos según su tipo de operación (*Egreso por compra a proveedor*, *Costo de insumos de producción*, *Costo de mercancía vendida* y *Ajuste por conciliación*).

**RF-89.** El sistema deberá permitir registrar observaciones o notas detalladas al registrar compras a proveedores, insumos de cultivo y arqueos de caja.

**RF-90.** El sistema deberá permitir consultar el historial de compras y movimientos de salida registrados en el sistema.

**RF-91.** El sistema deberá permitir filtrar las compras y costos acumulados del negocio por período (*Hoy/Día*, *Semana/Últimos 7 días*, *Este Mes*, *Año*).

**RF-92.** El sistema deberá permitir filtrar las facturas de egreso por proveedor específico.

# **10. Control de dinero disponible y conciliación**

El sistema permite comprobar no solo cuánto se vendió, sino cuánto dinero debe existir disponible en cada medio de pago y conciliarlo frente al conteo físico o extracto real.

**RF-93.** El sistema deberá gestionar las cuentas o medios donde se encuentra el dinero del negocio:
* *Efectivo Caja Menor*
* *Nequi Comunitario (Billetera Digital)*
* *Bancolombia Principal (Cuenta Bancaria)*

**RF-94.** El sistema deberá mantener el saldo base inicial de caja y de cada medio de dinero registrado.

**RF-95.** El sistema deberá abonar automáticamente cada ingreso por venta al saldo de la cuenta correspondiente al medio de pago elegido.

**RF-96.** El sistema deberá descontar automáticamente cada pago de compra a proveedor del saldo de la cuenta o medio de dinero seleccionado.

**RF-97.** El sistema deberá actualizar en tiempo real el saldo disponible de cada medio de dinero a partir de las ventas, compras, traslados entre cuentas y ajustes de arqueo.

**RF-98.** El sistema deberá mostrar el dinero disponible registrado en efectivo tanto en el Panel Principal como en Estadísticas.

**RF-99.** El sistema deberá mostrar el dinero disponible registrado en cuentas bancarias y billeteras digitales (*Bancolombia* y *Nequi*).

**RF-100.** El sistema deberá calcular y mostrar el total consolidado de dinero disponible del negocio sumando todas las cuentas activas.

**RF-101.** El sistema deberá permitir registrar traslados de fondos entre efectivo, billetera digital y cuenta bancaria (consignaciones, retiros o transferencias internas), actualizando ambos saldos.

**RF-102.** El sistema deberá permitir realizar arqueos de caja y conciliaciones comparando el saldo esperado en el sistema contra el dinero físico contado o el saldo real en extracto.

**RF-103.** El sistema deberá calcular y mostrar automáticamente las diferencias encontradas durante una conciliación (*Cuadrado*, *Faltante en rojo* o *Sobrante en amarillo*).

**RF-104.** El sistema deberá exigir el registro de una justificación obligatoria cuando exista una diferencia distinta de cero en el arqueo y permitir ajustar el saldo de la cuenta dejando trazabilidad en el historial.

# **11. Métricas financieras**

**RF-105.** El sistema deberá calcular el total de costos y egresos acumulados (costo de mercancía vendida y compras/gastos registrados) durante el período seleccionado.

**RF-106.** El sistema deberá calcular el total de ingresos obtenidos por ventas durante el período seleccionado.

**RF-107.** El sistema deberá calcular el total de egresos y costos asociados a la operación durante el período seleccionado.

**RF-108.** El sistema deberá calcular la ganancia neta estimada y el porcentaje de margen global de rentabilidad durante el período seleccionado.

**RF-109.** El sistema deberá comparar gráficamente por semanas los ingresos obtenidos frente a los costos incurridos en el período.

**RF-110.** El sistema deberá mostrar mediante indicadores y barras comparativas la relación entre ingresos, costos y ganancias por semana.

**RF-111.** El sistema deberá permitir consultar las métricas financieras filtrando por *Día*, *Semana*, *Este Mes* o *Año*.

**RF-112.** El sistema deberá mostrar las métricas de participación e ingresos desglosadas por línea de producto (*Plantas & Vivero*, *Merchandising Social* y *Comestibles / Tienda*).

**RF-113.** El sistema deberá diferenciar el volumen de unidades vendidas y el desempeño de plantas frente al de merchandising personalizado.

**RF-114.** El sistema deberá calcular y mostrar el margen de ganancia estimado tanto de cada producto en catálogo como de cada cotización personalizada y del período global.

# **12. Control financiero diario**

**RF-115.** El sistema deberá permitir consultar el resumen en tiempo real de las operaciones económicas realizadas durante el día (*Hoy*).

**RF-116.** El sistema deberá mostrar el total de ventas y la cantidad de unidades vendidas durante el día.

**RF-117.** El sistema deberá mostrar el total de ingresos registrados durante el día.

**RF-118.** El sistema deberá mostrar el total de costos y egresos registrados durante el día.

**RF-119.** El sistema deberá calcular automáticamente la ganancia neta y el margen diario.

**RF-120.** El sistema deberá mostrar el saldo esperado de dinero disponible en efectivo y bancos al corte del día.

**RF-121.** El sistema deberá permitir consultar el desempeño y las ganancias del día anterior (*Ayer*), así como el historial de conciliaciones de fechas pasadas.

**RF-122.** El sistema deberá permitir consultar el resumen financiero acumulado por *Hoy*, *Ayer*, *Últimos 7 días / Semana*, *Este Mes* o *Año*.

# **13. Reportes y exportación**

**RF-123.** El sistema deberá generar y exportar a CSV el reporte de ventas filtrado con fila consolidada de totales y descuentos.

**RF-124.** El sistema deberá incluir el consolidado de ingresos totales y por línea de negocio en el reporte financiero exportable a CSV.

**RF-125.** El sistema deberá incluir el consolidado de egresos y costos en el reporte financiero exportable a CSV.

**RF-126.** El sistema deberá generar y exportar a CSV tanto el reporte del catálogo de inventario como el reporte del historial de movimientos (Kardex).

**RF-127.** El sistema deberá generar y exportar a CSV el reporte de facturas de compras a proveedores.

**RF-128.** El sistema deberá generar y exportar a CSV el reporte de lotes de cultivo y costos acumulados de producción.

**RF-129.** El sistema deberá generar y exportar a CSV el reporte detallado de pedidos de merchandising personalizado (costos base, personalización, precios de venta y ganancias).

**RF-130.** El sistema deberá incluir el cálculo de ganancias netas y márgenes porcentuales en los reportes financieros y de merchandising exportables a CSV.

**RF-131.** El sistema deberá incluir el reporte de saldos de dinero disponible por cuenta (*Efectivo*, *Nequi* y *Bancolombia*) en la exportación financiera a CSV.

**RF-132.** El sistema deberá mostrar y exportar a CSV el historial de arqueos, conciliaciones, diferencias detectadas y justificaciones registradas.

**RF-133.** El sistema deberá generar y exportar a CSV el directorio de proveedores con el conteo de productos asociados y compras registradas.

**RF-134.** El sistema deberá permitir comparar los ingresos y porcentajes generados por las diferentes categorías de productos.

**RF-135.** El sistema deberá permitir consultar la diferencia neta entre ingresos y costos/egresos durante el período seleccionado.

**RF-136.** El sistema deberá presentar la información financiera mediante tarjetas KPI, tablas de historial y gráficos comparativos de barras.

**RF-137.** El sistema deberá permitir descargar todos los reportes generados en archivos compatibles con hojas de cálculo (`.csv` con codificación UTF-8 BOM).

# **14. Dashboard (Panel Principal)**

**RF-138.** El sistema deberá mostrar un panel principal con el resumen ejecutivo en tiempo real del estado actual del negocio.

**RF-139.** El panel deberá mostrar la cantidad de unidades y ventas realizadas en el período seleccionado, desglosadas entre plantas y merchandising, además del comparativo del día anterior.

**RF-140.** El panel deberá mostrar los ingresos y costos/egresos del período seleccionado.

**RF-141.** El panel deberá mostrar la ganancia neta estimada y el margen porcentual del período seleccionado.

**RF-142.** El panel deberá mostrar el dinero total disponible registrado, desglosado entre efectivo y cuentas bancarias/digitales.

**RF-143.** El panel deberá mostrar la diferencia acumulada entre el dinero esperado y el dinero conciliado indicando si se encuentra *Cuadrado* o en *Descuadre*.

**RF-144.** El panel deberá mostrar el resumen global del inventario disponible (cantidad de productos activos y total de unidades físicas en stock).

**RF-145.** El panel deberá mostrar alertas dinámicas sobre productos con inventario crítico o en alerta de agotamiento.

**RF-146.** El panel deberá mostrar alertas y avisos sobre lotes de producción activos o con tiempo de cultivo extendido.

**RF-147.** El panel deberá permitir seleccionar el período (*Hoy*, *Ayer*, *Últimos 7 días*, *Este Mes*) sobre el cual se recalcula toda la información mostrada, e incluir accesos rápidos operativos.

# **Requisitos no funcionales**

## **Usabilidad**

**RNF-01.** El sistema deberá contar con una interfaz sencilla, limpia e intuitiva en español (`es-CO`) adaptada a la operación del vivero.

**RNF-02.** El sistema deberá permitir realizar las operaciones frecuentes (registrar venta, compra, lote, ajuste o arqueo) con un número reducido de pasos y accesos rápidos desde el Panel Principal.

**RNF-03.** El sistema deberá utilizar formularios claros y guiados con cálculos en tiempo real para el registro de ventas, compras, producción, inventario y conciliación.

**RNF-04.** El sistema deberá mostrar notificaciones visuales claras (*toasts*) cuando una operación sea realizada o exportada correctamente.

**RNF-05.** El sistema deberá mostrar mensajes descriptivos en pantalla cuando se produzca un error o se ingrese información incompleta o inválida.

**RNF-06.** El sistema deberá preservar el historial financiero, de ventas y de inventario mediante la desactivación lógica de productos y proveedores (*Activo / Inactivo*) en lugar de la eliminación destructiva de registros históricos.

## **Responsive**

**RNF-07.** El sistema deberá contar con un diseño responsive que permita utilizarlo desde computadores de escritorio, portátiles, tabletas y teléfonos móviles.

**RNF-08.** La interfaz (incluyendo tablas, tarjetas, barra de navegación y ventanas modales como el cotizador de personalización) deberá adaptar automáticamente la distribución de sus elementos al tamaño de la pantalla.

**RNF-09.** Las funciones principales de registro, cotización y consulta deberán ser completamente utilizables y desplazables (*scroll*) desde dispositivos móviles.

**RNF-10.** La información presentada deberá permanecer legible y sin recortes ni superposiciones independientemente del tamaño de la pantalla.

## **Rendimiento**

**RNF-11.** El sistema deberá responder de forma inmediata a las operaciones habituales de consulta, filtrado, cálculo y registro mediante estado reactivo y caché local.

**RNF-12.** El sistema deberá permitir consultar y filtrar productos, ventas, lotes e inventario en tiempo real sin recargar la página.

**RNF-13.** El sistema deberá mantener un rendimiento adecuado apoyándose en consultas indexadas en PostgreSQL (Supabase) y agregaciones optimizadas en memoria.

## **Disponibilidad y Persistencia Dual**

**RNF-14.** El sistema deberá estar disponible durante todo el horario de operación del negocio a través de su despliegue web en la nube (Cloudflare Pages + Supabase) y contar con modo local de respaldo.

**RNF-15.** El sistema deberá sincronizar la información con la base de datos en la nube cuando exista conexión a Internet, y operar de forma continua en modo local (`localStorage`) cuando no haya conexión o credenciales configuradas.

## **Integridad de la información**

**RNF-16.** El sistema deberá validar estrictamente los datos ingresados antes de almacenarlos (precios y costos mayores a cero, formatos numéricos de documento y teléfono, fechas válidas y montos de pago suficientes).

**RNF-17.** El sistema deberá evitar el almacenamiento de registros incompletos o inconsistentes tanto en los formularios del navegador como en las restricciones de la base de datos.

**RNF-18.** El sistema deberá garantizar la consistencia atómica entre las ventas registradas, el descuento de existencias y la creación del movimiento `SALIDA_VENTA` en el Kardex.

**RNF-19.** El sistema deberá garantizar la consistencia entre las compras registradas, el incremento de stock, el recálculo del costo promedio ponderado y el movimiento `ENTRADA_COMPRA` en el Kardex.

**RNF-20.** El sistema deberá garantizar la consistencia entre las ventas, compras, traslados, conciliaciones y los saldos actualizados de cada cuenta de dinero.

**RNF-21.** El sistema deberá evitar que una misma operación sea enviada más de una vez bloqueando los botones de confirmación durante el procesamiento y generando consecutivos únicos.

## **Respaldo y Recuperación de Datos**

**RNF-22.** El sistema deberá respaldar la información operativa en una base de datos relacional en la nube (PostgreSQL en Supabase) complementada con persistencia local en el navegador.

**RNF-23.** El sistema deberá permitir descargar en cualquier momento copias de respaldo en formato CSV de todos los módulos (ventas, inventario, Kardex, compras, proveedores, producción, merchandising y finanzas).

**RNF-24.** El sistema deberá minimizar la pérdida de información ante fallas de conectividad gracias a su arquitectura de persistencia dual (Nube + Local) y transacciones atómicas.

## **Compatibilidad**

**RNF-25.** El sistema deberá funcionar correctamente en los principales navegadores web modernos (Chrome, Edge, Firefox, Safari).

**RNF-26.** El sistema deberá ser compatible con sistemas operativos de escritorio y dispositivos móviles sin depender de complementos externos.

## **Mantenibilidad y Escalabilidad**

**RNF-27.** El sistema deberá utilizar una arquitectura limpia y separada por capas (`pages`, `components`, `context`, `services`, `hooks`, `utils` y `supabase`) que facilite su mantenimiento y evolución.

**RNF-28.** El código fuente deberá estar organizado de forma modular por dominio funcional.

**RNF-29.** El sistema deberá permitir incorporar nuevas funcionalidades o reportes en futuras versiones sin afectar los módulos existentes.

**RNF-30.** El sistema deberá soportar el crecimiento de registros de productos, ventas, compras, lotes y movimientos mediante su esquema relacional en PostgreSQL.

## **Portabilidad**

**RNF-31.** El sistema deberá poder utilizarse desde cualquier dispositivo con navegador web.

**RNF-32.** El sistema no deberá requerir la instalación de software adicional por parte del usuario final para acceder a todas sus funcionalidades.
