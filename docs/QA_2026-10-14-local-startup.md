# Arranque local y estado de Wayland — 14 de octubre de 2026

El usuario informó que la instalación se anunciaba como completada, pero Catjang
no arrancaba, y solicitó verificar la versión adecuada para su Ubuntu y el
estado del trabajo de compatibilidad.

## Diagnóstico y acción local

El sistema real es Ubuntu 26.04 LTS, GNOME Shell 50.1, Wayland, x64. Coincide
con los requisitos del instalador actual. La revisión instalada sigue siendo
`0.1.40-experimental.1-gnome4-fcd54b76fb3a`.

GNOME no reconoce el UUID de Catjang en su lista de extensiones aunque su carpeta
contiene los archivos v4 correctos. El proceso GNOME Shell del escritorio, PID
4568, comenzó el 13 de octubre y continúa desde antes de la desinstalación y
reinstalación. Los intentos desde ambos accesos del menú llegaron al launcher y
al aviso de renovar la sesión; no llegaron al ejecutable Electron.

Se compararon todos los archivos instalados de la extensión con el ZIP del
paquete, incluyendo 3557 PNG. Launcher, puente, catálogo, preferencias y audio
coinciden con la versión verificada. No hacía falta volver a extraer el mismo
instalador. Se retiró únicamente Catjang de `disabled-extensions` y se añadió
su UUID a `enabled-extensions`, preparando su activación para el siguiente
inicio de sesión. Se conservaron las demás extensiones.

**Pendiente:** guardar el trabajo, cerrar y volver a iniciar la sesión de Ubuntu,
y abrir **Catjang Laboratorio**. No se forzó el cierre de sesión del usuario.
La extensión solo dibuja la mascota cuando la aplicación se conecta. El perfil
normal requiere su licencia; Laboratorio usa el perfil demo separado existente.
No se afirma que el arranque físico de esta revisión esté aprobado todavía.

## Verificación de la aplicación instalada

Se ejecutó `CATJANG_GNOME_PACKAGED` apuntando al `catjang-bin` de la instalación
real y se corrió la sonda de integración en un compositor GNOME privado.
Pasaron **13 observaciones**, incluyendo conexión v4, ventana de preferencias
asociada al controlador, configuración y posición persistentes, animación,
salida y limpieza después de un cierre inesperado. La prueba utiliza perfiles
y un bus privados; no demuestra por sí misma el arranque del escritorio habitual.

Pasó además `scripts/test-mascot.js`, con los ocho SVG y registros de cada
mascota. Evidencia en `.tmp/gnome-local-2026-10-14/`: `verification.json`,
`extensions-before.json`, `integration.log`, `application-observations.json`,
`integrated-native-scene.png` y `mascot-tests.log`.

## Estado y próximos trabajos propuestos

El backend nativo está integrado en `feature/linux-adaptation`, con seis
mascotas y sus interacciones, audio, menú, preferencias, pomodoro y recordatorios.
La aceptación humana previa de Catjang y sus gestos está documentada; la revisión
local de las cinco familias nuevas sigue pendiente. Grabación de pantalla y
edición de patrones todavía no están implementadas en este backend.

La prioridad propuesta es completar la aceptación local de la instalación y
mejorar el diagnóstico del instalador para distinguir instalación de archivos,
activación pendiente y aplicación conectada. Después, adaptar y probar otras
versiones de GNOME, verificando dependencias y empaquetado en otras distribuciones
con ese escritorio. La versión compatible se debe declarar solo después de
validarla, conforme a la [documentación de GNOME](https://gjs.guide/extensions/overview/updates-and-breakage.html).

Para KDE Plasma se propone investigar un adaptador propio de KWin, reutilizando
el catálogo, recursos y temporizadores compartidos. Su API de efectos admite
interfaces interactivas, pero todavía no se ha implementado ni verificado para
Catjang: [documentación de KWin](https://develop.kde.org/docs/plasma/kwineffect/).
Otros escritorios requieren investigación y pruebas independientes. No hay
soporte universal de Linux ni fecha comprometida para estas adaptaciones.

Esta intervención no modifica código de Windows/macOS ni declara pruebas
nativas nuevas en esos sistemas.
