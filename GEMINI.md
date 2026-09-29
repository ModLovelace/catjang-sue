# Reglas y Memoria de Workspace: Catjang (Sue) Desktop Pet

## Visión General del Proyecto
Catjang es una mascota de escritorio interactiva, ligera y amigable para desarrolladores (incluye temporizador Pomodoro, recordatorios configurables, descanso activo con estiramiento y soporte para agentes de IA).

- **Repositorio:** `https://github.com/ModLovelace/catjang-sue.git`
- **Rama principal unificada:** `main` (Windows, Linux y macOS integrados en una sola base de código sin fragmentación).
- **Ruta local:** `/home/modlovelace/Documentos/mod/catjang-sue`

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
| **Lanzar en Linux (Wayland / X11)** | `./run-linux.sh` (o `npm run start:linux`) |
| **Comprobación de equivalencia de mascotas** | `npm run test:mascots` (54 validaciones obligatorias) |
| **Prueba de humo (Smoke Test)** | `./run-linux.sh --catjang-smoke-test` |
| **Prueba E2E de estiramiento** | `./run-linux.sh --catjang-test-stretch` |
| **Configurar hooks de agentes de IA** | `npm run setup:hooks` |
| **Lanzar en Windows** | `npm run start:desktop` |

---

## Reglas de Arquitectura Multiplataforma

### 1. Compatibilidad Multiplataforma Estricta
- **Nunca romper Windows ni macOS:** Todo ajuste específico para Linux debe protegerse con condicionales de plataforma (`if (IS_LINUX) { ... } else { ... }`).
- Mantener la unificación en la rama `main`.

### 2. Linux: XWayland por Defecto para Física Elástica y Posicionamiento
- El ejecutable `./run-linux.sh` utiliza `--ozone-platform=x11` (XWayland en sesiones Wayland) de forma predeterminada.
- **Razón técnica:** En Wayland nativo, Chromium delega el arrastre a `xdg_toplevel.move`, bloqueando los eventos `mousemove` en JavaScript y haciendo imposible la física elástica tipo péndulo, el spine de 16 segmentos y el guardado programático de coordenadas de la ventana. Con XWayland se preserva la experiencia interactiva completa (física elástica, oscilación, soltado suave y guardado de posición).
- Para ejecutar en Wayland nativo puro sin XWayland, se puede activar con `CATJANG_NATIVE_WAYLAND=1 ./run-linux.sh` o pasando `--ozone-platform=wayland`.
- En Ubuntu 24.04+ / 26.04+, el script gestiona `--no-sandbox` automáticamente si las restricciones de espacios de nombres de usuario sin privilegios están activadas.

### 3. Animación de Estiramiento (*Break Stretch*) en Linux
- **Causa raíz:** En Linux (tanto en Wayland como en GNOME Mutter), redimensionar la ventana principal `petWin` mediante `setBounds()` de 500x480 a pantalla completa descoloca la ventana, pierde las coordenadas y corrompe las máscaras de forma (`setShape`).
- **Solución implementada:**
  - En Linux, `petWin` se oculta temporalmente mediante la clase CSS `body.pet-hidden-for-stretch` y **no se mueve ni redimensiona**.
  - Se despliega una ventana overlay transparente a pantalla completa (`renderer/stretch-overlay.html`) cubriendo `display.bounds` (probado en monitores UltraWide 2560x1080 centrado a relación de aspecto 72:56).
  - Tras 3 segundos (`STRETCH_DURATION_MS`), el overlay se destruye y `petWin` reaparece intacta en su posición original.
  - En Windows y macOS se mantiene intacto el resize animado nativo con `petWin.setBounds()`.

### 4. Arrastre y Animación de Drag
- **En X11 / XWayland:** Se ejecuta el sistema de arrastre elástico completo (`pendingDrag`, cálculo de velocidad, oscilación pendular con amortiguación, animación de soltado y visualización de sprite `#<mascot>-drag`).
- **En Wayland nativo (`CATJANG_NATIVE_WAYLAND=1`):** Al no haber eventos de cursor durante el drag del compositor, se activa inmediatamente la clase `.native-dragging` en el `body` al hacer `mousedown` para mostrar el sprite de arrastre (`#<mascot>-drag`) mientras el compositor desplaza la ventana.
- `renderer/styles.css` mantiene las reglas de visualización de sprites de arrastre tanto para `.dragging` como para `.native-dragging` en todas las mascotas (`#peruperro-drag`, `#schnauzer-drag`, `#cat-drag`, etc.).

### 5. Integridad de Recursos
- Cada vez que se modifique o agregue una pose, mascota o estilo visual, es mandatario ejecutar `npm run test:mascots` para asegurar que las 54 validaciones pasen al 100%.
