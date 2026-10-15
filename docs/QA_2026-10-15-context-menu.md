# Menú contextual GNOME: revisión del 15 de octubre de 2026

## Hallazgo y corrección

La sesión habitual conserva cargada la extensión v4, aunque v5 está instalada
en disco. La mascota seleccionada al revisar era Chisi. El menú v4 muestra
«Estirarse ahora» para todas las mascotas, mientras que el puente actual reserva
el estiramiento especial a Catjang, según el alcance acordado. El puente
descartaba esa selección sin dar una explicación.

Se reprodujo el fallo con el ZIP original v4 en un GNOME/Wayland privado. Al
seleccionar esa opción para una mascota no compatible, el puente ahora abre la
configuración y explica que hay que seleccionar Catjang. No cambia la mascota
automáticamente. En v5 la opción solo aparece para Catjang. El mensaje de
actualización también explica la diferencia mientras permanece cargado v4.

El estiramiento de Catjang sí funciona desde el menú en ambas versiones: ocupa
el centro de la pantalla, es semitransparente y no intercepta el puntero; al
terminar restaura la mascota. No fue necesario cambiar su animación.

## Recorrido realizado

La sonda nueva `native/gnome/probes/context.js` usa el `main.js`, preload,
puente Python y D-Bus reales. Abre el menú con clic secundario y selecciona
filas y submenús mediante eventos de un puntero virtual de Clutter. No llama
directamente a los callbacks de las opciones.

| Opciones | Comprobaciones |
| --- | --- |
| Estirarse ahora | Actor grande visible, transparencia intermedia, click-through, retorno y aviso para mascotas no compatibles con v4 |
| Saltar | Pose de salto después de seleccionar la opción |
| Configuración / Recordatorios / Duración y estado | Ventana visible y panel correspondiente |
| Pomodoro | Inicio, pausa, continuación y reinicio del temporizador real |
| Tamaño | Disminuir/aumentar, persistencia, formulario actualizado y límites de 40/400 |
| Nombre | Ocultar/mostrar, etiqueta, persistencia y casilla de configuración |
| Agentes de IA | Apertura de su ventana, sin habilitar integraciones ni instalar hooks |
| Mascotas | Selección y persistencia de las seis, disponibilidad del estiramiento y cierre con Escape |
| Salir | Cierre de la aplicación, liberación del propietario y de las capturas de puntero |

La prueba v4 original falló al exigir una explicación después de seleccionar
«Estirarse» en Toto. La revisión corregida completó 151 comprobaciones con v4.
La revisión con v5 completó otras 131: 282 comprobaciones en total. Las
evidencias se guardan en `.tmp/mascot-parity/context-*`. El puente, preferencias,
helper y catálogo del paquete Linux se compararon byte a byte con el código fuente.

También pasó `scripts/test-mascot.js` con código 0 y las comprobaciones de sintaxis
JavaScript, shell y `git diff --check`. Los cambios de producto solo afectan a
`native/gnome/bridge.js` y `native/gnome/preferences.js`; Windows/macOS y los SVG
no cambian.

## Límite de la validación

Las pruebas automatizadas se ejecutaron en GNOME/Wayland aislado con perfiles y
HOME temporales. No se cerró la sesión de Ubuntu, no se modificaron los IDEs del
usuario y no se forzó la recarga del Shell. El menú v5 se cargará en la sesión
habitual en el próximo inicio de sesión; el aviso del puente funciona también
con v4.

La corrección quedó instalada en la revisión
`0.1.40-experimental.1-gnome5-c4f8544374b8` y Catjang Laboratorio se volvió a abrir:
su log confirmó la conexión con la extensión v4 de la sesión habitual. Los
ajustes y la identidad de licencia se conservaron; únicamente se actualizó la
fecha normal de validación de la licencia al arrancar. El instalador actualizado
tiene SHA-256 `e9aa916eada7b226618b3eaef951c200b725749b4d886047d662cd249f25167b`.
