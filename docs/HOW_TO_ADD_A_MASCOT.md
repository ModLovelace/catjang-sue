# Guía para Agentes de IA: Cómo Agregar una Nueva Mascota a Catjang

Esta guía proporciona la arquitectura oficial, la matriz de animaciones equivalentes y el paso a paso estándar para que cualquier agente de IA o desarrollador pueda incorporar una nueva mascota (ejemplo: hámster, conejo, corgi, etc.) de forma rápida, limpia y 100% modular.

---

## 1. Arquitectura de Archivos por Mascota

Cada mascota dispone de su propia subcarpeta dentro de `svg/` con exactamente los mismos **8 nombres de archivo canónicos**:

```text
svg/
  ├── cat/
  │    ├── idle.svg                  (pose de reposo y mirada interactiva)
  │    ├── press-left.svg            (tecleo pata izquierda)
  │    ├── press-right.svg           (tecleo pata derecha)
  │    ├── scroll.svg                (desenrollando rollo de papel)
  │    ├── jump-start.svg            (inicio del salto / agazapado)
  │    ├── jump-ing.svg              (en el aire / celebración)
  │    ├── drag.svg                  (suspendido al arrastrar con el ratón)
  │    └── stretch.svg               (estiramiento de descanso periódico)
  └── schnauzer/
       ├── idle.svg
       ├── press-left.svg
       ├── press-right.svg
       ├── scroll.svg
       ├── jump-start.svg
       ├── jump-ing.svg
       ├── drag.svg
       └── stretch.svg
```

Para una nueva mascota (ej. `bunny`), simplemente se crea la carpeta `svg/bunny/` con estos mismos 8 archivos.

---

## 2. La Matriz de 8 Animaciones Equivalentes

| Pose / Acción | Clave Registro | Rol Semántico CSS | Archivo Canónico | Comportamiento |
| :--- | :--- | :--- | :--- | :--- |
| **Idle (Base)** | `idle` | `.mascot-idle` | `idle.svg` | Ojos con pupilas (`#pupil-left`, `#pupil-right`) que siguen el cursor, respiración y parpadeo. |
| **Typing Izq** | `pressLeft` | `.mascot-press-left` | `press-left.svg` | Patita izquierda abajo tecleando. |
| **Typing Der** | `pressRight` | `.mascot-press-right` | `press-right.svg` | Patita derecha abajo tecleando. |
| **Rueda / Scroll** | `scroll` | `.mascot-scroll` | `scroll.svg` | Patitas alternando rápidamente sobre el rollo de papel (`#paper-strip-mask`). |
| **Salto Inicio** | `jumpStart` | `.mascot-jump-start` | `jump-start.svg` | Preparación para el salto. |
| **Salto Aire** | `jumpIng` | `.mascot-jump-ing` | `jump-ing.svg` | En el aire con orejas y cola arriba. |
| **Arrastrar (Drag)** | `drag` | `.mascot-drag` | `drag.svg` | Suspendido del pellejo al ser arrastrado por la pantalla. |
| **Estiramiento** | `stretch` | `.mascot-stretch` | `stretch.svg` | Postura de estiramiento y relajación durante las pausas periódicas. |

---

## 3. Reglas Técnicas Críticas para los Archivos SVG

> [!CAUTION]
> **NO USAR `filter: drop-shadow(...)` de CSS**: En ventanas transparentes de Electron en Windows (`transparent: true`), Chromium evalúa `drop-shadow` de CSS como un **recuadro negro opaco**.
> **Solución obligatoria**: Usar siempre el filtro SVG `<feMorphology>` de Catjang:

```xml
<defs>
  <filter id="mascot-outline" x="-20%" y="-20%" width="140%" height="140%">
    <feMorphology operator="dilate" radius="1" in="SourceAlpha" result="dilated"/>
    <feFlood flood-color="#FFFFFF" result="flood"/>
    <feComposite in="flood" in2="dilated" operator="in" result="outline"/>
    <feMerge>
      <feMergeNode in="outline"/>
      <feMergeNode in="SourceGraphic"/>
    </feMerge>
  </filter>
</defs>

<g id="mascot-content" filter="url(#mascot-outline)">
  <!-- Contenido pixel-art de la mascota -->
</g>
```

- Atributos raíz recomendados: `shape-rendering="crispEdges"`, `xmlns="http://www.w3.org/2000/svg"`, `fill="none"`.
- **NUNCA añadir `style="display:none;"` inline** a las etiquetas `<object>` en `renderer/index.html`. Toda la visibilidad se gobierna mediante las clases universales `.mascot-sprite` en `renderer/styles.css`.

---

## 4. Paso a Paso para Agregar una Nueva Mascota (Ejemplo: `bunny`)

### Paso 1: Crear los 8 archivos SVG en `svg/bunny/`
Crear el directorio `svg/bunny/` y colocar:
1. `svg/bunny/idle.svg`
2. `svg/bunny/press-left.svg`
3. `svg/bunny/press-right.svg`
4. `svg/bunny/scroll.svg`
5. `svg/bunny/jump-start.svg`
6. `svg/bunny/jump-ing.svg`
7. `svg/bunny/drag.svg`
8. `svg/bunny/stretch.svg`

### Paso 2: Registrar la Mascota en `renderer/mascots.js`
Añadir la definición en el objeto `MASCOTS`:
```javascript
bunny: {
  id: "bunny",
  defaultName: "Copito",
  label: "Conejito (Bunny) 🐰",
  soundType: "squeak", // o "meow", "bark"
  folder: "svg/bunny",
  petting: { cx: 0.50, cy: 0.32, rx: 0.26, ry: 0.24 }, // Centro y radio de caricias en la cabeza
  elements: {
    idle: "bunny",
    pressLeft: "bunny-press-left",
    pressRight: "bunny-press-right",
    scroll: "bunny-scroll-unroll",
    jumpStart: "bunny-jump-start",
    jumpIng: "bunny-jump-ing",
    drag: "bunny-drag",
    stretch: "bunny-stretch",
  },
  svgFiles: {
    idle: "svg/bunny/idle.svg",
    pressLeft: "svg/bunny/press-left.svg",
    pressRight: "svg/bunny/press-right.svg",
    scroll: "svg/bunny/scroll.svg",
    jumpStart: "svg/bunny/jump-start.svg",
    jumpIng: "svg/bunny/jump-ing.svg",
    drag: "svg/bunny/drag.svg",
    stretch: "svg/bunny/stretch.svg",
  },
},
```

### Paso 3: Declarar los Objetos en `renderer/index.html`
Inyectar las etiquetas `<object>` usando la clase universal `mascot-sprite` y los roles semánticos correspondientes:
```html
<!-- Bunny Mascot Sprites -->
<object id="bunny" class="mascot-sprite mascot-idle" data-mascot="bunny" data-pose="idle" type="image/svg+xml" data="../svg/bunny/idle.svg" aria-label="bunny"></object>
<object id="bunny-press-left" class="mascot-sprite mascot-press-left" data-mascot="bunny" data-pose="pressLeft" type="image/svg+xml" data="../svg/bunny/press-left.svg" aria-label="bunny-typing-left"></object>
<object id="bunny-press-right" class="mascot-sprite mascot-press-right" data-mascot="bunny" data-pose="pressRight" type="image/svg+xml" data="../svg/bunny/press-right.svg" aria-label="bunny-typing-right"></object>
<object id="bunny-scroll-unroll" class="mascot-sprite mascot-scroll" data-mascot="bunny" data-pose="scroll" type="image/svg+xml" data="../svg/bunny/scroll.svg" aria-label="bunny-scroll"></object>
<object id="bunny-jump-start" class="mascot-sprite mascot-jump-start" data-mascot="bunny" data-pose="jumpStart" type="image/svg+xml" data="../svg/bunny/jump-start.svg" aria-label="bunny-jump-start"></object>
<object id="bunny-jump-ing" class="mascot-sprite mascot-jump-ing" data-mascot="bunny" data-pose="jumpIng" type="image/svg+xml" data="../svg/bunny/jump-ing.svg" aria-label="bunny-jumping"></object>
<object id="bunny-drag" class="mascot-sprite mascot-drag" data-mascot="bunny" data-pose="drag" type="image/svg+xml" data="../svg/bunny/drag.svg" aria-label="bunny-drag"></object>
<object id="bunny-stretch" class="mascot-sprite mascot-stretch" data-mascot="bunny" data-pose="stretch" type="image/svg+xml" data="../svg/bunny/stretch.svg" aria-label="bunny-stretch"></object>
```

### Paso 4: Añadir Soporte en `main.js` (Menú y Nombre Propio)
1. En `mascotNames`:
```javascript
let mascotNames = {
  cat: "Catjang",
  schnauzer: "Toto",
  bunny: "Copito",
};
```
2. En el menú contextual (submenú `mascot`):
```javascript
{
  label: "Conejito (Bunny) 🐰",
  type: "radio",
  checked: currentMascot === "bunny",
  click: () => setMascot("bunny"),
}
```

### Paso 5: CSS en `renderer/styles.css` (Mínimo y Limpio)
Gracias a la clase universal `.mascot-sprite`, solo necesitas declarar las reglas de activación de esa mascota:
```css
/* Activación de Bunny */
body[data-mascot="bunny"] .mascot-sprite:not([data-mascot="bunny"]) { display: none !important; }
body[data-mascot="bunny"] #bunny { display: block !important; }
body[data-mascot="bunny"][data-press="left"] #bunny { display: none !important; }
body[data-mascot="bunny"][data-press="left"] #bunny-press-left { display: block !important; }
body[data-mascot="bunny"][data-press="right"] #bunny { display: none !important; }
body[data-mascot="bunny"][data-press="right"] #bunny-press-right { display: block !important; }
body[data-mascot="bunny"][data-scroll] #bunny { display: none !important; }
body[data-mascot="bunny"][data-scroll] #bunny-scroll-unroll { display: block !important; }
body[data-mascot="bunny"][data-jump="start"] #bunny { display: none !important; }
body[data-mascot="bunny"][data-jump="start"] #bunny-jump-start { display: block !important; }
body[data-mascot="bunny"][data-jump="ing"] #bunny { display: none !important; }
body[data-mascot="bunny"][data-jump="ing"] #bunny-jump-ing { display: block !important; }
body[data-mascot="bunny"].dragging #bunny { display: none !important; }
body[data-mascot="bunny"].dragging #bunny-drag { display: block !important; }
body[data-mascot="bunny"][data-stretching] #bunny { display: none !important; }
body[data-mascot="bunny"][data-stretching] #bunny-stretch { display: block !important; }
```

---

## 5. Pruebas y Verificación Automatizada

Para validar que la integración no tiene errores de renderizado o recursos faltantes:
```bash
# 1. Comprobar recursos y matriz de equivalencias
node scripts/test-mascot.js

# 2. Ejecutar la suite de animación y cambio en vivo en Electron
npx electron scripts/test-mascot-switch.js

# 3. Comprobar reacciones de acariciar (lengüita, ojos, ronroneo/jadeo)
npx electron scripts/test-petting.js
```
Todas las pruebas deben pasar con **código de salida 0**.
