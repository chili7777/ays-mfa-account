# 🎨 Prompt de Diseño para Microfrontends (Estética Minimalista Dark - Master)

## Contexto
Este Microfrontend (MFE) debe integrarse perfectamente en una Shell bancaria. El diseño es **minimalista, oscuro (Dark Mode) y extremadamente limpio**. No debe parecer una aplicación independiente, sino una sección fluida de la Shell.

---

## 1. Estética y Layout
- **Minimalismo Extremo:** Elimina sombras pesadas. Usa líneas finas (`1px`) y espaciado generoso (aire) para separar elementos.
- **Fondo:** El fondo principal debe ser `#0b0e11`.
- **Integración:** No incluyas Headers, Footers ni Menús globales. El MFE ocupa el 100% del espacio disponible.
- **Scroll:** Oculta las barras de desplazamiento visuales pero mantén la funcionalidad de scroll vertical.
- **Bordes:** Radio de curvatura de `12px` para botones y contenedores principales; `8px` para inputs y elementos menores.

---

## 2. Paleta de Colores (Variables CSS/SCSS)
Usa estas variables exactas para mantener la consistencia:

```scss
$theme-dark-bg: #0b0e11;           /* Fondo principal */
$theme-dark-surface: #1e2329;      /* Superficies (modales, contenedores) */
$theme-dark-surface-hover: #2b3139; /* Estados de hover */
$theme-dark-text-primary: #eaecef;  /* Texto principal */
$theme-dark-text-secondary: #848e9c; /* Texto de apoyo (Gris) */
$theme-dark-accent: #005ce6;        /* Azul acento (Primarios) */
$theme-dark-accent-light: #58a6ff;  /* Azul acento claro */
$theme-dark-border: rgba(43, 49, 57, 0.5); /* Bordes sutiles */

/* Colores Semánticos (Dark Style) */
$theme-dark-success: #00c076;       /* Verde (Crear / Éxito) */
$theme-dark-warning: #f0b90b;       /* Amarillo (Editar / Alerta) */
$theme-dark-error: #d41020;         /* Rojo (Eliminar / Error) */
```

---

## 3. Componentes de Interfaz

### A. Formularios e Inputs (Estilo Underline)
- **Inputs:** Sin fondo (transparentes), sin bordes laterales ni superiores. Solo una línea inferior de `1px` con `$theme-dark-border`.
- **Foco:** Al hacer foco, la línea cambia a `$theme-dark-accent` y se añade un fondo muy sutil (opacidad baja).
- **Selects:** Usa una flecha personalizada minimalista.

### B. Botones de Acción
- **Estilo:** Fondos semi-transparentes con bordes definidos del mismo color.
- **Colores:**
  - **Nueva/Crear:** Fondo verde ultra-sutil con texto verde.
  - **Editar:** Fondo amarillo ultra-sutil con texto amarillo.
  - **Eliminar:** Fondo rojo ultra-sutil con texto rojo.
  - **Secundario/Cancelar:** Fondo transparente con borde gris.

### C. Listas y Tablas
- **Desktop:** Tablas sin bordes exteriores. Filas separadas por una línea de `1px` sutil.
- **Mobile:** Lista vertical simple. Cada elemento separado por una línea, con un indicador visual discreto (ej: `›`) para navegar al detalle.

### D. Estados Vacíos (Empty States)
- Si no hay datos, muestra un icono de Material Icons grande pero de color tenue (`$theme-dark-text-secondary`), un título claro y una breve instrucción.

---

## 4. Tipografía e Iconografía
- **Fuente:** Sans-serif moderna (Segoe UI, Roboto o Inter).
- **Iconos:** Material Icons. Úsalos con un tamaño consistente (generalmente `18px` o `24px`).

---

## 5. Reglas de CSS Global (Snippet)
```css
/* Ocultar scrollbar */
html, body {
  background-color: #0b0e11;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
body::-webkit-scrollbar {
  display: none;
}

/* Estilo de Input Minimalista */
.form-control {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(43, 49, 57, 0.5);
  border-radius: 0;
  color: #eaecef;
}
.form-control:focus {
  border-bottom-color: #005ce6;
  background: rgba(30, 35, 41, 0.3);
}
```
