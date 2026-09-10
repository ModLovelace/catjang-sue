# Memoria: Contexto Activo y Trabajo en Curso (Active Context)

## 1. Rama Activa
- **Rama Actual:** `connect-ia-agent`
- **Estado de Git:** Cambios probados y verificados con suite automatizada completa (código de salida 0).

---

## 2. Desarrollos y Cambios Recientes (Últimos Commits)

### A. Perfeccionamiento y Estandarización de "Chuño" (Perro Peruano Calado)
1. **Renombrado por Defecto a "Chuño":**
   - Reemplazo canónico de "Inca" por "Chuño" en `main.js`, `renderer/mascots.js`, `license/index.html` y configuraciones locales.
   - Migración automática transparente en `loadSettings()`: usuarios con instalaciones previas que tenían `catName: "Inca"` o `mascotNames.peruperro: "Inca"` migran automáticamente a `"Chuño"`.
   - Cadenas I18N actualizadas en los 4 idiomas: Español (`Perro Peruano Calado (Chuño) 🐕`), Inglés (`Peruvian Hairless (Chuño) 🐕`), Coreano (`페루 무모견 (추뇨) 🐕`) y Japonés (`ペルーヘアレス (Chuño) 🐕`).

2. **Mecánicas y Animación de Arrastre Dinámico:**
   - En `svg/peruperro/drag.svg`: incorporación de balanceo oscilatorio con físicas colgantes visibles (cuerpo completo $\pm 5^\circ$ desde el pellejo de la nuca `.dangle-body`, patas delanteras $\pm 16^\circ$, patas traseras $\pm 14^\circ$, cola $\pm 22^\circ$).
   - En `renderer/renderer.js`: ampliación de `isCatHitPoint` para cubrir toda la silueta normalizada (`nx: 0.15~0.85, ny: 0.08~0.92`) facilitando el agarre en cualquier punto.
   - Blindaje de arrastre contra interrupciones de borde: el evento `mouseleave` no cancela el arrastre si el ratón sigue presionado (`!(e.buttons & 1)`).

3. **Hundimiento 3D de Teclas al Teclear:**
   - En `svg/peruperro/press-left.svg`: teclado izquierdo abajo (`y=33`) con sombra frontal (`#605E5E`), sombra 3D (`#222222`) y brillos (`#D9D9D9`); teclado derecho levantado (`y=29`).
   - En `svg/peruperro/press-right.svg`: teclado derecho abajo (`y=33`) con sombra frontal, sombra 3D y brillos; teclado izquierdo levantado (`y=29`).
   - Alternancia rítmica idéntica al gato con 4 píxeles de depresión visual por pulsación.

4. **Enrojecimiento Progresivo por Calor (Typing Heat):**
   - Soporte de `data-heat-overlay="true"` en los grupos anatómicos de Chuño (torso, patas, cola, cabeza).
   - En `renderer/renderer.js`: `installHeatOverlays` ahora busca `#dog-content` además de `#cat-content`, clonando los elementos hacia `.legacy-heat-overlay` en sincronía con `--legacy-heat-overlay-opacity`.
   - Curva y tiempos idénticos al gato original (`KEY_WINDOW_MS = 1500`, `KPS_MIN = 4`, `KPS_MAX = 14`, `HEAT_CURVE = 1.5`), con partículas de vapor animadas (`#heat-steam`) al superar 0.5 de calor.

### B. Guía Metódica de Pruebas y Control del Objeto para Agentes (`docs/TESTING_AND_QA_GUIDE.md`)
- Se redactó una guía completa paso a paso para que cualquier agente de IA o tester controle el objeto mascota en 8 fases operativas:
  1. Onboarding y configuración de agentes IA.
  2. Idle, aislamiento de sprites y prevención de recuadros negros en Windows.
  3. Arrastre por el pellejo, balanceo y retorno a reposo.
  4. Tecleo rítmico y hundimiento 3D de teclas.
  5. Velocidad (KPS), calentamiento y curva de enfriamiento suave.
  6. Caricias con delay (~1.4s) y gestos por especie (jadeo/lengua en perros vs ronroneo en gatos).
  7. Scroll y saltos de celebración.
  8. Integración con agentes de IA (Gemini, Claude, Codex, Cursor).
- Matriz de resolución de problemas con el principio obligatorio: **"Si no pasa: pausar y corregir"**.
- Suite automatizada `scripts/test-peruperro-heat-and-keys.js`.

---

## 3. Validación QA de las Seis Mascotas (2026-09-09)
- Suite ejecutada con Node.js `24.18.0` y Electron `43.1.0`:
  - `node scripts/test-mascot.js`: recursos, 8/8 SVG, DOM, CSS y nombres correctos para las 6 mascotas.
  - `npx electron scripts/test-all-mascots-complete.js`: 54/54 comprobaciones aprobadas para Catjang, Toto, Chisi, Milo, Musubi y Chuño.
  - `npx electron scripts/test-drag-and-ai-thinking.js`: arrastre, retorno a idle, caricia deliberada y estados de Gemini aprobados.
  - `npx electron scripts/test-initial-setup.js`: licencia, onboarding, seis tarjetas, selección, consentimiento e idioma aprobados.
  - `npx electron scripts/test-peruperro-heat-and-keys.js`: teclados 3D, balanceo, overlays de calor e hitbox de Chuño aprobados.
  - `npx electron scripts/test-mascot-switch.js`, `test-petting.js` y `test-petting-delay.js`: transiciones, audio por especie y umbral de 1.4 s aprobados.
- Integración viva verificada contra `127.0.0.1:23456`: los eventos `--start` y `--complete` respondieron `{ ok: true }`.
- Se corrigieron los comandos obsoletos de `notify-catjang.js` en la guía de QA y las etiquetas del test integral de “5/5” a “6/6”.
- La ventana transparente de Catjang no fue expuesta por la herramienta de accesibilidad de Windows; la apariencia visual sobre fondos reales queda pendiente de observación humana directa.
- Se cerraron y verificaron los procesos Electron residuales de las pruebas.

### Revalidación posterior a optimizaciones (2026-09-09)
- Entorno exacto: Node.js `24.18.0` x64 y Electron `43.1.0`.
- Sintaxis aprobada en los 9 archivos JavaScript modificados y auditoría sin usos de CSS `drop-shadow(...)` en `renderer`, `svg` ni `main.js`.
- Regresión repetida mascota por mascota y opción por opción: recursos 8/8, suite integral 54/54, arrastre y estados IA, onboarding, prueba específica de Chuño, cambio entre las 6 mascotas, 12 estados de caricias, intención de caricia y conversaciones de Gemini/Codex/Claude/Cursor; todos terminaron con código `0`.
- Se completaron los mocks IPC faltantes de `scripts/test-petting-delay.js` para que sus cuatro escenarios terminen limpios, sin errores de inicialización del renderer.
- El arranque smoke pasó tanto desde fuentes como desde `dist/win-unpacked/Catjang.exe`.
- `electron-builder --dir` generó correctamente el paquete optimizado. `app.asar` pesa 2,199,548 bytes, conserva los SVG de las 6 mascotas y los sonidos requeridos, e incluye FFmpeg como recurso externo en `resources/ffmpeg/ffmpeg.exe`.

---

## 4. Cierre de pendientes (2026-09-10)
- Node de la terminal corregido con `nvm use 24.18.0` (x64).
- Siesta corregida para las seis mascotas: ojos cerrados en el SVG activo, limpieza al despertar o cambiar de mascota y parpadeo limitado a la mascota visible.
- Los estados thinking/working, avisos y finalizaciones de agentes despiertan a la mascota y reinician su plazo de inactividad. No entra en siesta durante pensamiento activo, arrastre o caricias.
- `scripts/test-nap-and-agents.js`: aprobados los cuatro eventos de agente por IPC en las seis mascotas, cambio de mascota y retorno automático a siesta.
- `scripts/qa-desktop.js`: ventana y lógica principal reales con perfil temporal, hook global activo, monitores de logs desactivados. Las doce muestras de 15 segundos (reposo y siesta) estuvieron entre 0.500% y 0.953% de CPU total en este equipo de 28 procesadores lógicos. No es una garantía para otros equipos ni para monitores de agentes activos.
- Capturas del renderer inspeccionadas para las seis mascotas sobre composiciones claras/oscuras; esquinas transparentes verificadas. Sin CSS `drop-shadow`.
- **Único cierre visual pendiente:** observación del escritorio real. Computer Use falló por pipe nativo no disponible; `desktopCapturer` no expuso pantalla y Windows reportó error 170. No presentar las capturas del renderer como prueba del compositor de Windows.
- Resultados y alcance: `docs/QA_2026-09-10.md`. Artefactos locales: `.tmp/qa-desktop/`.
- Regresión completa aprobada (54/54 más arrastre, onboarding, Chuño, cambio de mascota, caricias, demora e integración de conversaciones). Paquete actualizado y verificado con `scripts/test-package.js`: fuentes actuales, 48 SVG, FFmpeg externo y arranque smoke desde fuentes/ejecutable, todo con código 0. `app.asar`: 2,199,581 bytes.

## 5. Publicación experimental multiplataforma (2026-09-10)
- Pre-release público: `v0.1.40-experimental.1` en
  `https://github.com/ModLovelace/catjang-sue/releases/tag/v0.1.40-experimental.1`.
- Tag de fuentes: `32667c577bcafc570e200dff576bb0ac1c6fa76a`.
- Artefactos verificados en GitHub: DMG/ZIP para macOS Apple Silicon arm64 e
  Intel x64, instalador NSIS para Windows x64 y archivos `SHA256SUMS` para
  ambas plataformas.
- Los paquetes son experimentales, sin firma ni notarización. Las instrucciones
  de apertura con Gatekeeper y SmartScreen están en
  `docs/EXPERIMENTAL_INSTALLATION.md` y en las notas del pre-release.
- Los workflows de etiqueta construyen, validan y adjuntan los paquetes. El
  error histórico del run `34497573208` pertenecía a `99ef3eb` y quedó
  corregido en `ba37cac`; los builds de publicación del tag finalizaron con
  éxito.
- PR de integración hacia `community/windows`: `#7`.
