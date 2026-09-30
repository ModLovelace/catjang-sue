# Memoria: Progreso y Hoja de Ruta (Progress & Roadmap)

## 1. Hitos Alcanzados

- [x] **Fork Comunitario Estable:** Separación de responsabilidades con el modelo de ramas (`community/base`, `community/windows`, `community/linux-wayland`, `connect-ia-agent`, `feature/linux-adaptation`).
- [x] **Línea Base en Windows:** Compatibilidad con Windows 10/11 x64, empaquetado NSIS y política estricta de Node.js 24.18.0.
- [x] **Solución a Recuadros Negros SVG:** Estandarización del filtro `<feMorphology>` de Catjang en lugar de `drop-shadow` CSS para ventanas transparentes de Chromium.
- [x] **6 Mascotas Completas:**
  - Catjang (Gato original)
  - Toto (Schnauzer rediseñado)
  - Chisi (Caniche Toy)
  - Milo (Mestizo con collar de cadena)
  - Musubi (Gato atigrado)
  - Chuño (Perro Peruano calado gris; ID técnico `peruperro`)
- [x] **Estandarización de Chuño:** Nombre por defecto "Chuño", migración automática desde "Inca", teclados 3D alternados de 4px, silueta roja progresiva por calor y balanceo dinámico de arrastre.
- [x] **Guía Metódica de Pruebas y Control del Objeto:** Protocolo de QA paso a paso con principio "si falla: pausar y corregir" en `docs/TESTING_AND_QA_GUIDE.md`.
- [x] **Integración con Agentes de IA:**
  - Google Antigravity / Gemini CLI (`PreInvocation` / `PostInvocation`).
  - Claude Code (`~/.claude/settings.json`).
  - OpenAI Codex (lector de sesiones en `~/.codex/sessions`).
  - Cursor y Kiro (monitoreo de logs).
- [x] **Menú de Onboarding Inicial:** Asistente de configuración de mascota y agentes tras activar la licencia.
- [x] **Caricias Deliberadas:** Detección de frotamiento de ~1.4s para evitar activación accidental por hover.
- [x] **Siesta y Agentes:** Cierre de ojos y despertar de las seis mascotas, avisos de agentes durante la siesta y regresión IPC aprobados.
- [x] **Sonidos Específicos:** Jadeo y ladridos para perros, ronroneo y maullido para gatos.
- [x] **Soporte macOS Apple Silicon:** Compilación arm64 para M1/M2/M3/M4 e Intel en GitHub Actions.
- [x] **Preview Multiplataforma:** `v0.1.40-experimental.1` publicada como pre-release.
- [x] **Adaptación Integral para Linux en Ubuntu Wayland (`feature/linux-adaptation`):**
  - **Arquitectura Opción 1:** XWayland + `setShape()` + Electron preservando física continua de resortes y oscilación pendular.
  - **Seguimiento ocular global (Eyes Tracking):** Tracker DBus en segundo plano (`scripts/linux-cursor-tracker.py`) conectado a GNOME Shell (`KandoIntegration`), permitiendo que las pupilas sigan el mouse sobre cualquier app o escritorio.
  - **Arrastre elástico sin recortes:** Desbloqueo temporal de máscara (`setWindowShape([])`) al arrastrar para desplegar el acordeón completo de 16 segmentos (385px) y restauración automática de la máscara compacta al soltar.
  - **Pointer Capture:** `setPointerCapture` en `#drag-handle` para movimientos fluidos sin pérdida de foco.
  - **Estiramiento periódico (Break Stretch):** Overlay fullscreen transparente independiente adaptado a monitores UltraWide.
  - **Validación 54/54:** Suite completa aprobada (`npm run test:mascots`, smoke test, stretch test y DBus test).

---

## 2. Hoja de Ruta y Próximos Pasos (Roadmap)

### A. Corto Plazo
- [ ] Validación humana final del comportamiento en Ubuntu ejecutando `./run-linux.sh`.
- [ ] Tras la aprobación explícita del usuario humano, preparar PR o merge limpio de `feature/linux-adaptation` hacia `main`.
- [ ] Incorporar más animaciones contextuales ante errores de ejecución de herramientas de agentes.
- [ ] Evaluar atajos de teclado globales para alternar rápidamente entre mascotas.

### B. Mediano Plazo
- [ ] Adaptación para pantallas de alta densidad DPI (125%, 150%, 200%) en configuraciones multimonitor de Windows.
- [ ] Empaquetado firmado de código si se obtiene certificación pública.
- [ ] Documentación en video interactivo de la suite de mascotas para la comunidad.

### C. Largo Plazo / Exploratorio
- [ ] Explorar versión móvil independiente para iPadOS / Android.
- [ ] Compatibilidad ampliada con más agentes emergentes del ecosistema LLM local (Ollama, vLLM, OpenDevin).
