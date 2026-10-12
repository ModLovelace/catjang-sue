# Integración del backend GNOME — 12 de octubre de 2026

La implementación aprobada físicamente en el visor se incorporó desde el
worktree `codex/ubuntu-gnome-prototype` al checkout de `feature/linux-adaptation`.
La respuesta humana «Funciona bien» cubre acordeón y retorno, transparencia a
mitad del estiramiento y teclas desde otra aplicación con calor progresivo.

GNOME dibuja Catjang; Electron conserva licencia, configuración y audio.
El backend se selecciona explícitamente con `CATJANG_LINUX_BACKEND=gnome` y admite
GNOME 50/Wayland. El backend clásico sigue disponible. No se declara soporte de
GNOME 46, KDE, otras mascotas nativas ni aceptación del escritorio habitual.

## Preservación de Windows y macOS

La integración conservó byte por byte los 75 archivos compartidos/SVG de la
instantánea previa: preload, renderer, CSS, overlay, registros de mascotas y
recursos. Esa instantánea ya contenía guardas y restauraciones de compatibilidad;
se conservaron. Las opciones win/mac/mas, dependencias opcionales y el hook
existente afterPack se mantuvieron. El hook nuevo beforePack retorna antes de
importar o ejecutar Python cuando la plataforma no es Linux.

La selección del backend y del hook de entrada se comprobó con combinaciones de
plataforma, backend y opt-out. `--isolation` verificó las ramas simuladas
win32/darwin/linux en el renderer real de Electron: mirada, captura, curvas de
arrastre, CSS de estiramiento y secuencias de ventana. No se ejecutaron runtimes
nativos de Windows/macOS; esta evidencia no certifica esos sistemas.

## Verificación del código integrado

Todas estas sondas se ejecutaron nuevamente desde el checkout del proyecto,
con Electron 43.1.0 / Node 24.18.0 en Ubuntu 26.04 / GNOME 50.1 / Wayland:

| Sonda | Observaciones | Evidencia en `.tmp/gnome-prototype/` |
| --- | ---: | --- |
| Compositor, selección alfa y entrega de entrada | 29 | `verify/native-observations.json` |
| Aplicación y tres formatos Linux | 17 | `integration/application-observations.json` |
| Monitores, escala, caricias/audio y recuperación | 46 | `matrix/matrix-observations.json` |
| Acordeón, teclas, calor y transparencia | 16 | `refine/refined-observations.json` |
| Teclado del kernel propio y lector pasivo | 10 | `refine/keyboard-kernel.json` |
| Ramas de compatibilidad | Aprobadas | `isolation/isolation.json` |

Total: **118 observaciones**, más las ramas de compatibilidad. También pasó
`scripts/test-mascot.js` con Node 24.18.0. Los antiguos tests de Linux no se usan
como evidencia del backend GNOME.

Se compararon los 1.022 PNG nativos con el worktree aprobado: son idénticos.
Se construyeron directorio Linux, AppImage y deb; se verificaron recursos y se
arrancaron los tres contenidos en Wayland. AppImage se ejecutó por extracción,
y deb se extrajo sin instalarlo. Cada ventana de preferencias se asoció al PID
padre del helper propietario D-Bus antes de terminar la aplicación.
Esto no prueba montaje FUSE, instalación de paquetes ni integración del menú.

Las sondas conservan un runtime/bus/audio privados. El reposo ahora observa una
secuencia acotada de cuadros, evitando comparar dos fases visualmente iguales;
la sonda de compatibilidad mapea sus ventanas para que RAF pueda avanzar.
Los procesos empaquetados se identifican por su propietario, no solo por título.
Los logs y el resumen están en `.tmp/gnome-integration/`; la copia previa del
checkout está en `.tmp/gnome-integration/pre-integration/`.

La muestra diagnóstica de 15 segundos en reposo registró 2,93% de un núcleo
para GNOME y 0,53% para el árbol Electron; RSS agregado: 270,55 MiB y 804,39 MiB.
El JSON está en `performance/performance.json`. Es una muestra corta, no una
prueba de ausencia de fugas; RSS agregado incluye memoria compartida.

## Prueba pendiente en la sesión habitual

La extensión fue instalada previamente y necesita que GNOME reconozca el UUID
tras volver a iniciar sesión. Desde el checkout integrado:

```bash
bash native/gnome/run-desktop-trial.sh
```

Este comando usa licencia demo y un perfil separado, con agentes desactivados.
Después comprobar arrastre/soltar, teclas externas, estiramiento, clics
transparentes, ojos/caricias/audio, overview y fullscreen; salir y reiniciar para
comprobar retirada del lector y persistencia de posición/tamaño.
