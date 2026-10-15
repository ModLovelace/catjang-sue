# Instalación limpia de Linux — 13 de octubre de 2026

El usuario pidió desinstalar Catjang desde cero y volver a instalarlo para probar
las seis mascotas. La instalación anterior conservaba una extensión v2 cargada
en GNOME aunque los archivos del disco ya eran v4; el catálogo completo requiere
v4 en ejecución.

Se cerraron los tres procesos identificados de Catjang y sus auxiliares. Antes
de retirar la aplicación gestionada, la extensión y los accesos del menú, se
respaldaron los perfiles habitual, de laboratorio, de ensayo de escritorio y
del código fuente. El respaldo está en `.tmp/gnome-clean-install/backup/`.
No se encontró un archivo de licencia en el perfil habitual respaldado.
El código fuente y las extensiones ajenas a Catjang se conservaron.

Se verificó el SHA-256 del instalador y se instaló de nuevo en
`~/.local/opt/catjang-gnome`, sin activar la extensión en la sesión actual.
Después se instaló el ZIP v4 y se dejó desactivado hasta el próximo inicio de
sesión. La revisión instalada es
`0.1.40-experimental.1-gnome4-fcd54b76fb3a`.

La comprobación confirmó:

- Catálogo con Catjang, Toto, Chisi, Milo, Musubi y Chuño.
- Los 3557 recursos PNG y todos los archivos del ZIP instalados sin diferencias.
- Launcher, puente, preferencias y catálogo empaquetados iguales al código fuente.
- Ladrido CC0 elegido por el usuario con el SHA-256 esperado.
- Los dos accesos del menú y perfiles activos sin ajustes antiguos.
- Listas de extensiones ajenas y ajuste global de GNOME conservados.

La prueba interactiva de esta instalación limpia queda pendiente de cerrar y
volver a iniciar la sesión de Ubuntu. Después se debe abrir Catjang Laboratorio
y seleccionar las mascotas desde Configuración o el menú contextual. No se
inició de nuevo el código v2 almacenado en la sesión anterior ni se forzó el
cierre de sesión del usuario.

Evidencia: `.tmp/gnome-clean-install/install.log`, `verification.json`,
`backup-summary.json` y `gnome-before.json`. Esta comprobación de instalación
no sustituye las pruebas interactivas de animaciones ya documentadas.
