# Conexión automática de agentes en Ubuntu

## Comportamiento

Catjang conserva la autorización por perfil y sincroniza los hooks al arrancar.
El perfil GNOME puede limitar los conectores mediante `linuxAgentTargets`.
La selección local es Antigravity, Codex y Claude Code; no se crean hooks de
Cursor ni se inicia su monitor o el de Kiro. Las instalaciones nuevas siguen
requiriendo autorización; un perfil desactivado permanece desactivado.

El panel Ubuntu distingue la conexión desactivada, hooks pendientes, hooks
deshabilitados y monitores activos. Comprueba todos los handlers esperados y la
presencia de los scripts de este perfil. No identifica un IDE como instalado o
conectado por la mera existencia de su archivo de ajustes. La presentación y las
rutas de Windows/macOS conservan el comportamiento anterior mediante guardas GNOME.

## Evidencia

- `scripts/test-linux-agent-status.js`: 2 pruebas sobre falsos positivos,
  configuración inválida, scripts ausentes, hooks deshabilitados y conservación
  del arranque simulado de Windows/macOS.
- `native/gnome/run-nested.sh --autoconnect`: 17 comprobaciones en GNOME/Wayland
  y HOME privados. Arranque sin pulsar Sincronizar, configuración de los tres
  conectores, preservación de otros hooks y permisos de Claude, tareas a través
  de los scripts reales, lectura de una sesión sintética por el parser de Codex,
  reparación de un handler eliminado y ausencia de duplicados al reiniciar.
- La misma sonda vuelve a arrancar con el perfil desactivado: servidor y monitor
  permanecen detenidos y el panel muestra «Desactivado».
- La ejecución de scripts de hooks es asíncrona para permitir que el servidor
  HTTP real responda mientras la prueba espera al proceso del hook.
- `scripts/test-mascot.js`: código 0. Sintaxis y `git diff --check`: correctos.
- Proceso principal, panel y helper de estado empaquetados: comparación byte a
  byte con el código probado.

## Instalación local

Revisión `0.1.40-experimental.1-gnome5-1471ffe98a6f`, instalada sin cerrar Ubuntu
ni reiniciar los IDEs. Se respaldaron la instalación, los ajustes y cualquier
configuración previa antes de habilitar la selección autorizada. Los demás
ajustes de la mascota se conservaron y la configuración de Cursor no cambió.

El arranque registró 11 handlers de Claude Code y 4 de Antigravity, abrió el
servidor en `127.0.0.1:23456` y conectó la mascota con la extensión v4 aún cargada
en la sesión. La comprobación HTTP de solo lectura confirmó que el servidor
responde. El cambio de conexión no requiere recargar GNOME.

Las pruebas de tareas usan datos sintéticos con los hooks y parsers reales.
Todavía no se ha ejecutado una tarea dentro de cada IDE personal para validar
la recepción desde sus propias interfaces.

Las rutas y eventos siguen la documentación oficial de
[Antigravity](https://www.antigravity.google/docs/hooks) y
[Claude Code](https://code.claude.com/docs/en/hooks). El consentimiento y su
persistencia no alteran las políticas de ejecución de comandos de los IDEs.
