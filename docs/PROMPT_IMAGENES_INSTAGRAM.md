# 🤖 Prompt de Instrucciones para Agente de Diseño e Ilustración
## Creación de Carrusel para Instagram (8 Slides · 1080 × 1350 px)
**Proyecto:** Catjang Community Fork (Mascota de escritorio con IA & Chuño, el Perro Peruano)  
**Autor:** Enrique Becerra (@ModLovelace)  
**Instrucción para el Agente:** *Actúa como Director de Arte y Diseñador Gráfico UI/UX especializado en contenido técnico y visual para desarrolladores de software. Tu tarea es generar o maquetar las 8 imágenes del carrusel para Instagram con base en las especificaciones detalladas a continuación.*

---

## 📐 1. Parámetros Técnicos y Estilo Visual Global

- **Dimensiones:** `1080 × 1350 px` (Relación de aspecto 4:5 vertical, full screen en feed de Instagram móvil).
- **Paleta de Colores (Estilo Dark Mode IDE / GitHub):**
  - **Fondo principal:** `#0D1117` (Gris carbón oscuro / Deep Dark Canvas).
  - **Superficies y Tarjetas:** `#161B22` con borde sutil `#30363D` (1px solid).
  - **Color de Acento Primario:** `#10B981` (Verde esmeralda / Terminal JetBrains).
  - **Color de Acento Secundario:** `#58A6FF` (Azul código / VS Code).
  - **Acento Especial (Chuño/Perú):** `#EF4444` (Rojo calor/vapor y sutil bandera peruana).
  - **Tipografía y Textos:** `#FFFFFF` (Titulares) y `#8B949E` (Subtextos/labels).
- **Tipografías recomendadas:**
  - Código / Tags: `JetBrains Mono`, `Fira Code` o `Consolas` (Monospace).
  - Títulos y cuerpo: `Inter`, `SF Pro Display` o `Plus Jakarta Sans` (Sans-serif limpia y geométrica).
- **Elementos Fijos en Todos los Slides:**
  - **Esquina superior izquierda:** Tag `@modlovelace` en tipografía monospace con icono de usuario.
  - **Esquina superior derecha:** Badge temático entre corchetes (ej. `[ OPEN SOURCE ]`).
  - **Esquina inferior derecha:** Indicador de paginación limpio `01/08` .. `08/08` con flecha `➔`.

---

## 🖼️ 2. Especificación Slide por Slide (Contenido & Prompts)

---

### 🟢 SLIDE 1: PORTADA (El Gancho)
* **Objetivo:** Detener el scroll con una imagen curiosa que combine programación tierna y tecnología real.
* **Badge superior:** `[ DEV EXPERIMENT · OPEN SOURCE ]`
* **Titular Principal (Grande, Bold):**  
  `Le enseñé a mi perro peruano a ver trabajar a la IA.` 🐕💻
* **Subtexto (Limpio y legible):**  
  *Un compañero de escritorio animado que reacciona a Gemini, Claude y Cursor mientras programo.*
* **Paginación:** `01/08 ➔ Desliza`
* **Descripción de la Composición Visual:**
  - En el tercio inferior/medio, una ventana de editor de código estilo VS Code o Neovim con tema oscuro y sintaxis colorida de fondo (ligeramente desenfocada).
  - En primer plano nítido, la mascota **Chuño (Perro Peruano Calado)**: silueta de perro calado gris pizarra, sin pelo, orejas triangulares erectas, sentado frente a dos pequeños miniteclados 3D iluminados, con ojos curiosos y expresivos.
* **Prompt para Generador de Imágenes (Midjourney / Flux / DALL-E):**
  > `Clean vector UI mockup, Instagram carousel slide 4:5 aspect ratio, dark theme IDE background with soft code syntax highlights in #0D1117. In the foreground, a cute stylized minimalist 2D digital character of a Peruvian Hairless Dog (slate gray hairless skin, upright triangular ears, expressive cute eyes) sitting on a transparent desktop ledge next to two tiny illuminated mechanical keyboard pads. Minimalist aesthetic, tech developer vibes, modern clean vector lines, emerald green accents, high quality, professional graphics design --ar 4:5 --stylize 250`

---

### 🟢 SLIDE 2: EL PROBLEMA
* **Objetivo:** Mostrar la frustración de perder visibilidad periférica cuando los agentes de IA trabajan en background.
* **Badge superior:** `[ EL PROBLEMA ]`
* **Titular:**  
  `¿Tu agente está pensando... o esperando que apruebes algo?`
* **Cuerpo del texto:**
  - *Cuando lanzas tareas complejas a Claude, Gemini o Codex en segundo plano, pierdes el hilo.*
  - *Tienes que salir de tu editor y cambiar de ventana solo para ver si ya terminó o se quedó pausado.*
  - *Romper tu zona de foco arruina la productividad.*
* **Paginación:** `02/08 ➔`
* **Descripción de la Composición Visual:**
  - Una tarjeta oscura en el centro (`#161B22`) simulando una ventana de terminal.
  - En la terminal se lee: `$ claude run refactor --all` y una barra de espera titilando con un signo de exclamación `[?] Permission required to edit file`.
  - Iconos flotantes de "¿?" en gris y azul con efecto de desenfoque.

---

### 🟢 SLIDE 3: EL ORIGEN & ÉTICA OPEN SOURCE
* **Objetivo:** Destacar la historia del prototipo original archivado y el inicio del fork comunitario.
* **Badge superior:** `[ EL PROYECTO BASE ]`
* **Titular:**  
  `Encontré un proyecto archivado y decidí intervenir.`
* **Cuerpo del texto:**
  - *El prototipo original es **Catjang**, creado por **jan (nerfspeed)** bajo licencia CC BY-NC 4.0.*
  - *El concepto de un gato virtual en el escritorio era genial, pero el repo estaba archivado y presentaba problemas de ejecución.*
  - *Decidí crear un fork comunitario, respetando íntegramente la autoría original y añadiendo compatibilidad.*
* **Paginación:** `03/08 ➔`
* **Descripción de la Composición Visual:**
  - Tarjeta UI simulando la cabecera de un repositorio de GitHub:
    - Nombre: `cloud9209 / catjang-sue` con etiqueta amarilla `[ Archived ]`.
    - Flecha de transformación verde (`➔`) hacia `ModLovelace / catjang-sue` con etiqueta verde `[ Active Community Fork ]`.
  - Logo pequeño de Catjang (gato blanco) al costado.

---

### 🟢 SLIDE 4: MULTIPLATAFORMA REAL
* **Objetivo:** Demostrar compatibilidad en los 3 sistemas operativos principales sin recuadros negros.
* **Badge superior:** `[ INGENIERÍA ]`
* **Titular:**  
  `No más "en mi máquina sí funciona".`
* **Cuerpo del texto (3 Tarjetas de Sistema Operativo):**
  1. 🪟 **Windows 10 / 11:** Empaquetado NSIS x64 nativo. Filtro SVG `<feMorphology>` para evitar recuadros negros en ventanas transparentes. `[PASS ✅]`
  2. 🍎 **macOS:** Soporte compilado para Apple Silicon (M1/M2/M3/M4) e Intel (.dmg). `[PASS ✅]`
  3. 🐧 **Linux:** Compatible con Wayland y XWayland usando `setShape()` para click-through transparente real. `[PASS ✅]`
* **Paginación:** `04/08 ➔`
* **Descripción de la Composición Visual:**
  - 3 tarjetas horizontales alineadas verticalmente con los logos minimalistas de Windows, Apple y Linux Tux, cada una con un badge verde de verificación.

---

### 🟢 SLIDE 5: EL CATÁLOGO DE 6 MASCOTAS
* **Objetivo:** Mostrar la variedad de personajes; es el slide más guardado y compartido.
* **Badge superior:** `[ 6 COMPAÑEROS ]`
* **Titular:**  
  `Elige a tu compañero de escritorio favorito.`
* **Subtexto:** *Cada uno con 8 animaciones canónicas y sonidos específicos.*
* **Paginación:** `05/08 ➔`
* **Grid de Contenido (2 filas × 3 columnas):**
  1. 🐱 **Catjang:** Gato blanco con ojos grandes interactivos.
  2. 🐶 **Toto:** Schnauzer con barba y cejas tupidas plateadas.
  3. 🐩 **Chisi:** Caniche Toy crema de pelo rizado.
  4. 🐕 **Milo:** Perro mestizo caramelo con collar de cadena.
  5. 🐱 **Musubi:** Gato atigrado café de mirada tierna.
  6. 🐕 **Chuño:** Perro Peruano Calado gris pizarra.
* **Prompt para Generador de Ilustraciones (Grid de Personajes):**
  > `Set of 6 cute flat vector desktop mascot characters, 2x3 clean grid layout, dark background #0D1117. Top row: white kitten with big eyes, salt-and-pepper miniature schnauzer dog with bushy beard, cream toy poodle with curly hair. Bottom row: caramel mixed breed puppy with eye patch and chain collar, brown tabby cat, slate-gray peruvian hairless dog with upright triangular ears. Cozy modern tech desktop pet icons, minimalist flat design, crisp vector outlines, uniform art style --ar 4:5`

---

### 🟢 SLIDE 6: ESPECIAL CHUÑO (El Perro Peruano 🇵🇪)
* **Objetivo:** Conexión cultural y demostración de las mecánicas físicas avanzadas.
* **Badge superior:** `[ IDENTIDAD CULTURAL · PERÚ 🇵🇪 ]`
* **Titular:**  
  `Chuño en acción: físicas y calor al teclear.`
* **Cuerpo del texto con viñetas:**
  - 🐾 **Raza Nacional:** Inspirado en el Perro Sin Pelo del Perú (piel gris pizarra y orejas triangulares).
  - ⌨️ **Teclados 3D:** Las teclas se hunden 4px alternadamente al ritmo de tu código.
  - 🔥 **Typing Heat:** Si superas 14 KPS, brota vapor rojo animado sobre su cabeza.
  - 🔄 **Arrastre con Físicas:** Al moverlo con el ratón por la pantalla, sus 4 patas y cola oscilan con balanceo natural.
* **Paginación:** `06/08 ➔`
* **Descripción de la Composición Visual:**
  - Ilustración destacada de Chuño tecleando a toda velocidad: sus patitas sobre dos miniteclados en perspectiva 3D, vapor rojo semitransparente emergiendo de su cabeza (`#heat-steam`), y alrededor pequeñas etiquetas con líneas de señalamiento: *"Hundimiento 4px"*, *"Vapor de calor"*, *"Físicas $\pm 16^\circ$"*.

---

### 🟢 SLIDE 7: ARQUITECTURA & CONEXIÓN IA
* **Objetivo:** Explicar cómo funciona técnicamente la conexión sin tecnicismos aburridos.
* **Badge superior:** `[ ARQUITECTURA TÉCNICA ]`
* **Titular:**  
  `Cómo habla con tus agentes en tiempo real.`
* **Diagrama Visual:**
  - `[ Gemini / Claude / Cursor ]` ➔ *(HTTP Hook)* ➔ `[ Servidor Local 127.0.0.1:23456 ]` ➔ `[ Mascota en Pantalla ]`
* **Los 4 Estados Visuales:**
  - 🧠 **Pensando:** Aparecen puntos suspensivos `( . . . )` sobre su cabeza.
  - ⚡ **Ejecutando Tools:** Tecleo acelerado en sincronía con el agente.
  - ⚠️ **Requiere Permiso:** Signo de exclamación `(!)` para no dejar esperando al agente.
  - 🎉 **Completado:** Salto de celebración, ladrido y bocadillo con el tema resuelto.
* **Dato de Desempeño:** *Impacto en CPU medido: solo 0.5% – 0.95%. Prácticamente invisible para el sistema.*
* **Paginación:** `07/08 ➔`

---

### 🟢 SLIDE 8: DESCARGA & CIERRE (CTA)
* **Objetivo:** Conversión directa: que vayan al GitHub, descarguen el instalador y te sigan.
* **Badge superior:** `[ 100% GRATIS · OPEN SOURCE ]`
* **Titular:**  
  `Pruébalo hoy en tu propio escritorio.`
* **Subtexto:**  
  *Disponible para Windows (.exe), macOS (.dmg) y Linux (AppImage).*
* **Cajas de llamada a la acción:**
  - 📦 **Descarga e Instaladores:** `github.com/ModLovelace/catjang-sue`
  - 📺 **Video demostrativo:** En YouTube `@modlovelace`
  - 💬 **Comenta:** *¿Cuál de los 6 compañeros te gustaría tener en tu pantalla?*
* **Pie ético obligatorio:**  
  *Fork comunitario sin fines comerciales basado en Catjang de jan (nerfspeed) · Licencia CC BY-NC 4.0.*
* **Paginación:** `08/08 · Guarda este post 🔖`

---

## 🎨 3. Resumen de Instrucciones para el Agente Diseñador
1. **Mantener coherencia cromática:** Ningún fondo debe ser blanco; todos deben seguir la paleta oscura `#0D1117` para dar la sensación de IDE/desarrollador.
2. **Textos limpios y grandes:** Los usuarios leen Instagram en pantallas de 6 pulgadas. Los títulos deben leerse con facilidad sin hacer zoom.
3. **Estilo de las mascotas:** Siempre en estilo vector plano / 2D limpio, idéntico a los SVGs originales de Catjang.
