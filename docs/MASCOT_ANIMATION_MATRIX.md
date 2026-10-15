# Animaciones de referencia y comparación de mascotas

Actualizado el 15 de octubre de 2026. Referencia: Catjang original de Electron;
implementación que se compara: backend nativo de Ubuntu GNOME/Wayland v5.

Los ocho SVG canónicos se conservan en todas las mascotas. Las capacidades de
interacción se declaran aparte: tener `stretch.svg` no obliga a ofrecer el
estiramiento especial. El perro salchicha todavía no forma parte del catálogo.

## Inventario de Catjang

| # | Animación o reacción | Disparador / resultado |
| --- | --- | --- |
| 1 | Reposo | Respiración y movimiento periódico de cola; formas propias de cada familia |
| 2 | Mirada | Pupilas orientadas al cursor, también fuera de la mascota |
| 3 | Parpadeo | Cierre breve de ojos durante el reposo |
| 4 | Siesta | Tras un minuto sin actividad, ojos cerrados y «Z z z» |
| 5 | Despertar | Movimiento del cursor, clic o tecla vuelve al estado activo |
| 6 | Caricias | Movimiento deliberado sobre la cabeza; ojos relajados, corazones y audio |
| 7 | Patita izquierda | Una pulsación mueve una pata; alterna con la derecha |
| 8 | Patita derecha | Alternancia coherente con las pulsaciones |
| 9 | Fatiga y calor | Tecleo rápido acumulado enrojece el material base y genera vapor |
| 10 | Enfriamiento | El color y el vapor decaen al parar de teclear |
| 11 | Rueda | Poses de desenrollar papel con movimiento |
| 12 | Preparación del salto | Pose agachada previa al salto |
| 13 | Salto y aterrizaje | Pose en el aire seguida de recuperación al reposo |
| 14 | Arrastre | Captura hasta soltar; acordeón de Catjang o péndulo propio de las otras familias |
| 15 | Retorno del arrastre | Recuperación amortiguada y liberación inmediata del cursor |
| 16 | Juego circular | Órbitas del cursor en ambos sentidos activan postura de juego, cola y mirada |
| 17 | Movimiento rápido del cursor | El detector de agitación puede activar el mismo gesto de juego |
| 18 | Fin del juego | Transición suave desde la postura de juego hasta el reposo |
| 19 | Estiramiento especial | Figura grande centrada en pantalla, semitransparente y con paso de clics |
| 20 | Agente pensando | Puntos animados y bocadillo con IDE, conversación y tarea |
| 21 | Agente trabajando | Estado de trabajo identificado con puntos animados |
| 22 | Tarea terminada | Salto, confeti, voz propia y «IDE: Terminó «tarea»» |
| 23 | Atención o error | Signo de atención y bocadillo; los avisos de atención también saltan |
| 24 | Recordatorios y pomodoro | Avisos con texto/audio y animaciones conectadas a los temporizadores existentes |

## Matriz objetivo de Ubuntu v5

| Capacidad | Catjang | Toto | Chisi | Milo | Musubi | Chuño |
| --- | --- | --- | --- | --- | --- | --- |
| Reposo, mirada y parpadeo | Sí | Sí | Sí | Sí | Sí | Sí |
| Siesta y despertar | Sí | Sí | Sí | Sí | Sí | Sí |
| Caricias y corazones | Sí | Sí | Sí | Sí | Sí | Sí |
| Voz individual | Sí | Sí | Sí | Sí | Sí | Sí |
| Patas, calor y enfriamiento | Sí | Sí | Sí | Sí | Sí | Sí |
| Rueda y salto | Sí | Sí | Sí | Sí | Sí | Sí |
| Arrastre y retorno | Acordeón | Péndulo | Péndulo | Péndulo | Péndulo | Péndulo |
| Juego circular y retorno | Sí | Sí | Sí | Sí | Sí | Sí |
| Estiramiento especial | Sí | Excluido | Excluido | Excluido | Excluido | Excluido |
| Estados y avisos de agentes | Sí | Sí | Sí | Sí | Sí | Sí |
| Nombre centrado debajo del cuerpo | Sí | Sí | Sí | Sí | Sí | Sí |

«Sí» describe la implementación de v5. La revisión visual y auditiva humana de
esta actualización es independiente de las sondas automatizadas. La captura y
la edición de patrones no son animaciones y siguen fuera del backend nativo.

## Audio compartido con Electron

La única asignación está en `workspace/assets/sound/pet-audio.js`; ambos
renderizadores la consumen y reciben las mismas grabaciones. Los archivos,
licencias y adaptaciones se detallan en `workspace/assets/sound/README.md` y
`audio-sources.json`. No se modifica el tono para simular razas.

Toto usa una grabación de schnauzer, Chisi una etiquetada como caniche y Milo
una de mestizo. Chuño conserva el ladrido real elegido anteriormente: la fuente
no acredita que sea un perro peruano. Las dos voces de gato son distintas, sin
raza certificada en sus fuentes.

Las caricias también usan seis grabaciones diferentes, sin compartir muestras
entre mascotas:

| Mascota | Audio de caricia |
| --- | --- |
| Catjang | `purring.m4a`, ronroneo original |
| Toto | `toto-petting.m4a` |
| Chisi | `chisi-petting.m4a` |
| Milo | `milo-petting.m4a` |
| Musubi | `musubi-purring.m4a`, otro ronroneo |
| Chuño | `chuno-petting.m4a` |

Los perros alternan vocalizaciones breves con pausas. Las fuentes de estas
caricias no certifican las razas de las mascotas; su asignación es artística,
pendiente de aceptación auditiva del usuario. Las grabaciones nuevas son CC0;
Catjang conserva su recurso original y su licencia previa.

La revisión de caricias del 15 de octubre pasó 134 comprobaciones de GNOME
aislado. `scripts/test-pet-audio.js` también verificó los seis perfiles en el
renderer Electron y en el paquete final: decodificación, contenido no silencioso,
ausencia de saturación y seis huellas de audio diferentes, para evitar copias de
la misma muestra con nombres distintos.

## Conexión con IDEs

Laboratorio deja configurar integraciones; comienza desactivado y requiere
pulsar **Configurar agentes de IA → Sincronizar Hooks**. Las pruebas aíslan HOME,
perfiles y archivos de hooks. No se habilitan monitores sobre los IDEs personales
como consecuencia de ejecutar una sonda.

Antigravity/Gemini, Claude Code, Codex, Cursor y Kiro comparten el canal de eventos
y las mismas reacciones en las seis mascotas. Se verifican payloads de cada
identidad y scripts de hooks reales de Antigravity y Cursor. Esto no equivale a
probar una tarea real dentro de cada producto instalado.

En Linux, `PostInvocation` de Antigravity indica trabajo intermedio y `Stop`
indica terminación. Cursor incorpora inicio, trabajo y fin de turno, conservando
el título cuando el evento final lo omite. Los monitores Linux de Kiro/Cursor
usan su ubicación XDG; los parsers y rutas originales de macOS se conservan.
Referencias: [hooks de Antigravity](https://www.antigravity.google/docs/hooks/)
y [hooks de Cursor](https://prod.cursor.com/docs/hooks).
