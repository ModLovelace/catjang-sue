# Memoria: Contexto Activo y Trabajo en Curso (Active Context)

## 1. Rama Activa
- **Rama Actual:** `feature/linux-adaptation`
- **Repositorio Remoto:** `https://github.com/ModLovelace/catjang-sue.git`
- **Regla Estricta:** Todo el desarrollo y ajuste de Linux se realiza **exclusivamente** en `feature/linux-adaptation`. **NO mergear ni hacer push a `main`** hasta que las pruebas humanas sean validadas y aprobadas por el usuario.
- **Estado de Git:** Rama limpia, sincronizada con `origin/feature/linux-adaptation`. 54/54 tests pasados con código de salida 0.

---

## 2. Adaptación para Linux (Ubuntu 24.04 / 26.04 Wayland)

### A. Arquitectura Base Seleccionada: Opción 1 (XWayland + `setShape()` + Electron)
- **Ejecución:** `./run-linux.sh` (utiliza `--ozone-platform=x11`).
- **Motivación técnica:** En Wayland nativo puro, Chromium delega el arrastre a `xdg_toplevel.move`, bloqueando los eventos `mousemove` en JavaScript e impidiendo la física elástica de resorte, la oscilación de péndulo y el reposicionamiento suave. Con XWayland se preserva la experiencia interactiva completa.

### B. Seguimiento Ocular Global del Cursor (Eyes Tracking vía DBus)
- **Problema resuelto:** En Wayland, la API `screen.getCursorScreenPoint()` de Electron en clientes XWayland se congela cuando el cursor no está sobre una ventana X11 (por ejemplo, sobre Brave, VS Code, GNOME Terminal o el escritorio).
- **Implementación:**
  - Se creó [`scripts/linux-cursor-tracker.py`](../../scripts/linux-cursor-tracker.py): Consulta por DBus la extensión de GNOME Shell `kando-integration` (`org.gnome.Shell.Extensions.KandoIntegration.GetWMInfo`) a 50 Hz con latencia ultrabaja (0.2 ms por llamada).
  - En `main.js`: `startLinuxCursorTracker()` lanza el proceso Python en segundo plano al abrir `petWin` y alimenta `lastKnownGlobalCursor`. `startCursorPoll()` calcula `dx, dy` contra los ojos de la mascota (`b.y + Math.round(b.height * 0.32)`).
  - Limpieza asegurada en `petWin.on("closed")` y `app.on("will-quit")` mediante `stopLinuxCursorTracker()`.

### C. Animación de Estiramiento de Cuerpo Completo y Péndulo al Arrastrar
- **Problema resuelto:** Con `setShape()`, la ventana en reposo se recorta a 111x111 px para dar click-through transparente al escritorio. Al arrastrar al gato, el cuerpo de 16 segmentos se elonga hasta 385 px de altura. Como la máscara de forma de X11 quedaba fija en 111 px, toda la espina dorsal y patas quedaban recortadas de forma invisible y el mouse perdía el foco al salir del recuadro.
- **Implementación:**
  - En `renderer/renderer.js`: `beginDragStretch()` llama a `window.electronAPI.setWindowShape([])` para liberar el área de renderizado a los 500x480 px completos.
  - Se añade guarda `if (dragging) return;` en `scheduleNativeWindowShapeUpdate()`.
  - Al soltar la mascota y finalizar la oscilación amortiguada (`finishDragStretch` o tras asentarse en `chainTick`), se vuelve a invocar `scheduleNativeWindowShapeUpdate()` para restaurar la silueta y transparencia del escritorio.
  - Se agregaron `setPointerCapture` y `releasePointerCapture` en `#drag-handle` para prevenir pérdida de eventos durante movimientos bruscos.
  - En `renderer/styles.css`: se forzó `aspect-ratio: 80 / 148 !important` y anchura para `#stretch-svg-end`.

### D. Estiramiento Periódico en Pantalla Completa (*Break Stretch*)
- En Linux, `setBounds()` en la ventana principal corrompe las coordenadas y la máscara bajo GNOME Mutter.
- Se implementó un overlay independiente a pantalla completa (`renderer/stretch-overlay.html`) adaptado al monitor activo (probado en UltraWide 2560x1080 centrado a 72:56), ocultando temporalmente `petWin` sin moverla.
- Windows y macOS mantienen intacto el resize animado original con `setBounds()`.

---

## 3. Estado de la Suite de Pruebas y Validación Automatizada
- `npm run test:mascots`: 54/54 comprobaciones aprobadas (recursos, 8/8 SVG, DOM, CSS y nombres de las 6 mascotas: Catjang, Toto, Chisi, Milo, Musubi, Chuño).
- `./run-linux.sh --catjang-smoke-test`: Aprobado (arranque, inicialización de ventanas y salida limpia con código 0).
- `./run-linux.sh --catjang-test-stretch`: Aprobado (ciclo E2E de overlay de estiramiento y restauración de petWin).
- `python3 scripts/linux-cursor-tracker.py`: Aprobado (emite coordenadas globales en tiempo real).
- **Prueba pendiente:** Validación humana directa ejecutando `./run-linux.sh`.

---

## 4. Historial Previo de Desarrollos (v0.1.40-experimental.1 y Chuño)
- Estandarización de "Chuño" (Perro Peruano Calado; ID técnico `peruperro`): 8 animaciones, alternancia de teclado 3D de 4px, silueta roja progresiva por calor (Typing Heat) y balanceo oscilatorio de arrastre.
- Pre-release público v0.1.40-experimental.1 con soporte para macOS Apple Silicon arm64/x64 y Windows x64.
