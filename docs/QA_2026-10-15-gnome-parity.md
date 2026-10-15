# Paridad de mascotas, audio y tareas de IDE — 15 de octubre de 2026

El usuario confirmó el arranque local de v4 y notificó que los perros no jugaban
con círculos del cursor, el nombre quedaba desplazado y las tareas de IDE no
aparecían. Solicitó un inventario comparativo, reservar el estiramiento especial
para Catjang y un futuro perro salchicha, una caricia canina suave y voces por
mascota compartidas con Electron.

## Cambios

- Extensión GNOME v5: nombre centrado bajo los límites alfa del cuerpo, juego
  circular y retorno en las seis familias, siesta y despertar. Catjang conserva
  sus 1742 PNG anteriores idénticos; las demás familias reciben posturas de juego
  derivadas de sus propios SVG. El paquete contiene 7157 PNG.
- Capacidad de estiramiento separada del inventario de recursos: solo Catjang
  muestra y ejecuta el estiramiento especial, incluido el menú y el temporizador.
  Los ocho SVG de las seis mascotas siguen presentes. El salchicha aún no se añade.
- Un catálogo de audio en `workspace/assets/sound/pet-audio.js` para ambos
  renderizadores, empaquetado una sola vez en ASAR. Se eliminan ladrido y jadeo
  sintetizados de Electron. Seis voces distintas y una propuesta de caricia
  canina corta con silencio entre repeticiones. Créditos y adaptaciones junto a
  los archivos; la fuente de Chuño no certifica raza peruana y las de gato no
  certifican una raza. La aceptación auditiva humana queda pendiente.
- Laboratorio comienza sin monitoreo, pero permite abrir el consentimiento.
  Se reenvían estados de pensamiento/trabajo, nombre del IDE, conversación y
  tarea; fin de tarea muestra salto, confeti, voz y bocadillo. Atención/error
  tienen signo de exclamación y caducidad.
- Cursor incorpora eventos Linux de inicio/trabajo/fin y conserva el título del
  prompt para el evento final. En Linux, Antigravity anuncia terminación en Stop,
  no en cada respuesta intermedia del modelo. Kiro/Cursor usan adaptadores de
  rutas XDG conservando los parsers compartidos.
- Las pruebas ampliadas detectaron que crear un recordatorio en los últimos
  segundos de un minuto podía perder el sondeo de 15 s. La ruta GNOME comprueba
  el recordatorio inmediatamente después de crear o editar, conservando la
  implementación de las otras plataformas. La prueba exige entrega y persistencia
  inmediata del aviso debido, con audio real.

- Una ejecución de arranque encontró la extensión todavía sin registrar cuando
  Electron pidió Attach. El puente reintenta solo errores transitorios de
  disponibilidad, con espera limitada y limpieza al salir. No reintenta un
  rechazo de propiedad de otro controlador. La sonda retira temporalmente el
  objeto del bus privado, lo publica 2,5 s después y verifica conexión automática.

El inventario de 24 reacciones y la matriz se conservan en
[MASCOT_ANIMATION_MATRIX.md](MASCOT_ANIMATION_MATRIX.md).

## Evidencia

Se usan compositor GNOME/Mutter 50.1, entrada Clutter y aplicación Electron
reales, con HOME, perfiles, bus y audio privados. No se utilizan los antiguos
resultados del backend Linux clásico como evidencia de este backend.

- Matriz de seis mascotas: 133 observaciones. Mirada, caricias/audio, patas/calor,
  arrastre/retorno, rueda, salto, juego en ambos sentidos, siesta/despertar,
  nombres y exclusión del estiramiento especial.
- Agentes: 103 observaciones. Consentimiento real en la ventana de onboarding,
  instalación de hooks en HOME temporal, cinco identidades sobre las seis
  mascotas, HTTP/IPC/preload/helper/D-Bus, bocadillos, confeti, atención y limpieza.
  Se ejecutan los scripts reales de Antigravity y Cursor. Los payloads son
  sintéticos: no equivalen a una tarea real dentro de todos los IDE instalados.
- Integración: 16 observaciones, incluyendo recuperación del registro tardío, ejecutable empaquetado y acceso
  Laboratorio del instalador, con perfil independiente y conexión v5.
- Menú, formularios, pomodoro y recordatorios: 27 observaciones, incluyendo
  entrega inmediata de un recordatorio debido y transición real de enfoque a descanso.
- Matriz de monitores y escalas: 47 observaciones; tamaños 40/140/400, alpha y
  paso de clics, recuperación del helper y bloqueo/overview en el compositor privado.
- Caza de Catjang y prioridades: 13 observaciones, incluyendo recuperación al soltar.
- Rendimiento: muestra de 15,02 s en reposo con preferencias visibles. CPU de
  un núcleo: 1,40% árbol Electron/helper y 3,93% GNOME/compositor. RSS sumado del
  árbol: 801,34 MiB, incluyendo mapeos compartidos; no es memoria física exclusiva.
  Esta muestra no certifica ausencia de fugas ni consumo en el escritorio físico.
- Recursos canónicos: `scripts/test-mascot.js` aprobado.
- Las seis voces y caricias decodificadas en el renderer Electron, desde fuentes
  y desde el ASAR final; 20 archivos empaquetados de producción/audio cotejados.
- Formato original de notificaciones de Electron y aislamiento simulado
  win32/darwin/linux aprobados. Se verificó también que los nuevos eventos de
  hooks solo se registran en Linux y que los parsers Kiro/Cursor leen fixtures XDG.

**339 observaciones aprobadas** en estas seis sondas; las comprobaciones de
recursos, audio, fixtures y aislamiento se contabilizan aparte.

La evidencia se conserva en `.tmp/mascot-parity/`. Los fallos reproducidos
están en `features-minute-boundary-failure.log` y `startup-race-failure.log`;
la recuperación de arranque se verifica en `startup-recovery.log`.

La medición de rendimiento dejó de depender de identificar la ventana por su
texto: verifica el PID de la aplicación. Las preferencias se presentan al terminar
de cargar el documento, sin depender de la primera pintura de una ventana oculta.
El intento previo está en `window-visibility-failure.log`.

Los cambios compartidos solicitados afectan al audio; los nuevos eventos de
hooks están condicionados a Linux. No se modifican los SVG ni las animaciones
compartidas de Windows/macOS. Las simulaciones no sustituyen una ejecución
nativa en esos sistemas.

## Instalación y sesión del usuario

Se guardaron ajustes/licencia antes de actualizar y se conservó la revisión
anterior en `~/.local/opt/catjang-gnome/releases/`. No se reinició Ubuntu ni su
sesión. La aplicación nueva puede conectarse a la extensión v4 que la sesión ya
tiene cargada y muestra un aviso de capacidades pendientes. Los archivos v5
necesitan un nuevo inicio de sesión para ejecutarse en el escritorio habitual.

El usuario indicó que no puede cerrar sesión ahora. Se continúan las pruebas
propias en GNOME aislado y se deja pendiente exclusivamente la aceptación
física de v5 y su calidad de audio, sin solicitar otro cierre durante esta tarea.
La configuración de IDEs personales sigue siendo opt-in; los tests no instalan
hooks ni leen sesiones de agentes en el HOME habitual.

Revisión final instalada: `0.1.40-experimental.1-gnome5-366d13c2d133`. El ZIP v5 y los adaptadores
instalados coinciden con las fuentes; ajustes y listas GNOME conservados.
Instalador: `dist/linux-manual/Catjang-0.1.40-experimental.1-GNOME5-linux-x64.run`.
