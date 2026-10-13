# Controles y caza del cursor en GNOME — 13 de octubre de 2026

La rama `feature/linux-adaptation` incorpora el menú contextual nativo y conecta
las preferencias GNOME con las funciones existentes de `main.js`. La extensión
v3 añade además el gesto de caza solicitado: el gato se agacha y juega cuando el
cursor describe círculos a su alrededor. El usuario respondió «Sí» al comprobar
el gesto y su regreso al reposo en el visor Wayland actualizado.

## Comportamiento implementado

- Caza derivada de `svg/cat/idle.svg`: cabeza descendiendo 11 unidades, cuerpo
  creciendo hasta 1,2 alrededor de su origen, cola elevada 5 unidades, oscilación
  de cuerpo/cola de 680 ms y pupilas ampliadas. Entrada de 420 ms, caza de
  1.100 ms y retorno de 420 ms. La mirada permanece activa. El detector conserva
  la energía de movimientos rápidos de Electron y reconoce órbitas deliberadas
  de al menos tres cuartos de vuelta en ambos sentidos. Movimiento recto suave
  no activa la postura. No captura el cursor; arrastre, teclas, rueda,
  estiramiento, menú, overview y desconexión cancelan el gesto.
- Menú contextual de GNOME: configuración, pomodoro, recordatorios, estirarse,
  saltar, tamaño, nombre, configuración de agentes y salir. Se verificó que sus
  opciones quedan dentro del área útil incluso con el gato cerca del borde
  inferior. Escape y la selección liberan la captura modal del menú.
- Preferencias: usuario, mensaje fijo, intervalo de estiramiento y volumen;
  pomodoro con inicio/pausa/reinicio y duración de enfoque/descanso; recordatorios
  con creación, edición, repetición, activación y eliminación. Reutilizan
  temporizadores y persistencia compartidos; los datos se validan antes de
  modificar los ajustes. Los eventos de estado no reposicionan la mascota.
- Avisos nativos conservan el texto del recordatorio y de los cambios de fase;
  reproducen los sonidos originales. El mensaje fijo se muestra sobre el gato.
  La conexión de agentes abre el onboarding existente y mantiene el requisito
  de consentimiento explícito. Los perfiles de QA desactivan agentes.

## Verificación

Ubuntu 26.04, GNOME/Mutter 50.1, Wayland, Electron 43.1.0 y Node 24.18.0.
Se usaron sondas con compositor, entrada virtual real y aplicación Electron
real. Los tests antiguos del backend Linux clásico no se usan como evidencia.

| Sonda | Observaciones | Evidencia en `.tmp/gnome-prototype/` |
| --- | ---: | --- |
| Compositor y entrada alfa | 29 | `verify/native-observations.json` |
| Aplicación, directorio, AppImage y DEB | 17 | `integration/application-observations.json` |
| Monitores, escala, caricias/audio y recuperación | 47 | `matrix/matrix-observations.json` |
| Acordeón, teclas, calor y transparencia | 16 | `refine/refined-observations.json` |
| Lector pasivo con teclado del kernel propio | 10 | `refine/keyboard-kernel.json` |
| Menú, formularios, relojes, recordatorio y audio | 27 | `features/features-observations.json` |
| Círculos, regreso y prioridades de animación | 13 | `hunting/hunting-observations.json` |

**159 observaciones aprobadas.** También pasó `scripts/test-mascot.js` y la sonda
`isolation/isolation.json` para las ramas simuladas win32/darwin/linux del renderer
real. Se verificaron byte por byte los 74 archivos protegidos del inicio de esta
etapa y las configuraciones de empaquetado Windows/macOS: permanecen intactos.
El único cambio de `main.js` en esta etapa está dentro de la rama Linux GNOME.
Esto no equivale a ejecutar las aplicaciones en Windows o macOS nativos.

La sonda de funciones espera la transición real de un enfoque de un minuto al
reposo con las preferencias ocultas. Un recordatorio real de una ejecución se
desactiva y persiste su fecha; el audio original se decodifica y reproduce en
el servidor de audio privado. La sonda de caza mueve el puntero en ambos sentidos,
comprueba retorno y mirada y ejercita arrastre, teclas, estiramiento, overview y
salida. La primera ejecución descubrió un cuadro negativo causado por tomar el
reloj antes del muestreo del cursor; se corrigió y las sondas posteriores pasaron.

Se generaron AppImage y DEB nuevos. Se arrancaron directorio, AppImage mediante
extracción y DEB extraído sin instalar. Sus recursos de controles/audio coinciden
con el código; el contenido del ZIP v3 coincide con el validado: 60 poses derivadas
de SVG canónicos y 1.742 PNG. Los logs están en `.tmp/gnome-controls/`.
Esto no prueba montaje FUSE ni instalación de paquetes mediante el gestor.

## Instalación y aceptación física

El usuario ya había aprobado la integración local de la extensión v2 con
«Listo, funciona genial». La caza del cursor de v3 fue aprobada en el visor
actualizado. La revisión humana de los nuevos formularios, menú y alertas en el
escritorio habitual queda pendiente; sus recorridos automatizados sí pasaron.

Se actualizó la extensión instalada mediante `native/gnome/install.sh` y se
compararon todos sus archivos con el ZIP validado. El instalador ahora explica
que actualizar una extensión ya cargada necesita cerrar y volver a iniciar sesión
para cargar sus módulos nuevos. La sesión actual conserva el código que GNOME
tenía cargado; no se reinicia la sesión automáticamente. Tras volver a entrar:

```bash
bash native/gnome/run-desktop-trial.sh
```

Esto conserva el perfil demo local independiente. Para el perfil normal:

```bash
npm run start:linux:gnome
```

El soporte sigue limitado a Catjang en GNOME 50/Wayland. Otras mascotas aparecen
como pendientes y desactivadas en el menú. Siguen pendientes su portado nativo,
grabación, instalación automática de la extensión desde un paquete, GNOME 46/KDE
y la aceptación del bloqueo físico. No se modificaron SVG ni renderers compartidos.
