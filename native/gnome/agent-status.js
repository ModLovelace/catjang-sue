"use strict";
const fs = require('node:fs');
const path = require('node:path');

// Report this profile's actual hooks, not the mere existence of an IDE's file.
function inspect({home, hookDir, enabled, targets, serverActive, codexActive, port, events}) {
  function read(relative) {
    try { return JSON.parse(fs.readFileSync(path.join(home, relative), 'utf8')); }
    catch { return {}; }
  }
  function configured(hooks, names, script) {
    const file = path.join(hookDir, script);
    if (!fs.existsSync(file)) return false;
    return names.every(event => {
      const entries = hooks?.[event];
      return Array.isArray(entries) && entries.some(entry =>
        [entry, ...(Array.isArray(entry?.hooks) ? entry.hooks : [])]
          .some(hook => typeof hook?.command === 'string' && hook.command.includes(`"${file}" ${event}`)));
    });
  }
  const antigravity = targets.includes('antigravity') ? read('.gemini/config/hooks.json').catjang : null;
  const claude = targets.includes('claude') ? read('.claude/settings.json') : {};
  const cursor = targets.includes('cursor') ? read('.cursor/hooks.json') : {};
  const antigravityInstalled = configured(antigravity, events.ANTIGRAVITY_HOOK_EVENTS, 'catjang-antigravity-hook.js');
  const claudeInstalled = configured(claude.hooks, events.CLAUDE_HOOK_EVENTS, 'catjang-claude-hook.js');
  const cursorInstalled = configured(cursor.hooks, events.CURSOR_HOOK_EVENTS, 'catjang-cursor-hook.js');
  const codexDetected = fs.existsSync(path.join(home, '.codex/sessions'));
  function state(id, ready, blocked = false) {
    if (!targets.includes(id)) return 'No seleccionado';
    if (!enabled) return 'Desactivado';
    if (blocked) return 'Hooks deshabilitados';
    if (!ready) return 'Pendiente de configurar';
    return serverActive ? 'Conectado' : 'Servidor no disponible';
  }
  return {nativeLinux: true, enabled, serverActive, port, targets, antigravityInstalled,
    claudeInstalled, cursorInstalled, codexDetected, codexActive,
    states: {
      antigravity: state('antigravity', antigravityInstalled, antigravity?.enabled === false),
      claude: state('claude', claudeInstalled, claude.disableAllHooks === true),
      cursor: state('cursor', cursorInstalled),
      codex: !targets.includes('codex') ? 'No seleccionado' : !enabled ? 'Desactivado'
        : !codexActive ? 'Monitor no disponible' : !codexDetected ? 'Esperando una sesión' : 'Monitoreo activo',
    }};
}
module.exports = {inspect};
