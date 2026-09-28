# Memoria: Patrones del Sistema y Arquitectura (System Patterns)

## 1. Arquitectura General de Procesos (Electron)

Catjang sigue el modelo multiproceso estándar de Electron:

```text
[ Proceso Principal (main.js) ]
  ├── Gestión de Ventanas (BrowserWindow: mascota, licencia, editor, agents-setup)
  ├── Almacenamiento y configuración (settings.json en appData o runtime/)
  ├── Menú Contextual nativo e Internacionalización (ES, EN, KO, JA)
  ├── Monitor de Entrada Global (uiohook-napi opcional)
  ├── Servidor de Hooks / Integración con Agentes de IA
  └── Comunicación IPC bidireccional
        │
        ├── [ Preload (preload.js) ] -> Puente seguro contextBridge
        │
        ├── [ Ventana Principal (renderer/) ]
        │     ├── index.html (DOM con objetos SVG universales)
        │     ├── styles.css (Control CSS de poses y visibilidad)
        │     ├── renderer.js (Lógica de animación, mirada, caricias, calor)
        │     └── mascots.js (Registro canónico MASCOTS)
        │
        ├── [ Ventana Licencia / Onboarding (license/) ]
        ├── [ Ventana Editor de Patrones (editor/) ]
        └── [ Ventana Conexión de Agentes (agents-setup/) ]
```

---

## 2. Arquitectura Canónica de Mascotas (Matriz de 8 Poses)

Todas las mascotas deben implementar de manera uniforme la matriz de **8 archivos SVG idénticos** dentro de su directorio `svg/<id>/`:

| Archivo SVG | Clave en `MASCOTS` | Rol Semántico CSS | Comportamiento en Pantalla |
| :--- | :--- | :--- | :--- |
| `idle.svg` | `idle` | `.mascot-idle` | Reposo, respiración, pupilas que siguen al ratón (`#pupil-left`, `#pupil-right`), parpadeo y lengüita. |
| `press-left.svg` | `pressLeft` | `.mascot-press-left` | Patita izquierda tecleando en teclado izquierdo. |
| `press-right.svg` | `pressRight` | `.mascot-press-right` | Patita derecha tecleando en teclado derecho. |
| `scroll.svg` | `scroll` | `.mascot-scroll` | Desenrollado de papel con patas alternadas y líneas de velocidad. |
| `jump-start.svg` | `jumpStart` | `.mascot-jump-start` | Agazapado preparatorio para el salto. |
| `jump-ing.svg` | `jumpIng` | `.mascot-jump-ing` | Salto en el aire con patas extendidas y celebración. |
| `drag.svg` | `drag` | `.mascot-drag` | Suspensión en el aire al ser arrastrado por el ratón. |
| `stretch.svg` | `stretch` | `.mascot-stretch` | Postura de estiramiento arqueado de descanso. |

### Regla Técnica Crítica de Renderizado SVG
```xml
<!-- PROHIBIDO: filter: drop-shadow(...) en CSS (causa recuadro negro en Windows) -->
<!-- OBLIGATORIO: Usar el filtro SVG <feMorphology> con flood blanco: -->
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
```

### Reglas de Declaración DOM y CSS
- **NUNCA añadir `style="display:none;"` inline** a las etiquetas `<object>` en `renderer/index.html`. Toda la visibilidad se gobierna mediante la clase universal `.mascot-sprite` y los selectores `body[data-mascot="..."]` en `renderer/styles.css`.
- Para agregar una nueva mascota, se debe registrar en:
  1. `renderer/mascots.js` (Definición del objeto en `MASCOTS`)
  2. `renderer/index.html` (Las 8 etiquetas `<object>` con clase `mascot-sprite`)
  3. `renderer/styles.css` (Reglas de aislamiento y activación por estado)
  4. `main.js` (`mascotNames`, validación en `setMascot`, fallback de nombres, menú contextual e i18n)
  5. `license/license.js` y `license/index.html` (Opciones del carrusel de onboarding)

---

## 3. Arquitectura de Integración con Agentes de IA

Catjang actúa como monitor de estado físico para los agentes de desarrollo que operan en la máquina:

```text
[ Agente de IA ]                [ Catjang Server / Hook ]             [ Renderer Visual ]
─────────────────              ─────────────────────────             ───────────────────
Claude / Antigravity / Cursor  ───> hooks/catjang-*-hook.js
                                        │
Codex / Kiro Logs              ───> agents/*-log-monitor.js
                                        │
                                        ▼ (HTTP POST / IPC)
                                   main.js
                                        │
                                        ▼ (webContents.send)
                                   renderer.js
                                        │
                                        ├── Thinking: Puntos animados (. . .)
                                        ├── Working: Tecleo y vapor de calor
                                        ├── Permission Required: Signo de exclamación (!)
                                        └── Completed: Salto alegre + sonido + bocadillo con tema
```

### Agentes Soportados:
1. **Google Antigravity / Gemini:** Hook script en `hooks/catjang-antigravity-hook.js` integrado en `~/.gemini/config/hooks.json`. Reacciona a eventos de ciclo de vida (`PreInvocation`, `PostInvocation`).
2. **Claude Code:** Hook script en `hooks/catjang-claude-hook.js` integrado en `~/.claude/settings.json`.
3. **OpenAI Codex:** Monitor continuo de logs locales en `~/.codex/sessions` (`agents/codex-log-monitor.js`).
4. **Cursor:** Monitor de logs y hook en `agents/cursor-log-monitor.js`.
5. **Kiro:** Monitor de sesiones en `agents/kiro-log-monitor.js`.
