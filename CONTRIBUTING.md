# Guía de Contribución

Gracias por tu interés en contribuir a MarketWorld. Esta guía te ayudará a entender cómo puedes colaborar en el proyecto.

---

## Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Reportar Errores](#reportar-errores)
- [Sugerir Mejoras](#sugerir-mejoras)
- [Enviar Cambios](#enviar-cambios)
- [Estándares de Código](#estándares-de-código)
- [Estructura de Commits](#estructura-de-commits)

---

## Código de Conducta

Este proyecto sigue un código de conducta que promueve un ambiente respetuoso y colaborativo. Al participar, te comprometes a:

- Ser respetuoso con todos los colaboradores
- Aceptar críticas constructivas
- Enfocarte en lo mejor para el proyecto
- Mostrar empatía hacia otros miembros

---

## Cómo Contribuir

### 1. Haz un Fork del repositorio

Crea una copia del proyecto en tu cuenta de GitHub.

### 2. Clona tu Fork

```bash
git clone https://github.com/tu-usuario/marketworld.git
cd marketworld
```

### 3. Crea una rama para tu cambio

```bash
git checkout -b feature/nombre-de-tu-mejora
```

### 4. Realiza tus cambios

Edita los archivos necesarios siguiendo los estándares del proyecto.

### 5. Confirma tus cambios

```bash
git add .
git commit -m "feat: descripción breve del cambio"
```

### 6. Sube los cambios

```bash
git push origin feature/nombre-de-tu-mejora
```

### 7. Abre un Pull Request

Desde GitHub, crea un Pull Request describiendo tus cambios.

---

## Reportar Errores

Si encuentras un error, abre un Issue con la siguiente información:

### Plantilla para reportar errores

```markdown
## Descripción del error

Descripción clara del problema.

## Pasos para reproducir

1. Ir a '...'
2. Hacer clic en '...'
3. Ver el error

## Comportamiento esperado

Qué debería pasar.

## Comportamiento actual

Qué está pasando.

## Capturas de pantalla

Si aplica, agrega capturas.

## Entorno

- Navegador: [Chrome, Firefox, etc.]
- Sistema operativo: [Windows, macOS, Linux]
```

---

## Sugerir Mejoras

Para proponer nuevas funcionalidades:

1. Verifica que no exista una propuesta similar
2. Abre un Issue con la etiqueta `enhancement`
3. Describe la mejora y su beneficio
4. Si es posible, incluye ejemplos o mockups

---

## Enviar Cambios

### Criterios de aceptación

Los Pull Requests deben:

- Seguir los estándares de código del proyecto
- Incluir comentarios cuando sea necesario
- No romper funcionalidades existentes
- Estar enfocados en un solo cambio

### Revisión

- Los cambios serán revisados antes de fusionarse
- Puede solicitarse modificaciones adicionales
- Los cambios aprobados se fusionarán a la rama principal

---

## Estándares de Código

### HTML

- Usar indentación de 4 espacios
- Incluir atributos `alt` en imágenes
- Usar etiquetas semánticas
- Asociar `label` con campos de formulario

```html
<!-- Correcto -->
<label for="email">Correo electrónico</label>
<input type="email" id="email" name="email" required>

<!-- Incorrecto -->
<input type="email" placeholder="Email">
```

### CSS

- Usar nombres de clases descriptivos
- Agrupar propiedades relacionadas
- Comentar secciones importantes

```css
/* Correcto */
.login-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* Incorrecto */
.lf { display:flex;flex-direction:column; }
```

### JavaScript

- Usar `const` y `let`, evitar `var`
- Nombrar funciones de forma descriptiva
- Agregar comentarios explicativos
- Usar funciones de flecha cuando sea apropiado

```javascript
// Correcto
const validateEmail = (email) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
};

// Incorrecto
function v(e) { return e.match(/@/) != null; }
```

---

## Estructura de Commits

Usa el formato de commits convencionales:

```
tipo: descripción breve
```

### Tipos de commits

| Tipo | Descripción |
|------|-------------|
| `feat` | Nueva funcionalidad |
| `fix` | Corrección de errores |
| `docs` | Cambios en documentación |
| `style` | Cambios de formato (no afectan código) |
| `refactor` | Refactorización de código |
| `test` | Agregar o modificar pruebas |
| `chore` | Tareas de mantenimiento |

### Ejemplos

```bash
feat: agregar validación de formulario en login
fix: corregir error de cálculo en facturación
docs: actualizar instrucciones de instalación
style: formatear código de dashboard.js
```

---

## Preguntas

Si tienes dudas, abre un Issue con la etiqueta `question`.

---

> Gracias por contribuir a MarketWorld.
