# Memoria: Progreso y Hoja de Ruta (Progress & Roadmap)

## 1. Hitos Alcanzados

- [x] **Fork Comunitario Estable:** Separación de responsabilidades con el modelo de ramas (`community/base`, `community/windows`, `community/linux-wayland`, `connect-ia-agent`).
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
- [x] **Siesta y Agentes (2026-09-10):** Cierre de ojos y despertar de las seis mascotas, avisos de agentes durante la siesta y regresión IPC aprobados. CPU total medida entre 0.500% y 0.953% en el equipo de prueba (monitores de logs desactivados); detalles y limitación visual en `docs/QA_2026-09-10.md`.
- [x] **Sonidos Específicos:** Jadeo y ladridos para perros, ronroneo y maullido para gatos.
- [x] **Soporte macOS Apple Silicon:** Compilación arm64 para M1/M2/M3/M4 e Intel en GitHub Actions.
- [x] **Versión Actual:** v0.1.39 lanzada públicamente.

---

## 2. Hoja de Ruta y Próximos Pasos (Roadmap)

### A. Corto Plazo
- [ ] Incorporar más animaciones contextuales ante errores de ejecución de herramientas de agentes (p. ej. expresión de sorpresa o alerta).
- [ ] Evaluar atajos de teclado globales para alternar rápidamente entre mascotas.
- [ ] Optimizar el visor de logs de agentes para reducir el consumo de disco y memoria.

### B. Mediano Plazo
- [ ] Adaptación para pantallas de alta densidad DPI (125%, 150%, 200%) en configuraciones multimonitor de Windows.
- [ ] Empaquetado firmado de código si se obtiene certificación pública.
- [ ] Documentación en video interactivo de la suite de mascotas para la comunidad.

### C. Largo Plazo / Exploratorio
- [ ] Explorar versión móvil independiente para iPadOS / Android (evaluar viabilidad fuera de Electron).
- [ ] Compatibilidad ampliada con más agentes emergentes del ecosistema LLM local (Ollama, vLLM, OpenDevin).
