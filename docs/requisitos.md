El sistema no es simplemente un inventario \+ ventas, sino que debe manejar **costos variables, producción con tiempos diferentes y control financiero contra el dinero realmente disponible**.

El merchandising personalizado, el precio final depende del trabajo/personalización.

# **Requisitos funcionales**

## **1\. Gestión de productos**

**RF-01.** El sistema deberá permitir registrar productos.

**RF-02.** El sistema deberá permitir modificar la información de los productos registrados.

**RF-03.** El sistema deberá permitir consultar y buscar productos.

**RF-04.** El sistema deberá permitir clasificar los productos por categorías.

**RF-05.** El sistema deberá permitir registrar un precio base para los productos.

**RF-06.** El sistema deberá permitir registrar si un producto es adquirido a un proveedor, producido por el vivero o elaborado como merchandising personalizado.

**RF-07.** El sistema deberá permitir registrar las características y descripción de cada producto.

**RF-08.** El sistema deberá permitir activar o desactivar productos sin eliminar su historial.

**RF-09.** El sistema deberá permitir consultar el historial de operaciones asociadas a un producto.

# **2\. Gestión de proveedores**

**RF-10.** El sistema deberá permitir registrar proveedores.

**RF-11.** El sistema deberá permitir modificar la información de los proveedores.

**RF-12.** El sistema deberá permitir consultar y buscar proveedores.

**RF-13.** El sistema deberá permitir asociar productos con sus respectivos proveedores.

**RF-14.** El sistema deberá permitir consultar el historial de compras realizadas a cada proveedor.

# 

# **3\. Gestión de compras**

**RF-15.** El sistema deberá permitir registrar compras realizadas a proveedores.

**RF-16.** El sistema deberá permitir registrar la fecha de una compra.

**RF-17.** El sistema deberá permitir registrar los productos y cantidades adquiridas.

**RF-18.** El sistema deberá permitir registrar el costo de adquisición de los productos.

**RF-19.** El sistema deberá calcular el costo total de una compra.

**RF-20.** El sistema deberá actualizar las existencias del inventario al registrar una compra.

**RF-21.** El sistema deberá permitir consultar el historial de compras.

**RF-22.** El sistema deberá permitir consultar las compras realizadas durante un período determinado.

# **4\. Gestión de inventario**

**RF-23.** El sistema deberá permitir consultar las existencias actuales de cada producto.

**RF-24.** El sistema deberá registrar las entradas de productos al inventario.

**RF-25.** El sistema deberá registrar las salidas de productos del inventario.

**RF-26.** El sistema deberá permitir registrar ajustes de inventario.

**RF-27.** El sistema deberá permitir registrar el motivo de los ajustes de inventario.

**RF-28.** El sistema deberá mantener un historial de movimientos de inventario.

**RF-29.** El sistema deberá permitir consultar los movimientos de inventario por producto.

**RF-30.** El sistema deberá permitir consultar los movimientos de inventario por período.

**RF-31.** El sistema deberá permitir establecer una cantidad mínima de inventario para los productos.

**RF-32.** El sistema deberá generar alertas cuando las existencias de un producto estén por debajo del nivel mínimo establecido.

**RF-33.** El sistema deberá calcular el costo promedio de los productos adquiridos.

**RF-34.** El sistema deberá diferenciar los productos adquiridos de los productos producidos por el vivero.

**RF-35.** El sistema deberá actualizar automáticamente el inventario cuando se registre una entrada o salida.

# **5\. Gestión de producción propia**

Aquí haría un cambio importante respecto a la lista anterior.

Como las plantas **no tienen todas el mismo tiempo de producción**, no deberíamos manejar simplemente "fecha de producción → inventario".

**RF-36.** El sistema deberá permitir registrar procesos de producción de plantas.

**RF-37.** El sistema deberá permitir registrar la especie o tipo de planta que se encuentra en producción.

**RF-38.** El sistema deberá permitir registrar la cantidad de plantas involucradas en un proceso de producción.

**RF-39.** El sistema deberá permitir registrar la fecha de inicio del proceso de producción.

**RF-40.** El sistema deberá permitir registrar una fecha estimada de disponibilidad para la venta.

**RF-41.** El sistema deberá permitir registrar los insumos utilizados durante el proceso de producción.

**RF-42.** El sistema deberá permitir registrar los costos asociados al proceso de producción.

**RF-43.** El sistema deberá permitir registrar condiciones o factores que puedan afectar el tiempo de producción, como condiciones climáticas u otros factores relevantes.

**RF-44.** El sistema deberá permitir actualizar el estado de un proceso de producción.

Por ejemplo:

> En producción → En crecimiento → Disponible para venta.

**RF-45.** El sistema deberá permitir registrar que una planta ha finalizado su proceso de producción.

**RF-46.** El sistema deberá incorporar al inventario las plantas que hayan sido declaradas disponibles para la venta.

**RF-47.** El sistema deberá calcular el costo estimado de producción de las plantas a partir de los costos registrados.

**RF-48.** El sistema deberá permitir consultar los costos acumulados de un proceso de producción.

**RF-49.** El sistema deberá permitir consultar los procesos de producción que se encuentran activos.

**RF-50.** El sistema deberá permitir identificar plantas cuyo tiempo estimado de producción se haya extendido.

Esto último es importante porque **el sistema no debería asumir que una planta siempre estará disponible después de X días**. Puede manejar una fecha estimada y posteriormente actualizarla.

# **6\. Gestión de merchandising personalizado**

Este módulo lo separaría de los productos normales.

**RF-51.** El sistema deberá permitir registrar productos de merchandising personalizado.

**RF-52.** El sistema deberá permitir registrar un precio base para cada tipo de producto de merchandising.

**RF-53.** El sistema deberá permitir registrar las características específicas de una personalización.

**RF-54.** El sistema deberá permitir registrar los costos adicionales asociados a la personalización.

**RF-55.** El sistema deberá permitir modificar el precio final de un producto personalizado.

**RF-56.** El sistema deberá calcular el costo total de un producto personalizado a partir de los costos asociados.

**RF-57.** El sistema deberá calcular la ganancia estimada de un producto personalizado.

**RF-58.** El sistema deberá permitir registrar la cantidad de unidades personalizadas.

**RF-59.** El sistema deberá permitir consultar el costo, precio de venta y ganancia de cada producto personalizado.

**RF-60.** El sistema deberá mantener un historial de los productos personalizados vendidos.

Por ejemplo, una camiseta podría tener:

* Precio base: \$25.000  
* Personalización: \$10.000  
* Otros costos: \$5.000  
* Costo total: \$40.000  
* Precio final: \$55.000  
* Ganancia: \$15.000

Así no se obliga a que todas las camisetas tengan el mismo precio.

# **7\. Gestión de ventas**

**RF-61.** El sistema deberá permitir registrar ventas.

**RF-62.** El sistema deberá permitir registrar los productos y cantidades correspondientes a cada venta.

**RF-63.** El sistema deberá calcular automáticamente el subtotal de los productos vendidos.

**RF-64.** El sistema deberá permitir registrar descuentos aplicados a una venta.

**RF-65.** El sistema deberá permitir establecer el precio final de venta de cada producto cuando corresponda.

**RF-66.** El sistema deberá calcular automáticamente el valor total de la venta.

**RF-67.** El sistema deberá permitir registrar el medio de pago utilizado.

**RF-68.** El sistema deberá permitir diferenciar entre ventas presenciales y virtuales.

**RF-69.** El sistema deberá registrar la fecha y hora de cada venta.

**RF-70.** El sistema deberá actualizar automáticamente el inventario después de registrar una venta.

**RF-71.** El sistema deberá permitir consultar el historial de ventas.

**RF-72.** El sistema deberá permitir buscar ventas por fecha.

**RF-73.** El sistema deberá permitir buscar ventas por producto.

**RF-74.** El sistema deberá permitir consultar el detalle de una venta.

**RF-75.** El sistema deberá permitir consultar las ventas realizadas durante un período determinado.

# **8\. Gestión de ingresos**

**RF-76.** El sistema deberá permitir registrar ingresos.

**RF-77.** El sistema deberá permitir registrar el concepto del ingreso.

**RF-78.** El sistema deberá permitir registrar la fecha del ingreso.

**RF-79.** El sistema deberá permitir registrar el valor del ingreso.

**RF-80.** El sistema deberá permitir clasificar los ingresos por categorías.

**RF-81.** El sistema deberá permitir consultar el historial de ingresos.

**RF-82.** El sistema deberá permitir filtrar los ingresos por período.

**RF-83.** El sistema deberá permitir filtrar los ingresos por categoría.

# **9\. Gestión de egresos**

**RF-84.** El sistema deberá permitir registrar egresos.

**RF-85.** El sistema deberá permitir registrar el concepto del egreso.

**RF-86.** El sistema deberá permitir registrar la fecha del egreso.

**RF-87.** El sistema deberá permitir registrar el valor del egreso.

**RF-88.** El sistema deberá permitir clasificar los egresos por categorías.

**RF-89.** El sistema deberá permitir registrar observaciones relacionadas con un egreso.

**RF-90.** El sistema deberá permitir consultar el historial de egresos.

**RF-91.** El sistema deberá permitir filtrar los egresos por período.

**RF-92.** El sistema deberá permitir filtrar los egresos por categoría.

# **10\. Control de dinero disponible**

La idea es que no solamente sepan: "Vendimos \$2.000.000".

Sino que puedan comprobar: "Vendimos \$2.000.000, tuvimos \$500.000 de gastos y, por lo tanto, debería existir aproximadamente \$1.500.000 disponible, teniendo en cuenta los movimientos registrados."

**RF-93.** El sistema deberá permitir registrar las cuentas o medios donde se encuentra el dinero del negocio.

Por ejemplo:

* Efectivo.  
* Cuenta bancaria.  
* Otros medios de dinero.

**RF-94.** El sistema deberá permitir registrar el saldo inicial de cada medio de dinero.

**RF-95.** El sistema deberá asociar los ingresos registrados con el medio de dinero correspondiente.

**RF-96.** El sistema deberá asociar los egresos registrados con el medio de dinero correspondiente.

**RF-97.** El sistema deberá actualizar el saldo disponible de cada medio de dinero a partir de los ingresos y egresos registrados.

**RF-98.** El sistema deberá mostrar el dinero disponible registrado en efectivo.

**RF-99.** El sistema deberá mostrar el dinero disponible registrado en cuentas bancarias.

**RF-100.** El sistema deberá mostrar el total de dinero disponible del negocio.

**RF-101.** El sistema deberá permitir registrar movimientos entre efectivo y cuentas bancarias.

**RF-102.** El sistema deberá permitir realizar una conciliación entre el saldo registrado en el sistema y el dinero disponible realmente en efectivo o en las cuentas bancarias.

**RF-103.** El sistema deberá mostrar las diferencias encontradas durante una conciliación.

**RF-104.** El sistema deberá permitir registrar una justificación para las diferencias encontradas.

Esto último es clave para poder responder: "¿Por qué el sistema dice que deberían existir \$1.500.000, pero realmente hay \$1.300.000?"

# **11\. Métricas financieras**

**RF-105.** El sistema deberá calcular el total de dinero invertido durante un período.

**RF-106.** El sistema deberá calcular el total de ingresos obtenidos durante un período.

**RF-107.** El sistema deberá calcular el total de egresos durante un período.

**RF-108.** El sistema deberá calcular la ganancia estimada durante un período.

**RF-109.** El sistema deberá permitir comparar la inversión realizada con los ingresos obtenidos.

**RF-110.** El sistema deberá mostrar la relación entre costos, ingresos y ganancias.

**RF-111.** El sistema deberá permitir consultar estas métricas por día, semana, mes o período personalizado.

**RF-112.** El sistema deberá permitir consultar las métricas por categoría de producto.

**RF-113.** El sistema deberá permitir diferenciar las ganancias provenientes de plantas y de merchandising.

**RF-114.** El sistema deberá permitir consultar el margen de ganancia estimado de los productos.

# **12\. Control financiero diario**

**RF-115.** El sistema deberá permitir consultar un resumen de las operaciones económicas realizadas durante un día.

**RF-116.** El sistema deberá mostrar el total de ventas realizadas durante el día.

**RF-117.** El sistema deberá mostrar el total de ingresos registrados durante el día.

**RF-118.** El sistema deberá mostrar el total de egresos registrados durante el día.

**RF-119.** El sistema deberá calcular el balance diario.

**RF-120.** El sistema deberá mostrar el saldo esperado de dinero disponible al finalizar el día.

**RF-121.** El sistema deberá permitir consultar los resúmenes financieros de días anteriores.

**RF-122.** El sistema deberá permitir consultar el resumen financiero de un período determinado.

# **13\. Reportes**

**RF-123.** El sistema deberá generar reportes de ventas.

**RF-124.** El sistema deberá generar reportes de ingresos.

**RF-125.** El sistema deberá generar reportes de egresos.

**RF-126.** El sistema deberá generar reportes de inventario.

**RF-127.** El sistema deberá generar reportes de compras.

**RF-128.** El sistema deberá generar reportes de costos de producción.

**RF-129.** El sistema deberá generar reportes de productos personalizados.

**RF-130.** El sistema deberá generar reportes de ganancias.

**RF-131.** El sistema deberá generar reportes de dinero disponible.

**RF-132.** El sistema deberá generar reportes de conciliaciones y diferencias.

**RF-133.** El sistema deberá permitir consultar los productos más vendidos.

**RF-134.** El sistema deberá permitir consultar los productos con menor cantidad de ventas.

**RF-135.** El sistema deberá permitir comparar los ingresos generados por diferentes categorías de productos.

**RF-136.** El sistema deberá permitir consultar la diferencia entre ingresos y egresos durante un período.

**RF-137.** El sistema deberá permitir consultar la información financiera mediante tablas y gráficos.

**RF-138.** El sistema deberá permitir exportar los reportes generados.

# **14\. Dashboard**

**RF-139.** El sistema deberá mostrar un panel principal con un resumen del estado actual del negocio.

**RF-140.** El panel deberá mostrar las ventas del período seleccionado.

**RF-141.** El panel deberá mostrar los ingresos y egresos del período seleccionado.

**RF-142.** El panel deberá mostrar la ganancia estimada del período seleccionado.

**RF-143.** El panel deberá mostrar el dinero disponible registrado.

**RF-144.** El panel deberá mostrar la diferencia entre el dinero esperado y el dinero conciliado cuando exista una diferencia.

**RF-145.** El panel deberá mostrar información sobre el inventario disponible.

**RF-146.** El panel deberá mostrar productos con bajo inventario.

**RF-147.** El panel deberá mostrar procesos de producción pendientes.

**RF-148.** El panel deberá permitir seleccionar el período sobre el cual se desea consultar la información.

# **Requisitos no funcionales**

## **Usabilidad**

**RNF-01.** El sistema deberá contar con una interfaz sencilla e intuitiva.

**RNF-02.** El sistema deberá permitir realizar las operaciones frecuentes con un número reducido de pasos.

**RNF-03.** El sistema deberá utilizar formularios claros para el registro de ventas, compras, ingresos, egresos, producción e inventario.

**RNF-04.** El sistema deberá mostrar mensajes claros cuando una operación sea realizada correctamente.

**RNF-05.** El sistema deberá mostrar mensajes descriptivos cuando se produzca un error o se ingrese información inválida.

**RNF-06.** El sistema deberá solicitar confirmación antes de eliminar información que pueda afectar el historial financiero, de ventas o de inventario.

## **Responsive**

**RNF-07.** El sistema deberá contar con un diseño responsive que permita utilizarlo desde computadores, tabletas y dispositivos móviles.

**RNF-08.** La interfaz deberá adaptar automáticamente la distribución de sus elementos al tamaño de la pantalla.

**RNF-09.** Las funciones principales de registro y consulta deberán ser utilizables desde dispositivos móviles.

**RNF-10.** La información presentada deberá permanecer legible independientemente del tamaño de la pantalla.

## **Rendimiento**

**RNF-11.** El sistema deberá responder a las operaciones habituales de consulta y registro en un tiempo adecuado bajo condiciones normales de uso.

**RNF-12.** El sistema deberá permitir consultar productos, ventas e inventario sin afectar significativamente el funcionamiento de la aplicación.

**RNF-13.** El sistema deberá mantener un rendimiento adecuado a medida que aumente la cantidad de registros almacenados.

## **Disponibilidad**

**RNF-14.** El sistema deberá estar disponible durante el horario habitual de operación del negocio.

**RNF-15.** El sistema deberá permitir acceder a la información cuando exista conexión a Internet y el servicio se encuentre disponible.

## **Integridad de la información**

**RNF-16.** El sistema deberá validar los datos ingresados antes de almacenarlos.

**RNF-17.** El sistema deberá evitar el almacenamiento de registros incompletos o inconsistentes.

**RNF-18.** El sistema deberá garantizar la consistencia entre las ventas registradas y los movimientos de inventario.

**RNF-19.** El sistema deberá garantizar la consistencia entre las compras registradas y las entradas de inventario.

**RNF-20.** El sistema deberá garantizar la consistencia entre los ingresos, egresos y saldos de dinero registrados.

**RNF-21.** El sistema deberá evitar que una misma operación sea contabilizada más de una vez.

## **Seguridad**

**RNF-22.** El sistema deberá proteger la información almacenada frente a modificaciones o eliminaciones accidentales.

**RNF-23.** El sistema deberá utilizar mecanismos adecuados para proteger la información financiera almacenada.

**RNF-24.** El sistema deberá impedir operaciones que puedan generar inconsistencias en la información financiera o de inventario.

## **Copias de seguridad**

**RNF-25.** El sistema deberá realizar copias de seguridad periódicas de la información almacenada.

**RNF-26.** Las copias de seguridad deberán permitir recuperar la información en caso de pérdida o daño de los datos.

**RNF-27.** El sistema deberá minimizar la pérdida de información ante una falla del sistema.

## **Compatibilidad**

**RNF-28.** El sistema deberá funcionar correctamente en los principales navegadores web actuales.

**RNF-29.** El sistema deberá ser compatible con computadores, tabletas y dispositivos móviles.

## **Mantenibilidad**

**RNF-30.** El sistema deberá utilizar una arquitectura que facilite su mantenimiento y evolución.

**RNF-31.** El código fuente deberá estar organizado de forma modular.

**RNF-32.** El sistema deberá permitir agregar nuevas categorías de productos sin realizar modificaciones significativas en su estructura.

**RNF-33.** El sistema deberá permitir incorporar nuevas funcionalidades en futuras versiones.

## **Escalabilidad**

**RNF-34.** El sistema deberá soportar el crecimiento de la cantidad de productos registrados.

**RNF-35.** El sistema deberá soportar el crecimiento de la cantidad de ventas, compras y movimientos de inventario.

**RNF-36.** El sistema deberá permitir ampliar las funcionalidades administrativas del negocio sin requerir una modificación completa del sistema.

## **Portabilidad**

**RNF-37.** El sistema deberá poder utilizarse desde diferentes dispositivos con acceso a Internet.

**RNF-38.** El sistema no deberá requerir la instalación de software adicional por parte del usuario final para acceder a sus funcionalidades principales.

