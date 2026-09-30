# Reglas y Memoria de Workspace: Catjang (Sue) Desktop Pet

## Visión General del Proyecto
Catjang es una mascota de escritorio interactiva, ligera y amigable para desarrolladores (incluye temporizador Pomodoro, recordatorios configurables, descanso activo con estiramiento y soporte para agentes de IA).

- **Repositorio:** `https://github.com/ModLovelace/catjang-sue.git`
- **Ruta local:** `/home/modlovelace/Documentos/mod/catjang-sue`
- **Rama principal unificada:** `main` (Windows, Linux y macOS integrados en una sola base de código).
- **Rama activa de desarrollo para Linux:** `feature/linux-adaptation`

---

## 🚨 REGLA DE ORO DE DESARROLLO (LEER PRIMERO)
1. **NUNCA modificar ni empujar cambios de Linux directamente a `main`:**
   Todo el desarrollo, ajustes y pruebas de Linux deben permanecer estrictamente en la rama **`feature/linux-adaptation`**. Solo cuando el usuario humano pruebe, valide y dé su aprobación explícita, se integrará a `main`.
2. **CERO regresiones en Windows y macOS:**
   Todo código específico para Linux debe estar encapsulado bajo condicionales de plataforma (`if (IS_LINUX) { ... }`). Las rutas de código de Windows y macOS no deben alterarse.
3. **Validación obligatoria antes de cualquier commit:**
   Ejecutar siempre `npm run test:mascots` (deben pasar las 54 validaciones) y los smoke tests.

---

## Mascota Activa y Elenco Completo
El proyecto soporta 6 mascotas con equivalencia del 100% (8 poses SVG cada una: `idle`, `pressLeft`, `pressRight`, `scroll`, `jumpStart`, `jumpIng`, `drag`, `stretch`):
1. **Catjang (`cat`):** Gatito negro por defecto.
2. **Schnauzer (`schnauzer`):** Perrito Toto.
3. **Chisi (`chisi`):** Caniche Toy.
4. **Milo (`milo`):** Milongas.
5. **Musubi (`musubi`):** Gato atigrado.
6. **Chuño (`peruperro`):** Perro sin pelo del Perú (diseñado para la comunidad peruana).

---

## Comandos Esenciales

| Acción | Comando |
| :--- | :--- |
| **Lanzar en Linux (XWayland + setShape)** | `./run-linux.sh` (o `npm run start:linux`) |
| **Comprobación de equivalencia de mascotas** | `npm run test:mascots` (54 validaciones obligatorias) |
| **Prueba de humo (Smoke Test)** | `./run-linux.sh --catjang-smoke-test` |
| **Prueba E2E de estiramiento** | `./run-linux.sh --catjang-test-stretch` |
| **Comprobar tracker DBus de cursor** | `python3 scripts/linux-cursor-tracker.py` |
| **Lanzar en Windows** | `npm run start:desktop` |

---

## Arquitectura Técnica en Linux (Ubuntu 24.04/26.04 Wayland)

### 1. Base del Sistema: Opción 1 (XWayland + `setShape()` + Electron)
- El ejecutable `./run-linux.sh` ejecuta Electron bajo XWayland (`--ozone-platform=x11`).
- **Por qué XWayland:** En Wayland nativo puro, Chromium delega los eventos de arrastre a `xdg_toplevel.move`, bloqueando los eventos `mousemove` en JavaScript. XWayland permite recibir eventos continuos de ratón, cálculo de velocidad, física elástica de resorte, oscilación pendular y reposicionamiento suave.
- En Ubuntu 24.04+ / 26.04+, `./run-linux.sh` detecta si los namespaces de usuario están restringidos y gestiona `--no-sandbox` de manera segura.

### 2. Recorte de Ventana y Arrastre Elástico (`setShape`)
- **Problema histórico:** En reposo, `setShape()` recorta la ventana nativa a 111x111 px para dar click-through transparente al escritorio. Pero al arrastrar al gato, el cuerpo se elonga dinámicamente con un acordeón de 16 segmentos (hasta 385 px de altura) y oscila lateralmente. Con la máscara de 111 px fija, la animación de estiramiento quedaba recortada de forma invisible y el puntero perdía el foco al salir de los 111 px.
- **Solución implementada:**
  - En `renderer/renderer.js`: al iniciar el arrastre (`beginDragStretch`), se llama a `window.electronAPI.setWindowShape([])` para liberar el recorte, disponiendo de los 500x480 px completos.
  - La actualización periódica de forma se pausa mientras `dragging` está activo (`if (dragging) return;` en `scheduleNativeWindowShapeUpdate()`).
  - Al soltar la mascota y finalizar la oscilación amortiguada (`finishDragStretch` o tras estabilizarse en `chainTick`), se invoca `scheduleNativeWindowShapeUpdate()` para restaurar la silueta compacta y la transparencia del escritorio.
  - Se añadieron `setPointerCapture` y `releasePointerCapture` en `#drag-handle` para que ningún movimiento veloz del cursor interrumpa el arrastre.
  - En `renderer/styles.css`: se fijó `aspect-ratio: 80 / 148 !important` y anchura forzada en `#stretch-svg-end` para impedir que reglas CSS secundarias aplasten la anatomía de Catjang.

### 3. Seguimiento Ocular Global del Cursor (Eyes Tracking)
- **Problema histórico:** En sesiones Wayland, la API `screen.getCursorScreenPoint()` de Electron en clientes XWayland sólo recibe eventos cuando el cursor está sobre ventanas X11. Cuando el usuario mueve el ratón sobre aplicaciones nativas Wayland (Brave, VS Code, Terminal) o el fondo del escritorio, la API se congela en la última posición conocida y la mascota deja de seguir al cursor con sus ojos.
- **Solución implementada:**
  - Script independiente [`scripts/linux-cursor-tracker.py`](scripts/linux-cursor-tracker.py): Consulta en tiempo real vía DBus a la extensión activa de GNOME Shell `kando-integration` (`org.gnome.Shell.Extensions.KandoIntegration.GetWMInfo`) a 50 Hz con una latencia de apenas **0.2 ms** por llamada. Emite `x y\n` por stdout solo cuando cambian las coordenadas.
  - Proceso principal [`main.js`](main.js):
    - `startLinuxCursorTracker()` arranca el script en segundo plano y alimenta la variable `lastKnownGlobalCursor`.
    - `startCursorPoll()` utiliza `lastKnownGlobalCursor` si está en Linux, calculando `dx, dy` con respecto al centro vertical de los ojos (`b.y + Math.round(b.height * 0.32)`).
    - `stopLinuxCursorTracker()` asegura la terminación limpia del proceso Python al destruir la ventana o salir de la aplicación (`petWin.on("closed")` y `app.on("will-quit")`).

### 4. Estiramiento Periódico de Pantalla Completa (*Break Stretch*)
- En Linux, redimensionar `petWin` mediante `setBounds()` descoloca la ventana bajo Mutter y corrompe `setShape()`.
- En su lugar, se oculta temporalmente `petWin` con `body.pet-hidden-for-stretch` y se despliega una ventana overlay transparente fullscreen (`renderer/stretch-overlay.html`) adaptada a la resolución del monitor activo (probado en UltraWide 2560x1080 centrado a 72:56).
- Tras 3 segundos (`STRETCH_DURATION_MS`), el overlay se destruye y `petWin` reaparece intacta en su posición original.
- Windows y macOS continúan utilizando el `setBounds()` animado original sin alteraciones.

---

## Guía de Continuidad para Otros Agentes de IA

Si eres un agente de IA que toma el relevo de este proyecto:
1. **Comprobar la rama:** Verifica siempre con `git branch --show-current` que estás en `feature/linux-adaptation`.
2. **Si necesitas corregir algo en Linux:**
   - Edita los archivos manteniendo los bloques `if (IS_LINUX)`.
   - Ejecuta `npm run test:mascots`.
   - Ejecuta `./run-linux.sh --catjang-smoke-test`.
   - Ejecuta `./run-linux.sh --catjang-test-stretch`.
   - Haz commit en `feature/linux-adaptation` y sube a `origin feature/linux-adaptation`.
   - **NO hagas merge ni push a `main`** hasta que el usuario humano confirme que probó `./run-linux.sh` y todo funciona como desea.
