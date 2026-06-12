# MarketWorld

Sistema de Gestión Empresarial (ERP) desarrollado como proyecto académico del SENA.

---

## Descripción

MarketWorld es un Sistema de Planificación de Recursos Empresariales (ERP) que permite gestionar las operaciones de un negocio de manera integral. Incluye módulos para inventario, facturación, contabilidad, compras, gestión de clientes (CRM) y generación de reportes.

### Arquitectura (Desacoplada / Headless)

El sistema funciona bajo una **arquitectura desacoplada (Headless)**:
- **Frontend:** Desplegado en Vercel (`https://marketworld-erp.vercel.app`)
- **Backend/API:** Desplegado en DigitalOcean App Platform (`https://marketworld-api-k8bvf.ondigitalocean.app/api/v1`)
- **Base de Datos:** Clúster gestionado de MySQL 8.0 en DigitalOcean.

### Seguridad y Autenticación

El sistema implementa una autenticación estrictamente **"Stateless" (Sin estado)**. Se utilizan **Bearer Tokens** provistos por Laravel Sanctum. 

- El token JSON de acceso se almacena localmente en el navegador (`localStorage`).
- El token se inyecta dinámicamente en las cabeceras HTTP de autorización (`Authorization: Bearer <token>`) a través del adaptador del API en cada petición.
- **Importante:** Se ha eliminado cualquier uso de cookies de sesión cross-domain, modos SPA con estado y flujos de inicialización de cookies CSRF en el cliente.

Este proyecto fue desarrollado como parte del programa **Tecnólogo en Análisis y Desarrollo de Software (ADSO)** del Servicio Nacional de Aprendizaje (SENA).

---

## Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Uso](#uso)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Accesibilidad](#accesibilidad)
- [Base de Datos](#base-de-datos)
- [Contribuir](#contribuir)
- [Autor](#autor)
- [Licencia](#licencia)

---

## Características

| Módulo | Descripción |
|--------|-------------|
| **Dashboard** | Panel de control con indicadores clave del negocio |
| **Inventario** | Gestión de productos, stock y movimientos |
| **Facturación** | Punto de venta y emisión de facturas |
| **Contabilidad** | Registro de transacciones financieras |
| **Compras** | Control de proveedores y órdenes de compra |
| **CRM** | Administración de clientes y seguimiento |
| **Reportes** | Informes operativos reales en seis pestañas: Ventas, Inventario, Financiero, CxP, Clientes y Tributario/DIAN |
| **Configuración** | Gestión de usuarios y permisos del sistema |

---

## Alcance Oficial MVP (6 días, 4 módulos)

Para la entrega MVP, el alcance oficial y priorizado queda definido en estos 4 módulos:

1. Inventario
2. Login
3. Facturación
4. Compras

Objetivo del MVP: demostrar flujo funcional de punta a punta (frontend -> API -> MySQL) en operaciones núcleo de cada módulo.

---

## Tecnologías

Este proyecto utiliza las siguientes tecnologías:

- **HTML5** - Estructura semántica de las páginas
- **CSS3** - Estilos y diseño adaptable
- **JavaScript (ES6+)** - Lógica e interactividad
- **Bootstrap 5.3** - Framework CSS para diseño responsivo
- **Bootstrap Icons 1.10** - Biblioteca de iconos
- **Chart.js** - Visualización de datos con gráficos
- **FullCalendar 5.11** - Calendario interactivo
- **MySQL** - Sistema de gestión de base de datos
- **PHP 8.x** - Lenguaje de programación del lado del servidor
- **Laravel 11.x** - Framework PHP para el desarrollo de la API RESTful
- **Laravel Sanctum** - Sistema ligero de autenticación para APIs (Bearer Tokens)

---

## Requisitos

### Software necesario

- Navegador web moderno:
  - Google Chrome 90+
  - Mozilla Firefox 88+
  - Microsoft Edge 90+
  - Safari 14+
- Editor de código (recomendado: Visual Studio Code)
- Servidor web local (opcional):
  - Extensión Live Server para VS Code
  - XAMPP o WAMP

### Para la base de datos (opcional)

- MySQL 8.0 o superior
- Cliente MySQL (MySQL Workbench, phpMyAdmin, DBeaver)

---

## Instalación

### Paso 1: Configurar el Backend (Laravel)
1. Entra a la carpeta del api: `cd backend/marketworld-api`
2. Instala dependencias: `composer install`
3. Configura el entorno local copiando `.env.example`: `cp .env.example .env`.
   
   **Guía de Configuración de Entorno (.env) para Producción:**
   ```env
   # Base de Datos (Apunta a las credenciales encriptadas del clúster de DigitalOcean)
   DB_HOST=your-digitalocean-db-host
   DB_DATABASE=your_database
   DB_USERNAME=your_username
   DB_PASSWORD=your_password
   
   # Configuración CORS y Autenticación Stateless
   CORS_ALLOWED_ORIGINS=https://marketworld-erp.vercel.app
   # SANCTUM_STATEFUL_DOMAINS: ¡ELIMINADO! 
   # Se retiró el dominio de Vercel de esta variable para que el middleware de Sanctum 
   # trate al frontend como un cliente API externo sin estado, previniendo errores 419 (TokenMismatchException).
   ```
4. Genera la clave: `php artisan key:generate`
5. Ejecuta migraciones y datos iniciales: `php artisan migrate --seed`
6. **Inicia el servidor API (Entorno Local):**
   - En CMD: `php artisan serve --port=8000`
   - En PowerShell: `php artisan serve --port=8000`

### Paso 2: Ejecutar el Frontend
Tienes dos opciones para ver la aplicación:

**Opción A (Recomendada): VS Code Live Server**
1. Abre el proyecto en VS Code.
2. Haz clic derecho en `html/Login.html`.
3. Selecciona **Open with Live Server** (puerto 5500).

**Opción B (Línea de comandos):**
Desde la raíz del proyecto, ejecuta:
`php -S 127.0.0.1:5500`

---

## ⚡ Inicio Rápido (Pro)
Para no tener que recordar los comandos, puedes usar el script de automatización incluido en la raíz:
- En Windows: Doble clic a `iniciar_proyecto.bat`
- Esto abrirá dos ventanas: una para la API y otra para el Frontend automáticamente.

---

## Uso

### Credenciales del Sistema (Seeders)

Tras `php artisan migrate --seed`, el usuario administrador se crea desde `UserSeeder` con el correo configurado en `.env` (`ADMIN_EMAIL`, por defecto `admin@marketworld.com`) y la contraseña en `ADMIN_DEFAULT_PASSWORD`.

> [!NOTE]
> No hay usuarios demo en el frontend. El login es exclusivamente vía API (Laravel Sanctum).

### Navegación

1. Inicia sesión desde la página de Login
2. Accede al panel de inicio
3. Utiliza el menú lateral para navegar entre módulos
4. Cierra sesión desde el menú de configuración

---

## Estructura del Proyecto

`
MarketWorld/
 css/                              # Hojas de estilo
    login.css
    inicio.css
    dashboard.css
    inventario.css
    facturacion.css
    contabilidad.css
    compras.css
    crm.css
    reporte.css
    configuracion.css
    nuevo_usuario.css

 html/                             # Páginas HTML
    Login.html
    nuevo_usuario.html
    inicio.html
    dashboard.html
    inventario.html
    facturacion.html
    contabilidad.html
    compras.html
    crm.html
    reporte.html
    configuracion.html

 js/                               # Scripts JavaScript
    utils.js                      # Funciones utilitarias compartidas
    login.js
    nuevo_usuario.js
    inicio.js
    dashboard.js
    inventario.js
    facturacion.js
    contabilidad.js
    compras.js
    crm.js
    reporte.js
    configuracion.js
    sidebar-toggle.js

 img/                              # Recursos gráficos
    logo.png

 marketworld_base_de_datos/        # Base de datos
    schema/
        marketworld_schema.sql

 docs/                             # Documentación
    BASE_DE_DATOS.md
    MANUAL_TECNICO_SENA.md
    MANUAL_USUARIO_FINAL.md

 .editorconfig
 .gitignore
 CHANGELOG.md
 CONTRIBUTING.md
 LICENSE
 README.md
`

---

## Accesibilidad

Este proyecto sigue las pautas de accesibilidad web WCAG 2.1:

- Uso de etiquetas semánticas HTML5 (`header`, `nav`, `main`, `footer`)
- Atributos `aria-label` y `aria-hidden` para lectores de pantalla
- Etiquetas `label` asociadas a todos los campos de formulario
- Contraste de colores adecuado para legibilidad
- Navegación por teclado habilitada
- Textos alternativos en imágenes
- Estructura de encabezados jerárquica

---

## Base de Datos

El sistema utiliza MySQL con las siguientes tablas principales:

| Tabla | Descripción |
|-------|-------------|
| `usuarios` | Datos del personal del sistema |
| `productos` | Catálogo de productos |
| `clientes` | Información de clientes |
| `proveedores` | Datos de proveedores |
| `facturas` | Documentos de venta |
| `detalle_facturas` | Productos por factura |
| `ordenes_compra` | Órdenes a proveedores |
| `movimientos_inventario` | Historial de stock |

Para más detalles, consulta [docs/BASE_DE_DATOS.md](docs/BASE_DE_DATOS.md).

---

## Contribuir

Las contribuciones son bienvenidas. Por favor, lee [CONTRIBUTING.md](CONTRIBUTING.md) para conocer las pautas.

---

## Autores

**Armando Camacho Araque & Jhonatan Zuleta**
- Programa: Tecnólogo en Análisis y Desarrollo de Software (ADSO)
- Ficha: 3070470
- Institución: Servicio Nacional de Aprendizaje (SENA)
- Año: 2026

---

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

> Proyecto académico desarrollado con fines educativos.