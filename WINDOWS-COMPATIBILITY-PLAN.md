# Plan de compatibilidad con Windows

## Objetivo

Mantener una experiencia estable y eficiente de Catjang en Windows 10 y
Windows 11, con un entorno de desarrollo reproducible que no afecte a otros
proyectos Node.js del equipo.

## Rama, licencia y firma

- La rama activa para este trabajo es `feature/windows-compatibility`.
- El código heredado conserva **CC BY-NC 4.0**. Es código públicamente
  disponible con una restricción no comercial, no una licencia Open Source
  aprobada por OSI.
- No se cambiará la licencia heredada sin una autorización explícita del titular
  de derechos. Una licencia de las nuevas contribuciones no puede eliminar las
  condiciones que ya aplican al código original.
- La firma de código certifica el origen e integridad de un binario; no convierte
  una licencia en Open Source ni modifica sus permisos.
- El instalador Windows generado actualmente no está firmado. Una firma
  autofirmada no es confiable para Windows ni elimina las advertencias de
  SmartScreen.
- Si el titular autoriza relicenciar el proyecto completo con una licencia
  aprobada por OSI, se podrá evaluar la solicitud a SignPath Foundation para
  firma gratuita de OSS. Esa vía exige una licencia OSI para todos los
  componentes, proyecto mantenido y una política de firma/revisiones; no está
  disponible mientras se mantenga CC BY-NC 4.0.

**Decisión registrada (2026-07-27):** se mantiene CC BY-NC 4.0. El fork se
publicará gratuitamente como una adaptación comunitaria de código fuente
público y no comercial, conservando atribución, licencia e indicación de los
cambios. No se solicitará una relicencia ni firma gratuita para OSS mientras
esta decisión siga vigente.

**Distribución registrada (2026-07-27):** los binarios Windows se distribuirán
sin costo mediante GitHub Releases y permanecerán **sin firma**. Cada release
debe incluir el instalador NSIS, indicar claramente que Windows puede mostrar
una advertencia de SmartScreen, enlazar el commit fuente exacto y publicar su
SHA-256. No se publicarán binarios desde fuentes o espejos no controlados por
el proyecto.

## Política de Node.js

- Catjang usa **Node.js 24.18.0 x64**, administrado por NVM for Windows.
- Node.js 18.20.8 se conserva para los demás proyectos.
- NVM for Windows cambia un enlace global de Node, no una versión aislada por
  directorio. Antes de trabajar en Catjang se debe activar la versión indicada
  y comprobarla con `node --version`.
- `.nvmrc` y el campo `engines` de `package.json` fijan la versión requerida
  para que sea visible y verificable.

Comandos de referencia:

```powershell
nvm use 24.18.0
node --version
npm --version
where.exe node
```

Para volver a proyectos existentes:

```powershell
nvm use 18.20.8
```

## Alcance de sistemas operativos

| Sistema | Nivel de soporte | Validación requerida |
| --- | --- | --- |
| Windows 10 22H2 x64 | Compatibilidad técnica, *best effort* | Instalación, arranque, interacción, hook global y vídeo |
| Windows 11 24H2 x64 | Compatibilidad base | Validación funcional completa |
| Windows 11 25H2 x64 | Plataforma principal | Validación funcional y de rendimiento completa |

Windows 10 Home/Pro finalizó su soporte de Microsoft el 14 de octubre de 2025;
por ello no se debe prometer soporte de seguridad del sistema operativo, aunque
la aplicación siga comprobándose técnicamente en 22H2.

## Fases de trabajo

### 1. Línea base reproducible

1. Activar Node.js 24.18.0 x64 mediante NVM for Windows.
2. Comprobar que no haya conflictos de `PATH` con `nvm debug` y `where.exe node`.
3. Ejecutar `npm ci` desde una instalación limpia.
4. Verificar sintaxis de los procesos principal, preload, renderer, editor y hooks.
5. Ejecutar el smoke test de Electron sin usar `--no-sandbox`.

### 2. Compatibilidad de módulos y empaquetado

1. Confirmar que el módulo opcional `uiohook-napi` se carga en Windows x64.
2. Confirmar que `ffmpeg-static` está disponible y funciona en la aplicación empaquetada.
3. Generar y probar `win-unpacked` antes del instalador NSIS.
4. Generar el instalador NSIS x64 y validar instalación/desinstalación por usuario.
5. Incorporar después CI de Windows para instalación, checks, smoke test y empaquetado.

**Estado inicial (Windows x64, Node 24.18.0):** `uiohook-napi` carga mediante
su binario precompilado, FFmpeg está incluido en el paquete, y los smoke tests
de fuente, `win-unpacked` y la copia instalada han pasado. El instalador NSIS
x64 también completó una instalación y desinstalación silenciosas en una ruta
temporal. Queda pendiente la validación manual en Windows 10/11 y la firma para
distribución pública.

**Validación manual registrada (2026-07-27):** Windows 11 Pro build 26200,
x64, 2560 × 1080 y NVIDIA GeForce GT 1030. El mantenedor confirmó el correcto
funcionamiento interactivo de la aplicación. Siguen pendientes Windows 10,
varios monitores, DPI alternativo, RDP/VM y Defender.

### 3. Funcionalidad de escritorio

Comprobar en Windows 10/11:

- ventana transparente, sin marco, siempre encima y click-through;
- arrastre y posición persistida con una y dos pantallas;
- escalado DPI de 100 %, 125 % y 150 %;
- reacción global a teclado y rueda, incluidos avisos de Defender/antivirus;
- captura de pantalla y exportación MP4;
- comportamiento con GPU Intel, AMD y NVIDIA, además de RDP o VM.

### 4. Rendimiento

Medir antes de optimizar:

- tiempo de inicio;
- CPU y memoria en reposo;
- CPU durante animación, arrastre y captura;
- estabilidad de GPU.

Las optimizaciones candidatas son reducir/adaptar el sondeo de cursor de 60 Hz,
evitar sondeos síncronos frecuentes de logs y ajustar la conversión de vídeo
solo si las mediciones revelan un cuello de botella.

**Observación inicial (2026-07-27):** la instancia de desarrollo de Windows 11
permaneció en 0 % de CPU del equipo durante una muestra de 20 segundos. Su
conjunto de trabajo fue de 690.7 MB en seis procesos, pero no es una línea base
de lanzamiento: en modo no empaquetado la aplicación abre DevTools. La próxima
medición debe abrir la aplicación empaquetada con una licencia de prueba aislada
y registrar CPU/memoria tras un periodo de reposo.

### 5. Cambios de producto pendientes de decisión

- Restaurar la reacción global de teclado y rueda por defecto únicamente en
  Windows, manteniendo Linux como opt-in.
- Mantener las integraciones de agentes como opt-in con consentimiento, ya que
  modifican configuraciones y leen registros locales.
- Configurar icono Windows, nivel de ejecución por usuario y firma de código
  antes de una distribución pública.
- Evaluar ARM64 después de estabilizar x64 y validar los módulos nativos.

## Criterios de salida

- Node 24.18.0 reproducible mediante NVM y Node 18 preservado para otros proyectos.
- Smoke test, aplicación empaquetada e instalador verificados en Windows x64.
- No se usan argumentos que desactiven el sandbox para una distribución Windows.
- Matriz de pruebas y limitaciones registradas antes de publicar binarios.
- Cada release gratuito sin firma incluye versión, commit, SHA-256, atribución
  CC BY-NC 4.0 y aviso de SmartScreen.
