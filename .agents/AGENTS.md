# Catjang - Memoria de Desarrollo y Guía para Agentes de IA

Bienvenido a **Catjang** (fork comunitario por `@ModLovelace`). Este archivo es el punto de entrada principal para que cualquier agente de IA o desarrollador comprenda instantáneamente la arquitectura, las reglas críticas y el estado del proyecto.

---

## 🧭 Índice de la Memoria de Desarrollo (`.agents/memory/`)

La memoria de desarrollo viva del proyecto se encuentra estructurada en:

1. [**`projectbrief.md`**](./memory/projectbrief.md): Fundación, autoría original, propósito del fork, licencias (`CC BY-NC 4.0`) y modelo de ramas.
2. [**`productContext.md`**](./memory/productContext.md): Funcionalidades de usuario, las 6 mascotas actuales, sistema de interacción (caricias con delay, arrastre, pomodoro, recordatorios).
3. [**`systemPatterns.md`**](./memory/systemPatterns.md): Arquitectura Electron, arquitectura canónica de mascotas (8 animaciones SVG), reglas visuales críticas y patrón de hooks para agentes de IA.
4. [**`techContext.md`**](./memory/techContext.md): Stack técnico (Node 24.18.0 x64, Electron 43, `uiohook-napi`, `ffmpeg-static`), scripts de ejecución y suite de pruebas automatizadas.
5. [**`activeContext.md`**](./memory/activeContext.md): Estado actual en la rama activa (`connect-ia-agent`), últimos cambios (Chuño perro peruano, onboarding, audio dinámico) y focos de trabajo.
6. [**`progress.md`**](./memory/progress.md): Historial de versiones (v0.1.39), hitos alcanzados, problemas resueltos y roadmap pendiente.
7. [**`docs/TESTING_AND_QA_GUIDE.md`**](../docs/TESTING_AND_QA_GUIDE.md): Guía metódica de pruebas paso a paso, control del objeto y protocolo "si falla: pausar y corregir".

---

## ⚠️ Reglas Críticas Innegociables del Proyecto

Antes de realizar cualquier modificación en el código, respeta estrictamente estas reglas:

### 1. Ventanas transparentes en Windows y filtros SVG
> **PELIGRO:** **NUNCA** utilices `filter: drop-shadow(...)` de CSS en elementos de la mascota.
> En ventanas transparentes de Electron (`transparent: true`) bajo Chromium en Windows, `drop-shadow` de CSS se evalúa como un **recuadro negro opaco**.
> **Solución obligatoria:** Utilizar siempre el filtro SVG `<feMorphology>` de Catjang con dilatación y flood blanco `#FFFFFF`. Ver [`systemPatterns.md`](./memory/systemPatterns.md).

### 2. Estándar de 8 Animaciones Canónicas por Mascota
> Cada mascota agregada debe tener exactamente 8 archivos SVG en `svg/<mascot>/`:
> `idle.svg`, `press-left.svg`, `press-right.svg`, `scroll.svg`, `jump-start.svg`, `jump-ing.svg`, `drag.svg`, `stretch.svg`.
> Cada mascota debe registrarse en `renderer/mascots.js`, `renderer/index.html`, `renderer/styles.css`, `main.js` y `license/license.js`.
> Consultar siempre [`docs/HOW_TO_ADD_A_MASCOT.md`](../docs/HOW_TO_ADD_A_MASCOT.md).

### 2.1 Nombre canónico del perro peruano
> La mascota con ID técnico `peruperro` se llama **Chuño**. No debe presentarse como “Inca” en la interfaz ni en la documentación vigente. El nombre “Inca” solo se conserva cuando sea necesario describir la migración de configuraciones antiguas a “Chuño”.

### 3. Política de Node.js y Entorno
> El proyecto requiere **Node.js 24.18.0 x64** mediante NVM for Windows (`nvm use 24.18.0`).
> No actualizar arbitrariamente dependencias base ni el motor de Node.

### 4. Dependencia Opcional `uiohook-napi`
> `uiohook-napi` (hook global de teclado y ratón) **DEBE** permanecer como `optionalDependency`.
> No forzar su recompilación en `postinstall` para garantizar que el proyecto compile y ejecute en sistemas sin encabezados nativos X11 o en plataformas restringidas.

### 5. Seguridad de Agentes y Privacidad
> La integración con agentes de IA (escritura de hooks en `~/.gemini/config/hooks.json`, `~/.claude/settings.json`, lectura de logs en `~/.codex/sessions`) debe ser **opt-in** con consentimiento explícito del usuario a través del onboarding o menú de configuración.

### 6. Suite de Pruebas de Regresión
> Antes de dar por finalizada una tarea en mascotas o animaciones, ejecuta:
> ```bash
> node scripts/test-mascot.js
> ```
> Debe pasar con código de salida 0.
