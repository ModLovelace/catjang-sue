# Módulos de Monitoreo de Agentes de IA (`agents/`)

Esta carpeta contiene los monitores de sesiones y logs locales para la integración de Catjang con diferentes agentes de IA:

- `codex-log-monitor.js`: Monitoreo en vivo de sesiones locales de OpenAI Codex en `~/.codex/sessions`.
- `cursor-log-monitor.js`: Monitoreo de eventos y sesiones de Cursor IDE.
- `kiro-log-monitor.js`: Lector de logs y sesiones de Kiro.

---

## 🧠 Memoria de Desarrollo del Proyecto

Si buscas las **memorias de desarrollo, arquitectura, decisiones y tareas en curso** de los agentes para este proyecto, consulta el directorio [`.agents/`](../.agents/):

- [`.agents/AGENTS.md`](../.agents/AGENTS.md) - Guía maestra y reglas innegociables.
- [`.agents/memory/`](../.agents/memory/) - Banco de memoria técnica completo:
  - `projectbrief.md`: Resumen, autoría y licencias.
  - `productContext.md`: Contexto del producto y las 6 mascotas.
  - `systemPatterns.md`: Arquitectura Electron y matriz de 8 SVGs.
  - `techContext.md`: Stack tecnológico y comandos.
  - `activeContext.md`: Estado actual en la rama activa (`connect-ia-agent`).
  - `progress.md`: Hitos alcanzados y hoja de ruta.
