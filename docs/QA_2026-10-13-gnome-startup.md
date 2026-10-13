# Arranque con una extensión anterior cargada — 13 de octubre de 2026

El usuario notificó que el acceso solo mostraba el aviso de cerrar sesión.
La consulta real de `gnome-extensions info` mostró **v2 ACTIVE**, mientras que
los archivos de la extensión instalada contienen **v4**. GNOME conservaba el
módulo anterior en memoria. El acceso exigía v4 y bloqueaba toda la aplicación,
aunque el puente ya admitía Catjang con v2/v3.

## Corrección

El acceso acepta una extensión activa desde v2. El puente comunica la versión
real a las preferencias y sigue negociando las capacidades: controles nuevos
desde v3, catálogo completo desde v4. Con v2/v3 las otras cinco mascotas siguen
desactivadas; un aviso persistente explica que hay que cerrar y volver a iniciar
la sesión de Ubuntu para cargar la actualización. El cambio no fuerza un cierre
de sesión, no cambia la selección del usuario ni altera los perfiles habituales.
Los cambios se limitan al launcher y preferencias del backend Linux GNOME.

Se actualizaron esos archivos en la instalación gestionada actual y se abrió
Catjang Laboratorio. El log real confirmó `Attached to extension v2`. El usuario
respondió **«Sí, aparecen ambas»** al comprobar la ventana de configuración y
la mascota en su escritorio. No había una instancia anterior ocupando el puente.

## Verificación

- Instalación actual: archivos corregidos comparados byte por byte con el código.
- Arranque físico con GNOME v2 cargada: conexión y observación humana confirmadas.
- Compositor aislado con extensión v4: **13 observaciones de integración**,
  incluyendo arranque del directorio empaquetado, ventana asociada al PID del
  controlador, persistencia y limpieza del propietario.
- `scripts/test-mascot.js` aprobado con Node 24.18.0.
- Distribución e instalador manual regenerados con el launcher corregido.
  El recurso de audio CC0 elegido se conserva.

Evidencia: `.tmp/gnome-startup/`, especialmente `local-application.log`,
`integration.log`, `mascot-tests.log` e `installer-build.log`.

El acceso ya permite usar Catjang. La v4 y las seis mascotas estarán disponibles
cuando el usuario cierre y vuelva a iniciar su sesión de Ubuntu y abra Catjang
Laboratorio. La sesión habitual no se reinicia automáticamente.
