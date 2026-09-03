# Guía para Agentes de IA: Cómo Agregar una Nueva Mascota a Catjang

Esta guía proporciona la arquitectura exacta, la matriz de animaciones equivalentes y el paso a paso detallado para que cualquier agente de IA o desarrollador pueda incorporar una nueva mascota (por ejemplo: hámster, conejo, corgi, etc.) al ecosistema de Catjang sin romper la funcionalidad existente.

---

## 1. Arquitectura de Mascotas

Catjang organiza todas sus mascotas bajo una **matriz de equivalencias** basada en el gato original. Toda mascota debe cumplir con las siguientes características:
1. **Nombre propio independiente**: Cada mascota guarda su propio nombre en `settings.json` (`mascotNames[id]`). Al cambiar de mascota, el cartel sobre su cabeza (`#share-name-badge`) se actualiza automáticamente a su nombre.
2. **8 Poses / Animaciones SVG equivalentes**: Toda acción del usuario (escribir, scroll, salto, arrastrar, estirarse) tiene una animación equivalente dedicada para cada mascota.
3. **Aislamiento visual estricto en CSS**: Cuando una mascota está activa, ningún sprite de otra mascota debe ser visible.

---

## 2. La Matriz de 8 Animaciones Equivalentes

Toda mascota nueva debe tener implementados sus 8 archivos SVG dentro de la carpeta `svg/`:

| Pose / Acción | Clave Registro | ID del Objeto DOM | Archivo SVG Gato Base | Archivo SVG Schnauzer | Descripción |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Idle (Base)** | `idle` | `id="[mascot]"` | `svg/cat-idle-follow-v2.svg` | `svg/schnauzer-idle.svg` | Pose de reposo con pupilas (`#pupil-left`, `#pupil-right`) que siguen el ratón, parpadeo y movimiento sutil. |
| **Typing Izquierda** | `pressLeft` | `id="[mascot]-press-left"` | `svg/press-left.svg` | `svg/schnauzer-press-left.svg` | Patita izquierda abajo tecleando en el teclado retro. |
| **Typing Derecha** | `pressRight` | `id="[mascot]-press-right"` | `svg/press-right.svg` | `svg/schnauzer-press-right.svg` | Patita derecha abajo tecleando en el teclado retro. |
| **Rueda / Scroll** | `scroll` | `id="[mascot]-scroll-unroll"` | `svg/scroll-unroll.svg` | `svg/schnauzer-scroll-unroll.svg` | Desenrollando un rollo de papel a toda velocidad con patitas alternadas. |
| **Salto Inicio** | `jumpStart` | `id="[mascot]-jump-start"` | `svg/jump-start.svg` | `svg/schnauzer-jump-start.svg` | Agazapado preparándose para saltar de alegría. |
| **Salto Aire** | `jumpIng` | `id="[mascot]-jump-ing"` | `svg/jump-ing.svg` | `svg/schnauzer-jump-ing.svg` | En el aire con orejas y colita arriba celebrando. |
| **Arrastrar (Drag)** | `drag` | `id="[mascot]-drag"` | `svg/stretch-end.svg` | `svg/schnauzer-drag.svg` | Siendo levantado / colgado del pellejo con patitas colgando al arrastrarlo con el ratón. |
| **Estiramiento** | `stretch` | `id="[mascot]-stretch"` | `svg/stretch-pose-default.svg` | `svg/schnauzer-stretch.svg` | Pose de estiramiento de descanso (patas estiradas al frente, respiración suave). |

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
- **NUNCA añadir `style="display:none;"` inline** a las etiquetas `<object>` en `renderer/index.html`. Toda la visibilidad se gobierna exclusivamente en `renderer/styles.css`.

---

## 4. Paso a Paso para Agregar una Nueva Mascota (Ejemplo: `bunny`)

### Paso 1: Crear los 8 archivos SVG en `svg/`
Crear:
1. `svg/bunny-idle.svg`
2. `svg/bunny-press-left.svg`
3. `svg/bunny-press-right.svg`
4. `svg/bunny-scroll-unroll.svg`
5. `svg/bunny-jump-start.svg`
6. `svg/bunny-jump-ing.svg`
7. `svg/bunny-drag.svg`
8. `svg/bunny-stretch.svg`

### Paso 2: Registrar la Mascota en `renderer/mascots.js`
Añadir la entrada en `MASCOTS`:
```javascript
bunny: {
  id: "bunny",
  defaultName: "Copito",
  label: "Conejito (Bunny) 🐰",
  sound: "squeak",
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
    idle: "svg/bunny-idle.svg",
    pressLeft: "svg/bunny-press-left.svg",
    pressRight: "svg/bunny-press-right.svg",
    scroll: "svg/bunny-scroll-unroll.svg",
    jumpStart: "svg/bunny-jump-start.svg",
    jumpIng: "svg/bunny-jump-ing.svg",
    drag: "svg/bunny-drag.svg",
    stretch: "svg/bunny-stretch.svg",
  },
},
```

### Paso 3: Declarar los Objetos en `renderer/index.html`
Inyectar las etiquetas `<object>` correspondientes (sin `style="display:none;"`):
```html
<object id="bunny" type="image/svg+xml" data="../svg/bunny-idle.svg" aria-label="bunny"></object>
<object id="bunny-press-left" type="image/svg+xml" data="../svg/bunny-press-left.svg" aria-label="bunny-typing-left"></object>
<object id="bunny-press-right" type="image/svg+xml" data="../svg/bunny-press-right.svg" aria-label="bunny-typing-right"></object>
<object id="bunny-scroll-unroll" type="image/svg+xml" data="../svg/bunny-scroll-unroll.svg" aria-label="bunny-scroll"></object>
<object id="bunny-jump-start" type="image/svg+xml" data="../svg/bunny-jump-start.svg" aria-label="bunny-jump-start"></object>
<object id="bunny-jump-ing" type="image/svg+xml" data="../svg/bunny-jump-ing.svg" aria-label="bunny-jumping"></object>
<object id="bunny-drag" type="image/svg+xml" data="../svg/bunny-drag.svg" aria-label="bunny-drag"></object>
<object id="bunny-stretch" type="image/svg+xml" data="../svg/bunny-stretch.svg" aria-label="bunny-stretch"></object>
```

### Paso 4: Añadir Reglas de CSS en `renderer/styles.css`
1. Declarar dimensiones y posicionamiento base para los elementos de la nueva mascota:
```css
#bunny,
#bunny-press-left,
#bunny-press-right,
#bunny-scroll-unroll,
#bunny-jump-start,
#bunny-jump-ing {
  position: absolute;
  left: 50%;
  top: var(--cat-top);
  transform: translateX(-50%);
  width: var(--cat-size);
  aspect-ratio: 1;
  display: none;
  pointer-events: none;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  z-index: 2;
}

#bunny-drag {
  position: absolute;
  top: calc(var(--cat-top) - 10px);
  left: 50%;
  transform: translateX(-50%);
  width: calc(var(--cat-size) * 1.1);
  aspect-ratio: 50 / 64;
  pointer-events: none;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  display: none;
  z-index: 2;
}

#bunny-stretch {
  position: absolute;
  top: var(--cat-top);
  left: 50%;
  transform: translateX(-50%);
  width: 77.1%;
  aspect-ratio: 72 / 56;
  pointer-events: none;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  display: none;
  z-index: 2;
}
```

2. Añadir las reglas de aislamiento para mostrarla cuando `data-mascot="bunny"`:
```css
body[data-mascot="bunny"] #bunny { display: block !important; }
body[data-mascot="bunny"][data-press="left"] #bunny-press-left { display: block !important; }
body[data-mascot="bunny"][data-press="right"] #bunny-press-right { display: block !important; }
body[data-mascot="bunny"][data-scroll] #bunny-scroll-unroll { display: block !important; }
body[data-mascot="bunny"][data-jump="start"] #bunny-jump-start { display: block !important; }
body[data-mascot="bunny"][data-jump="ing"] #bunny-jump-ing { display: block !important; }
body[data-mascot="bunny"].dragging #bunny-drag { display: block !important; }
body[data-mascot="bunny"][data-stretching] #bunny-stretch { display: block !important; }
```

3. Ocultar todos los sprites de `bunny` cuando otra mascota esté activa:
```css
body:not([data-mascot="bunny"]) #bunny,
body:not([data-mascot="bunny"]) #bunny-press-left,
body:not([data-mascot="bunny"]) #bunny-press-right,
body:not([data-mascot="bunny"]) #bunny-scroll-unroll,
body:not([data-mascot="bunny"]) #bunny-jump-start,
body:not([data-mascot="bunny"]) #bunny-jump-ing,
body:not([data-mascot="bunny"]) #bunny-drag,
body:not([data-mascot="bunny"]) #bunny-stretch {
  display: none !important;
}
```

### Paso 5: Registrar en `main.js` (Menú Contextual e Identidad)
1. En `mascotNames`:
```javascript
let mascotNames = {
  cat: "Catjang",
  schnauzer: "Otto",
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

### Paso 6: Actualizar `renderer/renderer.js`
1. Añadir los IDs de la nueva mascota al bucle de registro de SVGs:
```javascript
for (const id of [
  ...,
  "bunny", "bunny-press-left", "bunny-press-right", "bunny-scroll-unroll",
  "bunny-jump-start", "bunny-jump-ing", "bunny-drag", "bunny-stretch"
]) {
  registerSvgObjectWhenReady(id);
}
```
2. Registrar los IDs en la lista de selectores de forma de ventana (`selectors` en `scheduleNativeWindowShapeUpdate`).
3. En `currentPoseElement()` y `scrollSvgObject()`, mapear los IDs correspondientes cuando `currentMascot === "bunny"`.

---

## 5. Pruebas y Verificación Automatizada

Antes de dar por terminada la integración, ejecutar:
```bash
# 1. Comprobar recursos y equivalencias
node scripts/test-mascot.js

# 2. Ejecutar la suite de pruebas con Electron real
npx electron scripts/test-mascot-switch.js
```
Ambas pruebas deben pasar con **100% de éxito**.
