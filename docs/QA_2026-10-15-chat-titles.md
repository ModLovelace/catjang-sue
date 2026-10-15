# Plataforma y título de chat en las notificaciones

La notificación GNOME de finalización identifica la plataforma y el título del
chat: `Codex · «Corregir autenticación» — tarea completada.` La tarea particular
puede aparecer debajo. El título se prioriza sobre ese detalle y sobre mensajes
genéricos recibidos del agente. El bocadillo y la notificación reciben el mismo
texto, acotado al límite D-Bus de 512 caracteres.
Los detalles personalizados del agente se conservan debajo cuando no hay una
tarea específica; no pueden reemplazar la identificación de plataforma y chat.

## Resolución de títulos

- Codex: `threads.name`, que corresponde al nombre visible/renombrado del chat
  de escritorio; después el último `thread_name` del índice y el título guardado
  de versiones anteriores. Se evita presentar el prompt original cuando existe
  un nombre visible. El esquema local se verificó en modo de lectura.
- Antigravity: título de la fila correspondiente al ID en
  `conversation_summaries`, con alternativa al título explícito del hook.
- Claude Code: último registro `custom-title` de la sesión en su transcript,
  limitado al árbol de proyectos configurado; conserva la ruta y el título si
  el evento Stop no los repite.
- El contexto se asocia a plataforma e ID, con caché acotada, y se vuelve a
  consultar al finalizar para reflejar renombres. Si no existe un título
  disponible, se identifica como «Chat sin título» con un ID corto; no se inventa
  un título a partir del directorio de trabajo.

Las consultas SQLite son de solo lectura y las lecturas JSONL usan ventanas
acotadas. Estos formatos internos pueden cambiar; los errores de lectura no
deben cerrar la mascota. No se agregaron dependencias externas: se usa SQLite
incluido en Node 24.18.0/Electron 43.1.0.

## Pruebas

`scripts/test-linux-chat-titles.js`: 8 pruebas sobre nombre visible de Codex,
renombres, dos chats en una misma carpeta, índice de CLI, metadatos de
Antigravity, título de Claude, rutas/symlinks rechazados, datos ausentes o
inválidos, caracteres Unicode, límites de texto y contrato de Windows/macOS.
La consulta del título no cambia los bytes de la base SQLite de prueba.

`native/gnome/run-nested.sh --titles`: 9 comprobaciones con HOME y GNOME privados.
Usa scripts reales de hooks, parser real de logs, SQLite/transcripts de prueba,
IPC y D-Bus reales. Comprueba Antigravity, Claude y dos chats de Codex con el
mismo prompt inicial y carpeta. Observa el contenido que llega al método Notify,
además del bocadillo y las alertas de preferencias. Capturas en
`.tmp/gnome-prototype/titles/` y evidencia preservada en
`.tmp/mascot-parity/chat-titles/`.

El primer recorrido detectó el puerto del Catjang de escritorio todavía ocupado
y se detuvo. Se cerró el proceso verificado y se añadió una comprobación de
propiedad del servidor antes de enviar hooks de prueba. También se aíslan
CODEX_HOME y CLAUDE_CONFIG_DIR para no heredar ubicaciones personales.

Las pruebas de estado de agentes y `scripts/test-mascot.js` pasaron. La revisión
clásica de conversaciones verifica que sus textos anteriores no cambien. Los
eventos de la sonda son sintéticos; no se crean tareas en los IDEs personales.

La revisión local final `0.1.40-experimental.1-gnome5-747469071728` quedó instalada
y abierta. Conserva los ajustes y la conexión automática autorizada. Los scripts
locales de Antigravity y Claude se actualizaron y los seis archivos de producción
revisados coinciden con el código probado. Se verificó con los archivos instalados
que el resolver devuelve el nombre visible del chat actual de Codex. La mejora
del texto de notificación funciona también con la extensión v4 cargada; no necesita
cerrar la sesión de Ubuntu.
