# Prueba de Catjang/Comnyang en Linux

Esta copia procede del prototipo publico archivado `cloud9209/catjang-sue`.
No es una version oficial de Comnyang para Linux.

## Cambios de seguridad para la prueba

La ejecucion normal deja desactivadas estas funciones:

- captura global del teclado y de la rueda del raton;
- modificacion de `~/.claude/settings.json`;
- modificacion de `~/.gemini/config/hooks.json`;
- modificacion de `~/.cursor/hooks.json`;
- lectura de sesiones de Codex, Cursor o Kiro.

Ademas, `uiohook-napi` se trata como dependencia opcional. En este equipo no
esta instalado `libxt-dev`; si el modulo nativo no se puede compilar, npm lo
omite y la aplicacion conserva el resto de sus funciones.

En sesiones Wayland se desactivan la aceleracion por hardware y Vulkan para
evitar el error de superficie GPU observado con Electron 43 en Ubuntu 26.04.

El lanzador usa XWayland por defecto cuando detecta una sesion Wayland. Este
modo conserva el arrastre elastico completo y la posicion persistente. En
Linux, el mouse permanece siempre activo sobre la ventana y `setShape()`
recorta la interaccion a la mascota, sus botones y sus paneles. De esta forma
las areas transparentes dejan pasar los clics sin depender de
`setIgnoreMouseEvents`, cuyo reenvio no esta implementado por Electron en
Linux.

Para probarlas deliberadamente:

```bash
CATJANG_ENABLE_GLOBAL_INPUT=1 ./run-linux.sh
CATJANG_ENABLE_AGENT_INTEGRATIONS=1 ./run-linux.sh
```

No se recomienda activar ambas hasta verificar por separado el comportamiento
de la aplicacion en una sesion Wayland.

## Compilacion

```bash
npm ci
npm run dist:linux
```

El resultado esperado es un AppImage dentro de `dist/`.

Si AppArmor impide iniciar Electron desde el codigo fuente, la comprobacion
diagnostica utilizada en este equipo es:

```bash
npm run smoke -- --no-sandbox --ozone-platform=x11
npm run smoke -- --no-sandbox --ozone-platform=wayland
```

Una prueba correcta con `--no-sandbox` no significa que el binario sea apto
para publicarse.

## Ejecucion aislada

Desde la raiz del repositorio:

```bash
./run-linux.sh
```

El lanzador dirige configuracion, cache, datos y registros a `runtime/`.
La interfaz se muestra en espanol de forma predeterminada.

Para probar Wayland nativo:

```bash
CATJANG_NATIVE_WAYLAND=1 ./run-linux.sh
```

En ese modo, una region `app-region: drag` delega el movimiento al compositor
y `setShape()` limita la interaccion a las zonas visibles. Wayland no permite
consultar ni guardar coordenadas globales, por lo que la ubicacion final queda
a cargo del compositor. El evento nativo de movimiento activa la animacion
elastica completa. La cabeza es una pequena region `no-drag` para conservar la
caricia; el resto del cuerpo sirve para mover la mascota.

Ubuntu 26.04 restringe los espacios de nombres sin privilegios mediante
AppArmor, por lo que el lanzador interno del AppImage agrega `--no-sandbox`.
Esto desactiva el sandbox de los procesos de renderizado de Chromium. El script
`run-linux.sh` muestra una advertencia cuando detecta la restriccion, pero no
agrega el parametro por su cuenta. Esta compilacion solo debe utilizarse como
prueba local con el codigo incluido y no debe publicarse como binario de uso
general hasta comprobar una ejecucion con el sandbox activado.
