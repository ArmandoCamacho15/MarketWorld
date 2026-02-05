# MarketWorld

Sistema de Gestión Empresarial (ERP) desarrollado como proyecto académico del SENA.

---

## Descripción

MarketWorld es una aplicación web que permite gestionar las operaciones de un negocio de manera integral. Incluye módulos para inventario, facturación, contabilidad, compras, gestión de clientes (CRM) y generación de reportes.

Este proyecto fue desarrollado como parte del programa **Tecnólogo en Análisis y Desarrollo de Software** del Servicio Nacional de Aprendizaje (SENA).

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
| **Reportes** | Generación de informes y gráficos |
| **Configuración** | Gestión de usuarios y permisos del sistema |

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

### Paso 1: Descargar el proyecto

`ash
git clone https://github.com/tu-usuario/marketworld.git
cd marketworld
`

### Paso 2: Abrir en VS Code

`ash
code .
`

### Paso 3: Ejecutar con Live Server

1. Instala la extensión **Live Server** en VS Code
2. Haz clic derecho en `html/Login.html`
3. Selecciona **Open with Live Server**

### Paso 4 (Opcional): Configurar base de datos

`ash
mysql -u root -p < marketworld_base_de_datos/schema/marketworld_schema.sql
`

---

## Uso

### Credenciales de prueba

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin@marketworld.com | admin123 | Administrador |
| ventas@marketworld.com | ventas123 | Vendedor |
| user@marketworld.com | 123456 | Usuario |

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
    MANUAL_USUARIO.md

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

## Autor

**Armando Camacho**

- Programa: Tecnólogo en Análisis y Desarrollo de Software
- Institución: Servicio Nacional de Aprendizaje (SENA)
- Año: 2025

---

## Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.

---

> Proyecto académico desarrollado con fines educativos.