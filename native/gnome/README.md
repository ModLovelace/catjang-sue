# Backend experimental para Ubuntu con GNOME 50

Backend Linux integrado con la aplicación Electron mediante un helper Python y
D-Bus. GNOME Shell dibuja las poses, anima el reposo y recibe entrada sobre la
silueta. Electron conserva la licencia, los ajustes y una ventana de preferencias.
El usuario aprobó Catjang en el escritorio habitual y su caza del cursor en el
visor. La extensión v4 añade las seis mascotas canónicas y un instalador manual;
la aceptación física de las cinco familias nuevas está pendiente.

El desarrollo y la aprobación física se realizaron en el worktree
`codex/ubuntu-gnome-prototype`, desde `1961458`. El backend se integró después en
el código de `feature/linux-adaptation`, conservando los cambios previos del
proyecto y sus guardas de Windows/macOS. La evidencia de esta integración está
en `docs/QA_2026-10-12-gnome-integration.md`; las sondas se repitieron desde
el checkout del proyecto.

## Estado de la prueba en el escritorio habitual

La última revisión física del visor fue aprobada por el usuario: «Funciona bien».
El 12 de octubre de 2026 se instaló la extensión en la sesión habitual de GNOME
50.1/Wayland. No existía antes; los 1.377 archivos instalados coinciden con el ZIP
validado y la lista de extensiones activas quedó intacta. El visor, su aplicación
y su lector de teclado se cerraron sin procesos residuales.

Tras reiniciar la sesión, el usuario confirmó el funcionamiento local:
«Listo, funciona genial». La aplicación usa el perfil demo independiente de
`.tmp/gnome-prototype/desktop-trial/runtime/`, sin cambiar la licencia normal ni
activar integraciones de agentes.

El 13 de octubre se verificó y aprobó físicamente la caza del cursor en el visor.
La extensión **v3** incorporó menú contextual, pomodoro, recordatorios,
mensaje fijo y preferencias de los temporizadores compartidos. Actualizar el ZIP
no recarga módulos de una extensión que GNOME ya tiene activa: cerrar y volver
a iniciar sesión es necesario para cargar este código en el escritorio habitual.
Después ejecutar:

```bash
bash native/gnome/run-desktop-trial.sh
```

Cerrar preferencias conserva la mascota; Salir retira la mascota y su lector.
Los resultados y límites de la actualización están en
`docs/QA_2026-10-13-gnome-controls.md`.

Para retirar exclusivamente la extensión de esta prueba, salir primero de Catjang:

```bash
gnome-extensions disable catjang-native@modlovelace.github.io
gnome-extensions uninstall catjang-native@modlovelace.github.io
```

El estado previo y el resultado de instalación están en
`.tmp/gnome-prototype/desktop-before.json` y `desktop-status.json`.

## Alcance actual

- Catjang con cuadros de 200 × 200 píxeles lógicos y tamaño configurable entre
  40 y 400. La aplicación guarda nombre, tamaño y posición del arrastre.
- 20 poses base y variantes de mirada/máscaras de calor derivadas de los ocho SVG canónicos de `svg/cat/`, conservando
  `feMorphology` y las rutas de orejas/cola. Reposo: respiración, cola y parpadeo.
- Pupilas orientadas al puntero nativo. Movimiento
  deliberado sobre la cabeza durante 1,4 segundos y al menos 70 píxeles activa
  ojos cerrados, corazones y ronroneo; un roce breve no activa la caricia.
- Cada pulsación real alterna una pata y mantiene ese gesto durante 180 ms.
  El botón «Probar una tecla» envía una sola pulsación. Calor continuo desde el
  material base: ventana de 1,5 segundos, umbrales de 4–14 KPS, curva 1,5 y
  suavizado del original. El ritmo sostenido acumula fatiga; la máscara roja
  alcanza opacidad 0,9, aparece vapor por encima de calor 0,5 y se enfría al parar.
  La máscara respeta ojos, teclado y contorno blancos.
- Estiramiento: 21 cuadros de los keyframes originales durante tres segundos,
  centrados a escala del monitor (85% de ancho, limitado por 80% de alto). El
  actor grande deja pasar clics; su entrada/salida se desvanece y a mitad de
  la animación tiene aproximadamente 50% de opacidad. Al acabar restaura posición
  y tamaño previos.
- Máscaras de entrada independientes para cada cuadro con umbral alfa 16/255.
  Los actores de silueta se reutilizan para no destruir el receptor de un botón
  presionado durante un cambio de pose.
- Botón izquierdo: mantener y mover para arrastrar; soltar para dejarlo en su
  posición. Cabeza y 16 bandas forman el acordeón: extensión durante 260 ms,
  inercia alimentada por cambios reales de dirección y retorno con resorte
  durante 450 ms, liberando el puntero inmediatamente al soltar. Los parámetros
  proceden de Electron. Escape cancela; clic breve anima una pata.
- Durante el arrastre se captura entrada nativa hasta soltar, cancelar, ocultar
  o desactivar; en reposo el padre vuelve a ser no reactivo.
- Rueda sobre la mascota: animación del rollo de papel. Botón derecho: menú
  contextual nativo en la aplicación; en el prototipo muestra la máscara roja.
- Círculos en ambos sentidos alrededor de la mascota: postura de caza del SVG
  original, agachando la cabeza y agrandando el cuerpo durante 420 ms, con cola
  elevada, cuerpo/cola oscilantes y pupilas ampliadas. Mantiene la mirada; la caza
  dura 1.100 ms y vuelve al reposo durante 420 ms. Movimiento rápido repetido usa
  además la energía de agitación de Electron. Arrastre, teclas, rueda, estiramiento,
  menú y ocultación cancelan el gesto. Nunca captura el cursor para cazar.
- Teclado del escritorio: lector evdev pasivo de dispositivos que el usuario
  ya puede leer. Cuenta presión y repetición, ignora liberaciones y atajos con
  Ctrl/Alt/Meta; transmite únicamente actividad, sin caracteres ni identificador
  de tecla. No captura dispositivos ni modifica permisos. Si no dispone de acceso,
  responde al teclado de las preferencias e indica «Teclado local».
  `CATJANG_GNOME_INPUT_SOURCE=local` desactiva el lector. Salir o perder conexión
  cierra sus descriptores. El cliente GTK del prototipo conserva su señal D-Bus
  local `Typing`, sin texto; su log guarda solo longitud.
- Ocultación durante overview, bloqueo y pantalla completa. Overview se verificó;
  pantalla completa por monitor y transición al modo de bloqueo se verificaron
  en aislamiento; el bloqueo físico y su diálogo de contraseña siguen pendientes.
- Física, opacidad y calor se actualizan cada 16 ms; reposo usa poses cada
  140 ms y mirada/caricia/caza se muestrean cada 32 ms. Desactivar elimina el
  temporizador, suscripciones, conexiones, actores y captura activa.

Compatibilidad declarada únicamente con **GNOME Shell 50**. Las preferencias
permiten salto, estiramiento y una tecla, nombre/tamaño, usuario, mensaje fijo,
intervalo de estiramiento y volumen. Pomodoro y recordatorios reutilizan los
relojes, persistencia y eventos de `main.js`, sin duplicar lógica. Las alertas
nativas conservan el texto y reproducen los sonidos originales. El menú abre
estos paneles, ofrece salto/estiramiento/tamaño/nombre y abre el onboarding de
agentes, que conserva su consentimiento explícito. El selector y el menú permiten
Catjang, Toto, Chisi, Milo, Musubi y Chuño; cada familia usa sus ocho SVG canónicos,
su hitbox de cabeza, sus colores y el audio de su especie. Catjang conserva el
acordeón validado; las demás poses suspendidas usan el péndulo de Electron.
Siguen pendientes grabación de pantalla y edición de patrones en el backend nativo.
GNOME 46 de Ubuntu 24.04, KDE y otros escritorios requieren trabajo independiente.
Los archivos nuevos están en `native/gnome/`. Los puntos de conexión en `main.js`
están condicionados a Linux y a la selección explícita del backend. Los renderers
y preload compartidos no cambiaron; no se probaron Windows/macOS en sus sistemas.

## Ejecutar la aplicación integrada

Vista de la aplicación real dentro de un compositor aislado, sin instalar la
extensión en la sesión habitual ni cambiar el perfil real de Catjang:

```bash
native/gnome/run-nested.sh --application
```

La vista usa una licencia demo del proyecto en un perfil temporal. Las
integraciones de agentes permanecen desactivadas. Cerrar preferencias oculta esa
ventana y conserva la mascota; el botón Salir termina la aplicación y la mascota.

Para instalar explícitamente en el escritorio habitual, con GNOME 50 y Wayland:

```bash
npm run setup:linux:gnome
npm run start:linux:gnome
```

La instalación usa `catjang-native@modlovelace.github.io`. GNOME puede requerir
cerrar y volver a iniciar sesión para reconocer una extensión nueva; el script
indica el comando de activación si ocurre. Estas instrucciones aún requieren
aceptación física en el escritorio habitual. La extensión permanece oculta hasta
que una aplicación se conecta. Solo su conexión propietaria puede actualizarla;
Salir, desconexión o caída de Electron liberan la mascota y la captura de entrada.

El empaquetado Linux genera el ZIP y copia el helper/preferencias a
`resources/gnome/`. Para una distribución desempaquetada, instalar ese ZIP con
`gnome-extensions install --force`, habilitar su UUID y ejecutar con
`CATJANG_LINUX_BACKEND=gnome /ruta/a/catjang`. No se instala automáticamente en el
escritorio. La compilación requiere Python GI, GdkPixbuf y su cargador SVG; la
aplicación instalada requiere Python GI. El hook de empaquetado sale inmediatamente
en Windows/macOS sin ejecutar imports ni generar recursos.

## Ejecutar la revisión física del prototipo

Desde la raíz de este worktree:

```bash
native/gnome/run-nested.sh --manual
```

Requisitos: GNOME Shell/test-tool 50, `gnome-extensions`, Python 3 con GI,
GdkPixbuf y GTK 4, cargador SVG de GdkPixbuf, `dbus-run-session`, `pipewire` y
`mutter-devkit`, `wireplumber`, `pipewire-pulse` y `pw-cli`. Se necesita una sesión Wayland para mostrar el visor.

Si falta `mutter-devkit`, preparar una copia del paquete oficial de Ubuntu:

```bash
python3 native/gnome/prepare-viewer.py
native/gnome/run-nested.sh --manual
```

El helper descarga `mutter-dev-bin` mediante APT, verifica su SHA-256 contra los
metadatos APT y lo extrae en `.tmp/gnome-prototype/viewer-runtime/`. No instala
paquetes. El runner encuentra automáticamente esa copia; admite una ruta
alternativa con `CATJANG_PROTOTYPE_VIEWER=/ruta/a/mutter-devkit`.

El visor oficial abre un compositor separado. Dentro de su vista aparece un
cliente GTK Wayland maximizado, con un contador de clics, y la mascota encima.
Cerrar el visor o pulsar Ctrl+C en la terminal termina la sesión. El inicio y
cierre del proceso se comprobaron inicialmente durante cinco segundos, pero esa
comprobación no detectó que faltaba el enlace de vídeo ni que el visor creaba un
segundo monitor distinto del que contenía la mascota. La revisión humana descubrió
el fallo de apertura. El runner ahora conecta los flujos con WirePlumber privado
y deja activo únicamente el monitor transmitido por el visor. Antes de indicar
que está listo verifica que mascota y cliente están en ese monitor y guarda
`manual/native-manual-scene.png`. Esto no acredita interacción física.

### Criterios para aceptar esta etapa

1. Observar contorno blanco, ojos, orejas y cola completos, sin fondo rectangular.
   Esperar unos segundos: deben verse movimiento de cola/respiración y parpadeo.
2. Pulsar en el fondo y en los huecos del cuadrado de dibujo: el contador suma
   esos clics; en el cuerpo de la mascota permanece igual.
3. Pulsar brevemente sobre el cuerpo: las patas alternan y vuelve al reposo.
4. Mantener el botón izquierdo y mover la mascota. Probar movimiento rápido y
   soltar fuera de la silueta: debe recuperar el reposo en la nueva posición.
   El lugar anterior debe permitir clics al cliente. Escape cancela el arrastre.
5. Mover la rueda sobre la mascota: aparece el rollo animado y luego vuelve al reposo.
6. Seleccionar el campo de texto, escribir y observar las patas. El texto debe
   llegar al campo; pulsar la mascota y escribir después debe conservar el foco.
7. Pulsar con botón derecho sobre el cuerpo: mostrar y retirar la máscara roja.
   Debe seguir a las poses y dejar pasar los huecos transparentes.
8. Abrir/cerrar overview: ocultación y regreso sin duplicados. Cerrar el visor
   termina el compositor, cliente, WirePlumber y PipeWire privados.

Registrar versión de Ubuntu/GNOME, escala y monitor, paso que falla, resultado
esperado y observado. **Si falla un paso, pausar la integración y corregir esta
base.** Una revisión física del escritorio normal, escalas fraccionales,
monitores múltiples, fullscreen y bloqueo será necesaria en una etapa posterior.

## Evidencia nueva en el compositor

```bash
native/gnome/run-nested.sh --verify
```

Esta sonda usa Mutter real con un monitor virtual 1280 × 720 y un cliente GTK
**Wayland** situado debajo. Inserta entrada con `Clutter.VirtualInputDevice`;
no simula objetos Electron ni ejecuta los antiguos tests de Linux.

Resultados verificados el 12 de octubre de 2026 (UTC), Ubuntu 26.04 / GNOME 50.1:

| Observación | Resultado | Límite |
| --- | --- | --- |
| Captura del sprite pintado por GNOME | Visible, contorno y transparencia correctos | Revisión de imagen de un monitor virtual |
| Selección nativa frente al alfa PNG | Coincide en 2.500 puntos | Muestreo cada cuatro píxeles |
| Clic de control fuera del sprite | Cliente recibe presión y liberación | Ratón virtual |
| Clic en esquina transparente dentro del sprite | Cliente recibe el clic | Un punto de entrega, más el muestreo de geometría |
| Clic sobre región opaca | Mascota recibe el clic; cliente no recibe presión ni liberación | Ratón virtual |
| Foco de teclado al pulsar mascota | Se conserva | Cliente de comprobación |
| Reposo, clic y rueda | Cambio de píxeles y poses capturados por GNOME | Animación por cuadros |
| Tecleo del cliente GTK | Patas alternan y el campo recibe texto | Señal local; no seguimiento global |
| Arrastre rápido y liberación fuera de la silueta | Movimiento y captura correctos; área anterior vuelve al cliente | Ratón virtual; física verificada adicionalmente con `--refine` |
| Escape | Libera captura y restaura posición | Ratón/teclado virtuales |
| Diagnóstico rojo, overview y regreso | Correctos | Sesión aislada |
| Desactivar, retirar dibujo/entrada y reactivar | Sin actor residual; área vuelve al cliente; una mascota al reactivar | Ciclo aislado |

El reporte contiene 29 observaciones en
`.tmp/gnome-prototype/verify/native-observations.json`. Junto a él se generan:

- `native-pet.png`: captura de GNOME con la mascota.
- `native-input-regions.png`: captura con diagnóstico rojo.
- `native-idle-motion.png`, `native-click-pose.png`, `native-scroll-pose.png` y
  `native-drag-pose.png`: cuadros pintados durante las interacciones.
- `native-before-disable.png` y `native-without-pet.png`: el mismo lugar antes y
  después de desactivar, con una captura de ratón activa al desactivar.
- `witness-events.jsonl`: presión/liberación realmente recibidas por el cliente.

Las evidencias del modo manual se guardan por separado en
`.tmp/gnome-prototype/manual/`. El ZIP y los recursos generados son temporales e
ignorados por Git. El runner elimina el reporte exitoso anterior antes de una
nueva verificación; una ejecución fallida no debe presentarse como exitosa.

La sonda necesitó anunciar el ratón virtual antes de que GTK enlazara el seat
Wayland; se conserva un clic de control fuera de la mascota para detectar fallos
de ese montaje. Se ejecutó `node scripts/test-mascot.js` únicamente para comprobar
los recursos canónicos que exige `AGENTS.md`; no es evidencia de soporte Ubuntu.

## Integración con la aplicación real

```bash
native/gnome/run-nested.sh --integration
# Añadir el ejecutable Linux previamente empaquetado a la misma comprobación:
CATJANG_GNOME_PACKAGED=/ruta/a/linux-unpacked/catjang native/gnome/run-nested.sh --integration
```

El 12 de octubre de 2026 (UTC) pasaron **17 observaciones**, incluyendo el
arranque del ejecutable empaquetado, registradas en
`.tmp/gnome-prototype/integration/application-observations.json`:

- Extensión de aplicación inactiva antes del arranque y conexión de `main.js`
  mediante el helper Python real.
- Cambios de nombre/tamaño por el IPC de preferencias y guardado de ajustes.
- Rechazo de desconexión solicitada por otra conexión D-Bus.
- Botón de animación a través de preferencias, preload, IPC, helper y GNOME.
- Cerrar preferencias mantiene la mascota; Salir la retira y libera la captura.
- Arrastre nativo guarda coordenadas; reiniciar restaura nombre, tamaño y posición.
- Terminar Electron abruptamente deja la extensión sin dueño ni captura activa.
- Arranque normal de Electron con los metadatos del proyecto y arranque del
  ejecutable Linux, AppImage en modo de extracción y deb extraído con sus recursos
  externos de GNOME. No se instalaron distribuciones en el sistema.

Se construyó y ejecutó la distribución Linux en directorio con Electron 43.1.0 y
Node 24.18.0. La construcción de AppImage/deb y el arranque de su contenido están comprobados;
no acredita instalación, integración con el menú del escritorio ni montaje FUSE.
Las 29 observaciones del compositor y las 17 de aplicación son sondas distintas;
no sustituyen la revisión física ni demuestran soporte de otros escritorios.

## Matriz ampliada y revisión humana

```bash
native/gnome/run-nested.sh --matrix
native/gnome/run-nested.sh --performance
```

La matriz final pasó **46 observaciones** en
`.tmp/gnome-prototype/matrix/matrix-observations.json`. Comprueba dos monitores
Wayland, tamaños 40/140/400, escalas reales 125%/150%/200%, persistencia en el
segundo monitor, fullscreen por monitor, retirada de monitor durante arrastre,
formulario real, cuatro animaciones, validación de ajustes, caída del helper,
reconexiones rápidas, desactivación durante captura y recuperación tras bloqueo.
También verifica ojos, umbral de caricias, corazones y reproducción/limpieza del
ronroneo; calor con entrada Electron real, textura roja sin teñir zonas blancas,
vapor, enfriamiento y estiramiento grande con clics al cliente de debajo. La
matriz se repitió después de corregir la inicialización de preferencias y audio.

La revisión humana confirmó arrastre, seguimiento ocular, caricias y ronroneo en
el visor el 12 de octubre. Detectó inicialmente ojos/caricias ausentes y después
estiramiento pequeño y calor ausente; esos hallazgos motivaron implementaciones y
sondas nuevas. La última revisión física en el visor fue aprobada por el usuario con «Funciona
bien»: acordeón y retorno, transparencia del estiramiento y teclado fuera del
visor con calor progresivo. Siguen pendientes sesión habitual, monitores físicos
y bloqueo real.

Las capturas incluyen `eye-tracking.png`, `petting.png`, `typing-heat.png`,
`fullscreen-stretch.png`, `scale-1.25.png`, `scale-1.5.png` y `scale-2.png`.
`performance/performance.json` registra una muestra diagnóstica de 15 segundos de
CPU y RSS. El JSON contiene la medición de la implementación actual. No es una prueba de fugas de memoria ni tiene un umbral de aprobación;
RSS agregado de procesos incluye páginas compartidas. El visor de aplicación puede
reproducir audio mediante el servidor de la sesión; las demás sondas conservan el
runtime privado y no acreditan audibilidad.

Fallos corregidos durante esta matriz: reajuste al monitor principal al guardar,
ocultación por fullscreen del monitor equivocado, helpers que competían tras
reconexiones simultáneas y temporizador que tocaba actores destruidos al cerrar.
El helper oficial de GNOME necesita un timeout mayor y una llamada inicial para
pruebas largas; ambas acciones se limitan al entorno temporal de la sonda.

## Comparación con Electron y refinamiento de animaciones

```bash
native/gnome/run-nested.sh --reference
native/gnome/run-nested.sh --refine
native/gnome/run-nested.sh --isolation
```

`--reference` ejecuta **main.js y renderer/renderer.js originales** en Electron
43.1.0, con perfil demo privado y agentes desactivados. Invoca sus funciones de
animación y captura ocho fases: reposo, cada pata, acordeón, péndulo y retorno.
El reporte `reference/electron-reference.json` registra poses y estado real del
DOM; es una referencia de animación, no una aceptación del escritorio ni una
prueba de Windows/macOS.

El 12 de octubre pasaron **16 observaciones** de `--refine`, en
`refine/refined-observations.json`: extensión y ancho real del cuerpo pintado,
16 bandas, respuesta a cambios de dirección, liberación inmediata del puntero,
compresión sin cortes horizontales, retorno sin actores residuales, una pata por
pulsación durante 180 ms, calor creciente con entrada real Electron y acumulación,
máscara sin teñir blancos, enfriamiento y estiramiento al 50% a mitad de pantalla.
Las capturas `native-extended.png`, `native-body-sway.png`,
`native-spring-release.png`, `native-typing-heat.png` y
`native-stretch-midpoint.png` están junto al reporte.

También pasaron **10 observaciones** del lector en `refine/keyboard-kernel.json`.
La sonda crea un teclado uinput propio, comprueba su identidad y captura únicamente
ese dispositivo temporal para no escribir en otras aplicaciones. El parser real
consume eventos del kernel fragmentados; verifica presión, repetición, liberación,
Ctrl y Shift. El lector de producción no captura dispositivos; se comprobó que
puede leer teclados con los permisos ya existentes y que EOF lo termina.
No se guardan teclas ni texto. La respuesta física al escribir en otra aplicación
fue aprobada por el usuario en el visor con «Funciona bien».

`--isolation` abre el renderizador compartido real de Electron y comprueba
las ramas simuladas win32/darwin/linux: parámetros de mirada, captura del puntero,
curvas de arrastre, CSS de estiramiento y secuencias de ventana. El resultado
está en `isolation/isolation.json`. La ejecución ocurre en Ubuntu y no acredita
el funcionamiento nativo de Windows/macOS.

Los reportes de compositor, aplicación, matriz, refinamiento y kernel corresponden
a sondas distintas. La revisión física anterior confirmó ojos, caricias, ronroneo
y arrastre; el acordeón, transparencia y teclado global de la última iteración también
fueron aprobados por el usuario en el visor. La sesión habitual sigue pendiente. No se reutilizaron los antiguos tests de Linux como evidencia.

## Aislamiento y siguientes etapas

`gnome-shell-test-tool` instala y habilita la extensión en un perfil XDG temporal.
El runner crea un directorio runtime privado y un bus D-Bus privado sin activación
de servicios del escritorio. Todas las sondas inician y retiran PipeWire, WirePlumber en perfil `policy`
y pipewire-pulse privados, con un sumidero nulo y estado XDG temporal. La vista
de aplicación utiliza el servidor de audio del usuario para la revisión audible. No instala la extensión en la sesión habitual ni habilita autostart.

El bus mínimo genera avisos de servicios ausentes, como CalendarServer y portales;
se conservan en el log. Un error de la extensión, del script o del cliente invalida
la ejecución. Al probar una versión inicial del runner apareció una marca de
crash guard en el runtime compartido; se retiró la marca creada por esa ejecución
y el runner definitivo usa un runtime propio para evitar esa contaminación.

Después de la aceptación física:

1. Validar físicamente estas interacciones, además de monitores y escala.
2. Validar el lector con distintos teclados y sesiones que no permitan evdev,
   manteniendo el fallback local sin modificar permisos.
3. Ampliar el canal ya integrado con Electron para las funcionalidades pendientes,
   manteniendo la selección explícita del backend Linux.
4. Distribución, inicio/parada, recuperación y revisión en escritorio real antes
   de declarar soporte Ubuntu.

Referencias de la implementación: [arquitectura de extensiones GNOME](https://gjs.guide/extensions/overview/architecture.html),
[LayoutManager de GNOME 50.1](https://raw.githubusercontent.com/GNOME/gnome-shell/50.1/js/ui/layout.js),
[seat Wayland de Mutter 50.1](https://raw.githubusercontent.com/GNOME/mutter/50.1/src/wayland/meta-wayland-seat.c)
y [Mutter Development Kit](https://raw.githubusercontent.com/GNOME/mutter/50.1/src/core/meta-mdk.c).

### Verificación de los controles y la caza

```bash
native/gnome/run-nested.sh --features
native/gnome/run-nested.sh --hunting
```

`--features` recorre menú y formularios reales, pomodoro hasta el descanso,
recordatorio de una sola ejecución y audio decodificado en un servidor privado.
`--hunting` mueve un puntero virtual real en círculos en ambos sentidos y verifica
retorno, mirada, prioridades y limpieza. Son sondas del compositor GNOME 50; no
sustituyen la revisión humana. El usuario aprobó el gesto circular en el visor.

## Instalador manual con las seis mascotas (v4)

El instalador está en `dist/linux-manual/` y abre un asistente con Zenity:

```bash
./dist/linux-manual/Catjang-0.1.40-experimental.1-GNOME4-linux-x64.run
```

Instala para el usuario, sin sudo, en `~/.local/opt/catjang-gnome`, registra dos
accesos al menú y prepara la extensión v4. **Catjang** usa el perfil habitual;
**Catjang Laboratorio** activa la licencia demo del endpoint existente en un
perfil independiente bajo `~/.local/share/catjang-laboratorio/runtime/`, con
agentes desactivados. Cerrar y volver a iniciar sesión carga la extensión nueva.
Después seleccionar las mascotas desde Configuración o el menú contextual.

El archivo verifica el SHA-256 de su paquete antes de extraerlo. La actualización
guarda revisiones separadas y cambia el acceso `current`, conservando perfiles.
No sobrescribe una carpeta ajena. `--install` permite instalación desde terminal;
`--prefix` y `--data-home` eligen destinos, `--extract` permite inspeccionar el
contenido y `--skip-extension` se reserva para pruebas de empaquetado aisladas.
La extracción exige un destino nuevo. No modifica permisos de dispositivos.

Para generar el instalador a partir del directorio de electron-builder:

```bash
python3 native/gnome/build-installer.py /ruta/linux-unpacked dist/linux-manual
```

La prueba `native/gnome/run-nested.sh --mascots` recorre las seis familias con
entrada, sonido y persistencia reales. La caza circular corresponde a Catjang,
cuyo SVG tiene esa animación; las demás conservan sus gestos canónicos.
Evidencia y límites: `docs/QA_2026-10-13-gnome-installer.md`.
