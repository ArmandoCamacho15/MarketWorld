# Historias de Usuario — MarketWorld (HU-01..HU-35)

Este documento contiene las historias de usuario que guiarán el desarrollo del sistema, priorizadas mediante el método MoSCoW (Must-have, Should-have, Could-have, Won't-have). Cada historia incluye ID y prioridad.

## Resumen MoSCoW
- **M (Must-have)**: Críticas para el MVP. Sin ellas el sistema no funciona.
- **S (Should-have)**: Importantes pero no vitales para el primer lanzamiento.
- **C (Could-have)**: Deseables pero pueden esperar si hay falta de tiempo.
- **W (Won't-have)**: No se incluirán en esta versión (20 semanas).

---

## Módulo 1: Autenticación y Usuarios
| ID | Historia de Usuario | Prioridad |
| :--- | :--- | :--- |
| **HU-01** | Como usuario, quiero registrarme con mi correo y una contraseña segura para acceder al sistema. | **Must** |
| **HU-02** | Como usuario, quiero iniciar sesión de forma segura para proteger la información del negocio. | **Must** |
| **HU-03** | Como administrador, quiero asignar roles (Admin/Empleado) para controlar el acceso a funciones sensibles. | **Must** |
| **HU-04** | Como usuario, quiero poder cerrar mi sesión para que nadie use mi cuenta en computadores compartidos. | **Must** |
| **HU-05** | Como usuario, quiero recuperar mi contraseña vía email si la llegara a olvidar. | **Should** |
| **HU-06** | Como usuario, quiero editar mi perfil (nombre, foto) para personalizar mi identidad en el sistema. | **Could** |

## Módulo 2: Gestión de Inventario
| ID | Historia de Usuario | Prioridad |
| :--- | :--- | :--- |
| **HU-07** | Como administrador, quiero registrar productos con código, nombre y precios para poblar mi catálogo. | **Must** |
| **HU-08** | Como usuario, quiero listar y filtrar productos por categoría para encontrar stock rápidamente. | **Must** |
| **HU-09** | Como administrador, quiero actualizar el precio o descripción de un producto cuando cambie el mercado. | **Must** |
| **HU-10** | Como administrador, quiero eliminar lógicamente productos que ya no se venden. | **Must** |
| **HU-11** | Como usuario, quiero ver alertas visuales cuando un producto tenga stock bajo (mínimo). | **Must** |
| **HU-12** | Como usuario, quiero cargar imágenes de los productos para identificarlos visualmente en el POS. | **Should** |
| **HU-13** | Como usuario, quiero generar etiquetas con código de barras para mis productos físicos. | **Could** |

## Módulo 3: Gestión de Clientes y Proveedores
| ID | Historia de Usuario | Prioridad |
| :--- | :--- | :--- |
| **HU-14** | Como cajero, quiero registrar clientes nuevos con su documento y teléfono para fidelizarlos. | **Must** |
| **HU-15** | Como usuario, quiero buscar clientes por nombre o cédula para agilizar la facturación. | **Must** |
| **HU-16** | Como usuario, quiero ver el historial de compras de un cliente para darle un trato personalizado. | **Should** |
| **HU-17** | Como administrador, quiero registrar proveedores para llevar control de de dónde viene la mercancía. | **Should** |
| **HU-18** | Como administrador, quiero ver una lista de deudas de clientes (si se permite crédito). | **Could** |

## Módulo 4: Ventas y Punto de Venta (POS)
| ID | Historia de Usuario | Prioridad |
| :--- | :--- | :--- |
| **HU-19** | Como cajero, quiero buscar productos y agregarlos a un carrito para realizar una venta. | **Must** |
| **HU-20** | Como cajero, quiero aplicar descuentos globales o por producto a una venta. | **Should** |
| **HU-21** | Como cajero, quiero seleccionar diferentes medios de pago (Efectivo/Tarjeta). | **Must** |
| **HU-22** | Como sistema, quiero descontar automáticamente el stock tras cada venta confirmada. | **Must** |
| **HU-23** | Como cliente, quiero recibir un comprobante (físico o PDF) de mi compra. | **Must** |
| **HU-24** | Como administrador, quiero anular ventas erróneas (ajustando el inventario de vuelta). | **Should** |
| **HU-25** | Como cajero, quiero dejar una venta en "Espera" para atender a otro cliente rápidamente. | **Could** |

## Módulo 5: Reportes y Dashboard
| ID | Historia de Usuario | Prioridad |
| :--- | :--- | :--- |
| **HU-26** | Como administrador, quiero ver el total de ventas del día en el dashboard principal. | **Must** |
| **HU-27** | Como administrador, quiero ver un gráfico de los 5 productos más vendidos del mes. | **Should** |
| **HU-28** | Como administrador, quiero generar un reporte de inventario valorizado (cuánto dinero tengo en stock). | **Must** |
| **HU-29** | Como usuario, quiero exportar mis reportes de ventas a Excel/CSV para manejarlos externamente. | **Should** |
| **HU-30** | Como administrador, quiero ver el margen de ganancia neto por cada producto/venta. | **Could** |

## Módulo 6: Configuración
| ID | Historia de Usuario | Prioridad |
| :--- | :--- | :--- |
| **HU-31** | Como administrador, quiero configurar el nombre, RUT y logo de mi empresa para las facturas. | **Must** |
| **HU-32** | Como administrador, quiero configurar el porcentaje de impuestos (IVA) vigente. | **Must** |
| **HU-33** | Como usuario, quiero cambiar de tema (claro/oscuro) para mayor comodidad visual. | **Could** |
| **HU-34** | Como administrador, quiero configurar una impresora térmica por defecto. | **Could** |
| **HU-35** | Como sistema, quiero realizar backups automáticos de la base de datos semanalmente. | **Should** |

---

Observaciones:
- Uniformiza el término de documento (cédula / documento / RUT) según país objetivo.
- Usa siempre `IVA` en mayúsculas.

Recomendación: agrega criterios de aceptación breves para cada `HU-XX` y crea Issues en GitHub vinculados al milestone `MVP v1.0`.

Fecha: 26/02/2026

---

## Criterios de Aceptación (resumen por HU)

- **HU-01:** Registro: el usuario puede registrarse con email único y contraseña (mínimo 8 caracteres); se crea registro en la tabla `users` y puede iniciar sesión.
- **HU-02:** Login: con credenciales válidas se crea sesión/tokén; con credenciales inválidas se retorna error 401.
- **HU-03:** Roles: el Admin puede asignar rol a un usuario y los permisos básicos cambian según rol (ej. acceso a configuración).
- **HU-04:** Logout: al cerrar sesión el token se invalida y rutas protegidas devuelven 401.
- **HU-05:** Recuperar contraseña: al solicitar recuperación se envía un email con token válido por tiempo limitado.
- **HU-06:** Editar perfil: el usuario puede actualizar nombre y foto; campos validados y cambios reflejados en su perfil.

- **HU-07:** Crear producto: al guardar producto con código único, aparece en listado con ID y datos correctos.
- **HU-08:** Listar/filtrar productos: la lista soporta filtros por categoría y búsqueda por nombre/código, con paginación.
- **HU-09:** Actualizar producto: cambios en precio/descr. se guardan y reflejan en listados y facturas futuras.
- **HU-10:** Eliminación lógica: eliminar marca `deleted_at` (soft delete) y producto no aparece en listados activos.
- **HU-11:** Alerta stock bajo: al ingresar stock por debajo de `min_stock` aparece alerta en UI y en endpoint de productos críticos.
- **HU-12:** Imágenes: subida de imagen valida (jpg/png), límite de tamaño y URL accesible desde la ficha del producto.
- **HU-13:** Etiquetas/códigos de barra: generar archivo imprimible (PDF o CSV) con código y nombre por lote.

- **HU-14:** Registrar cliente: crear cliente con documento único; aparece en listado de clientes.
- **HU-15:** Buscar cliente: búsqueda por nombre o documento devuelve coincidencias relevantes.
- **HU-16:** Historial de compras: al consultar cliente se listan facturas asociadas paginadas.
- **HU-17:** Registrar proveedor: crear proveedor con datos básicos y aparecer en listado de proveedores.
- **HU-18:** Deudas clientes: generar listado de clientes con saldo pendiente cuando se use crédito.

- **HU-19:** POS carrito: agregar productos al carrito con cantidad, ver subtotal y total antes de confirmar.
- **HU-20:** Aplicar descuentos: aplicar descuento por item o global y que el total se recalcule correctamente.
- **HU-21:** Medios de pago: registrar medio de pago en la venta y guardarlo en `invoices`.
- **HU-22:** Descontar stock: al confirmar venta se reduce stock y la transacción es atómica (rollback si falla).
- **HU-23:** Comprobante: al finalizar venta el sistema devuelve PDF/print-friendly y guarda registro en DB.
- **HU-24:** Anular venta: la anulación crea movimiento inverso y ajusta stock correctamente.
- **HU-25:** Ventas en espera: guardar venta temporalmente y recuperarla por ID de sesión.

- **HU-26:** Dashboard ventas día: el dashboard muestra total de ventas del día calculado desde `invoices`.
- **HU-27:** Gráfico top 5: reporte que agrupa ventas por producto y presenta los 5 con mayor cantidad vendida en periodo.
- **HU-28:** Inventario valorizado: calculo (stock * costo) por producto y suma total; datos exportables.
- **HU-29:** Exportar reportes: endpoint que genera CSV/Excel con los datos filtrados y lo descarga.
- **HU-30:** Margen por producto: calcular margen (precio - costo) y mostrar en reporte por producto.

- **HU-31:** Configurar empresa: guardar nombre, identificación y logo y que se muestren en las facturas generadas.
- **HU-32:** Configurar IVA: valor de IVA configurable y aplicado en cálculo de facturas.
- **HU-33:** Tema oscuro/claro: preferencia guardada por usuario y aplicada en UI.
- **HU-34:** Impresora por defecto: guardar preferencia de impresora en perfil/admin y usarla en impresión POS.
- **HU-35:** Backups automáticos: job programado que crea backup semanal y almacena un número limitado de versiones.

---

Nota: estos criterios son breves y deben trasladarse a `Acceptance Criteria` de cada Issue cuando se creen en GitHub.

