# Instalador manual y seis mascotas — 13 de octubre de 2026

La rama Linux incorpora el selector nativo para Catjang, Toto, Chisi, Milo,
Musubi y Chuño y un instalador gráfico independiente para Linux x64 con GNOME
Shell 50/Wayland. No se declara soporte de GNOME 46, KDE, Windows ni macOS para
este instalador. La revisión humana de las cinco mascotas nuevas queda pendiente.

## Implementación

La extensión v4 carga un catálogo de seis familias con la geometría de cabeza,
nombre y especie del registro original. Catjang conserva su atlas validado:
los 1.742 PNG previos siguen idénticos byte por byte. Las otras familias se
rasterizan desde sus ocho SVG canónicos, resolviendo colores, respiración,
parpadeo, cola, mirada, caricias, patas, rollo, salto y estiramiento. Las poses
suspendidas usan el péndulo completo de Electron; no reutilizan el cuerpo de
Catjang. Cada familia tiene máscaras alfa y de calor propias. El audio de
caricias usa ronroneo o jadeo según la especie. Los nombres individuales se
conservan al cambiar de mascota. La caza circular corresponde al SVG de Catjang.

Se retiraron exclusivamente las restricciones condicionadas al backend GNOME
que impedían elegir mascotas en `main.js`. Los cambios del adaptador permanecen
dentro de su rama Linux. Los 74 archivos compartidos protegidos (renderer,
preload, CSS y SVG) y las opciones de empaquetado win/mac permanecen intactos.
La sonda de aislamiento prueba ramas simuladas; no certifica runtimes nativos
de Windows/macOS.

Una carga inicial de texturas mostró que el retorno del acordeón podía evaluarse
con un reloj anterior a la carga. La comprobación ahora usa el tiempo actualizado
y evita cargar bandas si ya finalizó el retorno. Las sondas de entrada esperan
la entrega real de la liberación antes de comprobar el final del resorte.
El estiramiento de otras familias conserva la conexión mediante su overlay
propio, sin intentar seleccionar un cuadro ordinario inexistente.

## Instalador

Archivo: `dist/linux-manual/Catjang-0.1.40-experimental.1-GNOME4-linux-x64.run`,
con checksum y `LEEME.txt`. Contiene Electron 43.1.0 / Node 24.18.0, la aplicación,
recursos y extensión. Verifica el SHA-256 del paquete antes de extraerlo. Instala
para el usuario en `~/.local/opt/catjang-gnome`, sin sudo; registra **Catjang** y
**Catjang Laboratorio** en el menú de aplicaciones y instala/habilita la extensión.
No acepta una carpeta de destino ajena. Revisiones separadas y un enlace `current`
permiten actualizar sin reemplazar perfiles. El asistente pide al usuario que
cierre y vuelva a iniciar sesión; no reinicia GNOME por su cuenta.

Catjang usa la licencia y perfil habituales. Laboratorio usa el endpoint real
existente para activar la clave pública demo en un perfil independiente, con
agentes desactivados. No hay cambios del validador ni bypass de licencia. El
acceso comprueba que GNOME haya cargado la extensión v4 antes de arrancar.
Se incluye la licencia CC BY-NC 4.0 y atribución.

## Verificación

Ubuntu 26.04, GNOME/Mutter 50.1, Wayland, Electron 43.1.0 / Node 24.18.0.
Los tests clásicos de Linux no se usan como evidencia del backend nuevo.

| Sonda | Observaciones | Evidencia en `.tmp/gnome-prototype/` |
| --- | ---: | --- |
| Seis mascotas, caricias/audio, poses, calor y selección | 95 | `mascots/mascot-observations.json` |
| Aplicación, directorio empaquetado y acceso instalado Laboratorio | 15 | `integration/application-observations.json` |
| Monitores, escala, recuperación y transparencia | 47 | `matrix/matrix-observations.json` |
| Acordeón, teclas, calor y transparencia | 16 | `refine/refined-observations.json` |
| Lector pasivo con teclado del kernel propio | 10 | `refine/keyboard-kernel.json` |
| Menú, pomodoro, recordatorios y audio | 27 | `features/features-observations.json` |
| Caza circular y prioridades | 13 | `hunting/hunting-observations.json` |

223 observaciones, más aislamiento win32/darwin/linux y `scripts/test-mascot.js`.
Las sondas de mascotas usan formularios y entrada Clutter real, prueban
seguimiento y caricias de cada cabeza, audio decodificado de la especie,
alternancia de patas, calor por pulsaciones acumuladas, arrastre/retorno,
rollo, salto y overlay translúcido. Verifican seis siluetas distintas, fuentes
canónicas, nombres individuales y selección de Chuño desde el menú nativo.

El instalador se ejecutó en un destino temporal con espacios en su ruta y
accesos XDG aislados; se repitió para comprobar idempotencia y actualización.
Los accesos pasaron `desktop-file-validate`. Se rechazaron un paquete alterado
sin crear el destino y una carpeta ajena sin cambiar su archivo testigo.
El acceso Laboratorio instalado arrancó en el compositor privado y su ventana
se asoció al PID propietario del helper. El perfil demo y la licencia se crearon
únicamente en el runtime privado.

El bus aislado no activa servicios automáticamente. La integración del acceso
instalado inicia explícitamente el servicio oficial de extensiones justo antes
de invocar su CLI: GNOME lo cierra después de dos segundos de inactividad. Esto
reproduce el acceso del escritorio habitual sin activar otros servicios externos.
Los logs y pruebas del instalador están en `.tmp/gnome-installer/`.

La instalación manual y aceptación humana en el escritorio habitual corresponden
al usuario. El asistente quedó abierto para ese fin. Debe cerrar y volver a
iniciar sesión y abrir **Catjang Laboratorio**, seleccionar las seis mascotas
y comprobar arrastre/soltar, ojos, caricias/audio, teclas, calor y estiramiento.
Grabación, edición de patrones y soporte de otros escritorios siguen pendientes.
