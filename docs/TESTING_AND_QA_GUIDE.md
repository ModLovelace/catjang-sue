# Catjang - Guía Metódica de Pruebas y Control del Objeto para Agentes de IA

Esta guía documenta el **protocolo oficial de pruebas operativas y manipulación del objeto mascota** en Catjang. Está diseñada para que cualquier agente de IA o desarrollador pueda auditar, probar e interactuar metódicamente con la aplicación, conociendo **el paso a paso**, **el comportamiento esperado** y la **regla innegociable de pausar y corregir ante cualquier desviación**.

---

## 🛑 Principio Rector: "Pausar, Diagnosticar y Corregir"

> [!IMPORTANT]
> **REGLA DE ORO DEL QA:**
> **NUNCA** continúes al paso siguiente si el paso actual no cumple con el resultado esperado.
> Si una animación, transición, hit-box o evento IPC falla:
> 1. **PAUSAR** la secuencia de pruebas de inmediato.
> 2. **DIAGNOSTICAR** la causa raíz consultando la [Matriz de Resolución de Errores](#9-matriz-de-resolución-de-errores-si-no-pasa-pausar-y-corregir).
> 3. **CORREGIR** el archivo fuente correspondiente (`SVG`, `renderer.js`, `styles.css` o `main.js`).
> 4. **RE-VERIFICAR** el paso fallido hasta obtener validación limpia (código de salida 0).
> 5. Solo entonces avanzar al siguiente paso.

---

## 🧩 Anatomía y Puntos de Control del Objeto

El "objeto mascota" en Catjang no es un sprite estático, sino una entidad reactiva gobernada por tres capas concurrentes:

1. **Proceso Principal (`main.js`)**:
   - Gestiona el ciclo de vida de la ventana transparente de Electron (`petWin`), persistencia en `%APPDATA%\Catjang\settings.json`, temporizadores de estiramiento y pomodoro, e IPC de arrastre (`drag-window`).
2. **Proceso Renderer (`renderer/renderer.js`)**:
   - Controla las clases y datasets en `document.body` (`.dragging`, `.purring`, `data-press`, `data-scroll`, `data-jump`, `data-stretching`, `data-mascot`).
   - Mantiene el registro de documentos SVG en `svgDocs` y orquesta la inyección dinámica de capas de calor (`installHeatOverlays`).
   - Gobierna el área de interacción y passthrough del ratón mediante `isCatHitPoint` y `setIgnoreMouseEvents`.
3. **Contenedores DOM SVG (`renderer/index.html` + `svg/<mascot>/*.svg`)**:
   - Matriz canónica de 8 elementos `<object class="mascot-sprite ...">` por mascota.
   - Filtro SVG `<feMorphology>` para el contorno blanco sin recuadros negros.
   - Rutas dinámicas de ojos, pupilas, lengua, pliegue de arrastre y teclados 3D.

---

## 📋 Catálogo de Mascotas Registradas (v0.1.39+)

| ID Mascota | Nombre por Defecto | Especie / Raza | Tipo de Audio | Sonido Caricia | Teclado 3D |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `cat` | Catjang | Gatito Negro Original 🐱 | `meow` | Ronroneo (`purr.mp3`) | Sí (alternado 4px) |
| `schnauzer` | Toto | Perrito Schnauzer 🐶 | `bark` | Jadeo + Lengua fuera | Sí (alternado 4px) |
| `chisi` | Chisi | Caniche Toy 🐩 | `bark` | Jadeo + Lengua fuera | Sí (alternado 4px) |
| `milo` | Milo | Mestizo / Milongas 🐕 | `bark` | Jadeo + Lengua fuera | Sí (alternado 4px) |
| `musubi` | Musubi | Gato Atigrado Naranja 🐱 | `meow` | Ronroneo (`purr.mp3`) | Sí (alternado 4px) |
| `peruperro` | Chuño | Perro Peruano Calado 🐕 | `bark` | Jadeo + Lengua fuera | Sí (alternado 4px) |

---

## 🚀 Suite de Pruebas Automatizadas Rápidas

Antes de iniciar pruebas manuales o exploratorias, ejecuta la suite de regresión en terminal:

```bash
# 1. Verificación de recursos y equivalencias canónicas de las 6 mascotas
node scripts/test-mascot.js

# 2. Auditoría exhaustiva de las 6 mascotas (Idle, Press, Scroll, Jump, Drag, Stretch, Petting)
npx electron scripts/test-all-mascots-complete.js

# 3. Prueba de arrastre elástico, recuperación a idle y burbujas de Agentes IA
npx electron scripts/test-drag-and-ai-thinking.js

# 4. Prueba del Onboarding y selector de mascota inicial / Agentes IA
npx electron scripts/test-initial-setup.js

# 5. Prueba específica de Chuño (teclados 3D hundidos, arrastre dinámico y color rojo por calor)
npx electron scripts/test-peruperro-heat-and-keys.js

# 6. Siesta, despertar y notificaciones por IPC de las seis mascotas
npx electron scripts/test-nap-and-agents.js

# 7. Medición de CPU y capturas del renderer con perfil temporal
# No escribir ni mover el ratón durante las muestras.
npx electron scripts/qa-desktop.js

# 8. Después de npm run pack: integridad de recursos y arranque del paquete
node scripts/test-package.js
```

> **Criterio de éxito**: Todos los comandos anteriores deben terminar con código de salida `0` y reportar sus comprobaciones aprobadas. La captura del renderer no reemplaza la observación del escritorio real cuando Windows no permite capturarlo; registrar esa limitación por separado.

---

## 🐾 Guía de Control del Objeto: Paso a Paso

---

### Fase 1: Configuración Inicial y Onboarding (Licencia)

#### Paso 1.1: Activación de Licencia y Transición al Selector Inicial
- **Acción**: Lanzar la ventana de licencia (`license/index.html`) e ingresar un token válido.
- **Qué esperar**:
  - El formulario `#step-license` se oculta (`display: none`).
  - Aparece fluidamente `#step-setup` (`display: block`).
  - Se presentan las tarjetas interactivas de las 6 mascotas con sus SVGs en idle: Catjang, Toto, Chisi, Milo, Musubi y Chuño.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: No avanza del paso 1 o la ventana se cierra de golpe.
  - *Causa*: `license/license.js` aún ejecuta `window.close()` directo en lugar de revelar `#step-setup`.
  - *Corrección*: Verificar que `licenseStart` en `preload.js` y `license.js` maneje la transición en dos pasos.

#### Paso 1.2: Selección de Mascota Inicial y Consentimiento de Agentes IA
- **Acción**:
  - Hacer clic en la tarjeta de Chuño (`data-mascot="peruperro"`).
  - Seleccionar la opción de Agentes IA:
    - Caso A: Elegir **"No, más tarde"** (`connectAgents: false`).
    - Caso B: Elegir **"Sí, conectar ahora"** (`connectAgents: true`).
  - Presionar **"Comenzar"**.
- **Qué esperar**:
  - En Caso A: La mascota arranca directamente en el escritorio con Chuño activo. **NO** debe abrirse ninguna ventana modal de conexión de agentes.
  - En Caso B: Arranca Chuño e inmediatamente se abre la ventana de configuración y pruebas de agentes (`agentConnectWin`).
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: Si se seleccionó "No", igual se abre la ventana de agentes.
  - *Corrección*: En `main.js`, en el handler `license-start`, asegurar que `options.connectAgents === false` establezca `agentOnboardingShown = true` y no invoque `openAgentConnectWindow()`.

---

### Fase 2: Pose de Reposo (Idle), Transparencia y Aislamiento

#### Paso 2.1: Aislamiento Estricto de Sprites
- **Acción**: Inspeccionar el DOM de la mascota activa en el escritorio.
- **Qué esperar**:
  - El elemento `<object id="<mascot>">` tiene `display: block`.
  - Todos los demás 47 objetos SVG de mascotas inactivas tienen `display: none !important`.
  - El atributo `document.body.dataset.mascot` coincide exactamente con la mascota activa (`cat`, `schnauzer`, `chisi`, `milo`, `musubi` o `peruperro`).
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: Se superponen dos mascotas o no se ve ninguna.
  - *Corrección*: En `renderer/styles.css`, verificar las reglas de aislamiento `.mascot-sprite:not([data-mascot="..."]) { display: none !important; }`.

#### Paso 2.2: Transparencia Windows sin Recuadro Negro
- **Acción**: Observar la silueta de la mascota sobre fondos oscuros y claros del escritorio.
- **Qué esperar**:
  - El borde blanco es suave y de 1 px alrededor de la anatomía del animal.
  - El fondo de la ventana es 100% transparente. **No hay ningún recuadro negro ni sombra rectangular**.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: Aparece una caja negra rectangular detrás de la mascota.
  - *Causa Crítica*: Alguien introdujo `filter: drop-shadow(...)` de CSS en `styles.css` o dentro de un SVG.
  - *Corrección*: Eliminar de raíz cualquier `drop-shadow` de CSS y restaurar el filtro SVG `<feMorphology>` de dilatación blanca.

#### Paso 2.3: Seguimiento Ocular y Parpadeo
- **Acción**: Mover el cursor alrededor de la cabeza de la mascota sin tocarla.
- **Qué esperar**:
  - Los ojos siguen al cursor mediante el desplazamiento de pupilas (`#pupil-left`, `#pupil-right`).
  - Periódicamente se produce el parpadeo natural mediante animación CSS `.eye-l-blink`.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: Las pupilas quedan estáticas o los ojos desaparecen al parpadear.
  - *Corrección*: Verificar en `renderer/renderer.js` la función `updateEyeTracking(dx, dy)` y confirmar que los IDs `#pupil-left` y `#pupil-right` coinciden en el SVG.

---

### Fase 3: Interacción de Arrastre (Drag) y Movimiento de Ventana

#### Paso 3.1: Captura del Puntero (Hit-Testing)
- **Acción**: Hacer clic izquierdo sostenido sobre cualquier parte de la mascota (orejas, cabeza, torso o patas).
- **Qué esperar**:
  - La ventana no ignora el clic. El cursor cambia a `grabbing`.
  - `isCatHitPoint(x, y)` evalúa a `true` en toda la anatomía de la mascota (`nx: 0.15~0.85, ny: 0.08~0.92`).
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: El clic atraviesa la mascota y hace foco en la ventana de atrás (passthrough no deseado).
  - *Corrección*: En `renderer/renderer.js`, revisar `isCatHitPoint` y cerciorarse de que no use elipses restringidas exclusivas del gato.

#### Paso 3.2: Activación del Sprite de Arrastre
- **Acción**: Desplazar el ratón más de 4 píxeles con el botón presionado.
- **Qué esperar**:
  - `document.body.classList.contains("dragging")` es `true`.
  - El sprite de reposo se oculta y se muestra de inmediato `<mascot>-drag` (ej. `#peruperro-drag`).
  - La mascota aparece suspendida en el aire desde el pellejo de la nuca.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: La mascota se mueve pero permanece en pose idle o la animación parpadea y desaparece.
  - *Corrección*: Comprobar en `styles.css` la regla `body[data-mascot="<id>"].dragging #<id>-drag { display: block !important; }`.

#### Paso 3.3: Balanceo Dinámico y Físicas Colgantes
- **Acción**: Mantener arrastrada a la mascota en pantalla.
- **Qué esperar**:
  - Para Chuño (`peruperro`): Se aprecia claramente el vaivén del cuerpo completo pendulando $\pm 5^\circ$ desde la nuca (`.dangle-body`), las patas alternando balanceo $\pm 16^\circ$ y la cola vibrando $\pm 22^\circ$.
  - En movimientos rápidos de ratón, el arrastre **NO se interrumpe** si el cursor sale brevemente del marco de la ventana.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: Al mover rápido el ratón, la mascota se suelta sola antes de soltar el botón.
  - *Causa*: El evento `mouseleave` en `renderer/renderer.js` está abortando el arrastre sin verificar si el botón 0 sigue presionado.
  - *Corrección*: En el listener de `mouseleave`, asegurar `if ((dragging || releasing) && !(e.buttons & 1)) finishDragStretch(true);`.

#### Paso 3.4: Suelta (Mouseup) y Retorno a Idle
- **Acción**: Soltar el botón izquierdo del ratón en cualquier lugar de la pantalla.
- **Qué esperar**:
  - `document.body.classList.remove("dragging")` se ejecuta de inmediato.
  - La mascota no se queda atascada en el aire: vuelve instantáneamente a su sprite `idle`.
  - La nueva posición de la ventana se guarda en `settings.json` mediante IPC `drag-window-ended`.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: La mascota se queda colgada o tarda varios segundos en volver a idle.
  - *Corrección*: Revisar `finishDragStretch` en `renderer/renderer.js`: para mascotas no-gato debe remover `.dragging` de inmediato sin esperar el resorte de 16 segmentos.

---

### Fase 4: Tecleo Rítmico y Hundimiento 3D de Teclas

#### Paso 4.1: Alternancia de Patas
- **Acción**: Comenzar a escribir texto en cualquier editor o aplicación de la computadora.
- **Qué esperar**:
  - Al superar 5 pulsaciones en 2 segundos, Catjang/Chuño reacciona al tecleo.
  - Se alternan con ritmo las poses `pressLeft` (`press-left.svg`) y `pressRight` (`press-right.svg`).
  - Se escuchan los sonidos de tecleo / golpeteo sincronizados.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: La mascota no reacciona al teclado global.
  - *Causa*: `uiohook-napi` no cargó o no tiene permisos de accesibilidad en el SO.
  - *Corrección*: Verificar en consola de Electron que el hook global esté corriendo sin excepciones nativas.

#### Paso 4.2: Hundimiento 3D Real de Teclas (4 Píxeles)
- **Acción**: Observar detenidamente los teclados bajo las patas de la mascota durante la escritura.
- **Qué esperar**:
  - En `press-left.svg`: El bloque de teclado izquierdo baja a `y=33` (hundido) con su sombra 3D `#222222` comprimida, mientras el teclado derecho sube a `y=29` (levantado).
  - En `press-right.svg`: El bloque de teclado derecho baja a `y=33` (hundido) con su sombra 3D `#222222` comprimida, mientras el teclado izquierdo sube a `y=29` (levantado).
  - La sensación visual es un rebote rítmico y tridimensional idéntico al del gato original.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: Las patas se mueven pero los teclados permanecen planos o estáticos.
  - *Corrección*: Abrir `svg/<mascot>/press-right.svg` y confirmar que las coordenadas `y` de los `path` no hayan sido copiadas idénticas a `press-left.svg`.

---

### Fase 5: Medición de Velocidad (KPS), Calor y Efecto Rojo Progresivo

#### Paso 5.1: Umbral Mínimo (<4 KPS)
- **Acción**: Teclear despacio (1 a 3 teclas por segundo).
- **Qué esperar**:
  - La mascota teclea con las patas, pero **no** cambia de color ni emite vapor.
  - `currentHeat` se mantiene en 0.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: La mascota se pone roja escribiendo una sola palabra lenta.
  - *Corrección*: Verificar en `renderer/renderer.js` que `KPS_MIN = 4`.

#### Paso 5.2: Tecleo Rápido (>14 KPS) y Silueta Roja
- **Acción**: Escribir rápidamente durante 3 a 5 segundos continuos.
- **Qué esperar**:
  - `kps` supera el umbral y `currentHeat` asciende siguiendo la curva exponencial `HEAT_CURVE = 1.5`.
  - La silueta del animal (cabeza, torso, patas y cola) adquiere progresivamente un tono **rojo intenso `#dc2828`**.
  - **Los ojos, pupilas y teclados NO se vuelven rojos**: permanecen nítidos, expresivos y con sus colores originales.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: Solo sale el vapor pero el cuerpo no se pone rojo.
  - *Causa*: Los grupos del SVG no tienen el atributo `data-heat-overlay="true"` o `installHeatOverlays` no clonó los elementos hacia `.legacy-heat-overlay`.
  - *Corrección*: Inspeccionar el SVG correspondiente y asegurar los tags `data-heat-overlay="true"` en los grupos anatómicos.

#### Paso 5.3: Partículas de Vapor al Agotarse
- **Acción**: Mantener el tecleo rápido hasta que `currentHeat > 0.5`.
- **Qué esperar**:
  - Sobre la cabeza de la mascota ascienden partículas animadas de humo/vapor rojo (`#heat-steam`).
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: El vapor no aparece o se muestra cortado.
  - *Corrección*: Comprobar que en `renderer/renderer.js` se ejecute `document.body.style.setProperty("--steam-opacity", ...)` en `heatTick`.

#### Paso 5.4: Curva de Enfriamiento
- **Acción**: Detener por completo la escritura.
- **Qué esperar**:
  - La mascota vuelve a `idle`.
  - El color rojo no desaparece bruscamente: se desvanece de manera suave y progresiva (`HEAT_EASE = 0.10`) durante aproximadamente 1.5 a 2 segundos hasta retornar a su color base.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: El color rojo parpadea a negro en 1 fotograma.
  - *Corrección*: Verificar en `heatTick` que el bucle RAF continúe activo mientras `currentHeat > 0`.

---

### Fase 6: Caricias (Petting) con Delay y Gestos Caninos/Felinos

#### Paso 6.1: Rechazo de Pasos Casuales del Cursor (<1.4s)
- **Acción**: Pasar el cursor rápidamente sobre la cabeza de la mascota y retirarlo.
- **Qué esperar**:
  - **NO** se activan caricias. No hay corazones ni sonidos.
  - El sistema exige caricias voluntarias para no interrumpir el flujo de trabajo.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: Rozar por error a la mascota dispara maullidos o ladridos.
  - *Corrección*: Verificar en `renderer/renderer.js` que el temporizador de acariciado requiera `PETTING_STROKE_THRESHOLD_MS = 1400`.

#### Paso 6.2: Activación de Caricia Sostenida (>1.4s)
- **Acción**: Realizar movimientos suaves y continuos de vaivén sobre la cabeza de la mascota durante más de 1.4 segundos.
- **Qué esperar**:
  - `document.body.classList.contains("purring")` se activa.
  - Brotan corazones rosados flotantes (`#purr-hearts`).
  - **Diferenciación por especie**:
    - **Si es Gato (`cat`, `musubi`)**: Emite ronroneo continuo (`purr.mp3`) y entrecierra los ojos.
    - **Si es Perro (`schnauzer`, `chisi`, `milo`, `peruperro`)**: Saca la lengua sonriente (`#dog-tongue`), jadea con alegría y agita la cola vigorosamente.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: Un perro emite sonido de gato o no saca la lengua.
  - *Corrección*: Verificar en `renderer/mascots.js` que `soundType: "bark"` y en el SVG del perro que `#dog-tongue` tenga la regla `:root.purring #dog-tongue { display: block !important; }`.

---

### Fase 7: Desplazamiento (Scroll) y Salto (Jump)

#### Paso 7.1: Rueda de Desplazamiento (Scroll)
- **Acción**: Girar la rueda del ratón hacia arriba o hacia abajo.
- **Qué esperar**:
  - `document.body.dataset.scroll = "unroll"`.
  - La mascota se muestra jugando con el rollo de papel que se desenrolla en el suelo.
  - Al detener la rueda por 400 ms, vuelve a reposo.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: El rollo no se desenrolla o la mascota no cambia a scroll.
  - *Corrección*: Verificar en `renderer/renderer.js` el listener `onMouseWheel` y el sprite `<mascot>-scroll-unroll`.

#### Paso 7.2: Salto de Alerta y Celebración
- **Acción**: Completar un ciclo de Pomodoro o presionar una prueba de alarma.
- **Qué esperar**:
  - La mascota se agazapa brevemente (`jumpStart`) y salta al aire con ojos animados y orejas erguidas (`jumpIng`).
  - Se despliega confeti de celebración (`#completion-confetti`).
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: El salto no se reproduce o se traba en el aire.
  - *Corrección*: Comprobar `triggerJumpSequence()` en `renderer/renderer.js`.

---

### Fase 8: Integración de Agentes de IA (Hooks y Estado Pensativo)

#### Paso 8.1: Notificación de Tarea de Agente IA
- **Acción**: Ejecutar el script simulador de agente:
  ```bash
  node scripts/notify-catjang.js --start "Gemini [Refactor]: Analizando codebase..."
  ```
- **Qué esperar**:
  - Sobre la mascota aparece la burbuja de texto `#cat-speech-bubble` con el mensaje.
  - La mascota adopta la expresión pensativa con puntos suspensivos animados (`#cat-thinking-dots`).
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: No se muestra la burbuja.
  - *Causa*: El servidor local de hooks no está recibiendo el socket o la ventana está en passthrough forzado.
  - *Corrección*: Revisar el puerto IPC de hooks en `main.js` (`ipcMain.handle("notify-agent-state", ...)`).

#### Paso 8.2: Finalización de Tarea (`task_complete`)
- **Acción**:
  ```bash
  node scripts/notify-catjang.js --complete
  ```
- **Qué esperar**:
  - Suena la campanilla suave de éxito (`taskCompleteSoundVolume`).
  - La expresión pensativa se limpia de inmediato.
  - La mascota salta con confeti celebrando la finalización de la tarea del agente.
- **Si no pasa: Pausar y Corregir**:
  - *Fallo*: La cara pensativa queda trabada eternamente.
  - *Corrección*: Ejecutar `scripts/test-drag-and-ai-thinking.js` para validar la limpieza de estado en `renderer.js`.

---

## 🛠️ 9. Matriz de Resolución de Errores ("Si No Pasa: Pausar y Corregir")

| Síntoma / Fallo Observado | Causa Raíz Frecuente | Archivo a Inspeccionar | Procedimiento de Corrección Obligatorio |
| :--- | :--- | :--- | :--- |
| **Recuadro negro opaco** alrededor de la mascota | Uso de `filter: drop-shadow(...)` de CSS en ventanas transparentes | `renderer/styles.css` o `<style>` dentro de SVG | Eliminar la regla CSS y usar exclusivamente `<feMorphology>` con dilatación blanca dentro de `<defs>` del SVG. |
| **Arrastre se corta a mitad de camino** al mover rápido | `mouseleave` aborta el arrastre aunque el ratón siga presionado | `renderer/renderer.js` (línea ~3540) | Asegurar la guarda: `if ((dragging \|\| releasing) && !(e.buttons & 1)) finishDragStretch(true);`. |
| **No hace clic / Clic atraviesa la mascota** | `isCatHitPoint` tiene límites muy estrechos o desfasados | `renderer/renderer.js` (línea ~2760) | Ampliar el bounding box normalizado: `(nx >= 0.15 && nx <= 0.85 && ny >= 0.08 && ny <= 0.92)`. |
| **Teclas no se hunden al teclear** | `press-right.svg` tiene las mismas coordenadas de `press-left.svg` | `svg/<mascot>/press-right.svg` | El teclado derecho debe estar a `y=33` (hundido) y el izquierdo a `y=29` (levantado), con brillos y sombras 3D. |
| **No se pone rojo al teclear rápido** | Faltan tags `data-heat-overlay` o `installHeatOverlays` no busca `#dog-content` | `svg/<mascot>/*.svg` y `renderer/renderer.js` | Agregar `data-heat-overlay="true"` a los grupos anatómicos y soportar `#dog-content` en `installHeatOverlays`. |
| **Al soltar el arrastre la mascota no vuelve a idle** | Físicas de resorte de 16 segmentos aplicadas a mascotas no-gato | `renderer/renderer.js` (`finishDragStretch`) | Mascotas con sprites dedicados de arrastre deben remover `.dragging` y restaurar idle de forma síncrona. |
| **Nombre no cambia o vuelve al anterior** | Falló la migración en `loadSettings()` o `setMascot()` | `main.js` y `renderer/mascots.js` | Comprobar migración automática (ej. `"Inca"` $\rightarrow$ `"Chuño"`) en `loadSettings()` y persistencia con `saveSettings()`. |

---

## 🏁 Cierre de Sesión de Prueba para el Agente

Al finalizar satisfactoriamente todos los pasos:
1. Asegurar que no queden procesos residuales de pruebas (`taskkill /F /IM electron.exe` si aplica).
2. Ejecutar `git status` y verificar que solo se encuentren los cambios previstos.
3. Ejecutar `node scripts/test-mascot.js`. Debe pasar con código de salida `0`.
4. Documentar los resultados en el walkthrough o registro de actividad.
