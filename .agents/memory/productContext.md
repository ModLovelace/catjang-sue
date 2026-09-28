# Memoria: Contexto del Producto (Product Context)

## 1. Experiencia de Usuario y Propósito
El propósito de Catjang es humanizar las largas sesiones de programación y trabajo frente al ordenador. La mascota permanece en una ventana transparente y sin bordes siempre visible (*always-on-top*), sin bloquear la interacción con las aplicaciones inferiores gracias a su diseño recortado (*click-through* / *shaped window*).

---

## 2. El Catálogo Actual de Mascotas (6 Compañeros)

El proyecto cuenta con un sistema multi-mascota modular con 6 compañeros activos:

| ID | Nombre por Defecto | Especie / Raza | Sonido | Características Distintivas |
| :--- | :--- | :--- | :--- | :--- |
| `cat` | Catjang | Gatito Blanco 🐱 | `meow` | Diseño clásico, ojos interactivos grandes, maullido suave. |
| `schnauzer` | Toto | Schnauzer Pimienta/Sal 🐶 | `bark` | Barba blanca redondeada, cejas tupidas plateadas, orejas en V con puntas canela, ladridos/jadeo. |
| `chisi` | Chisi | Caniche Toy Crema 🐩 | `bark` | Pelo rizado suave, porte pequeño y alegre. |
| `milo` | Milo (Milongas) | Perro Mestizo Caramelo 🐕 | `bark` | Mancha caramelo asimétrica en ojo, pecas/ticking, collar de cadena plateada. |
| `musubi` | Musubi | Gato Atigrado 🐱 | `meow` | Rayas atigradas cafés, mirada curiosa, maullidos tiernos. |
| `peruperro` | Chuño | Perro Peruano Calado 🐕 | `bark` | Calado gris pizarra, sin pelo, orejas triangulares erectas, arrugas cutáneas, cola fina. |

**Convención de nombre:** `peruperro` es el identificador técnico y **Chuño** es el nombre canónico visible de la mascota. “Inca” es un nombre anterior que solo debe mencionarse al describir la migración de configuraciones heredadas.

---

## 3. Dinámicas y Mecánicas de Interacción

### A. Caricias Deliberadas (Petting)
- **Retardo intencional (~1.4s):** Para evitar que la caricia se active por un simple paso accidental del cursor (*hover*), el usuario debe mover deliberadamente el ratón sobre la hitbox de la cabeza durante ~1.4 segundos.
- **Reacción:** Al activarse, los ojos se entrecierran en placer (`purring`), saca la lengüita, las orejas se relajan, la cola se agita rápidamente y se emite el sonido de la especie (ronroneo para gatos, jadeo alegre para perros).

### B. Arrastre por el Pellejo (Drag & Drop)
- Al hacer clic sostenido en la mascota y mover el mouse por la pantalla, la mascota pasa a su estado `drag`, adoptando la pose suspendida del pellejo con las 4 patas balanceándose. Al soltarla, se restaura suavemente a su posición e idle.

### C. Reacción al Tecleo ("Typing Heat")
- Las patas alternan tecleando en teclados miniatura (`pressLeft` y `pressRight`).
- A velocidades altas de tipeo acumulado, el medidor interno de calor genera partículas de vapor rojo animadas (*heat steam*) sobre la cabeza de la mascota.

### D. Rueda / Scroll
- Al mover la rueda del ratón, la mascota desenrolla frenéticamente un rollo de papel higiénico con líneas de velocidad y orejas en movimiento.

### E. Estiramiento de Descanso (Periodic Stretch)
- A intervalos regulares o bajo demanda, la mascota realiza una elongación corporal completa para recordarle al desarrollador que debe descansar y estirarse.

### F. Sueño y Siesta (Nap Mode)
- Tras un periodo de inactividad prolongado, la mascota se duerme suavemente: los ojos se cierran y aparecen burbujas de texto flotantes `"Z z z"`.

---

## 4. Herramientas de Productividad
1. **Temporizador Pomodoro:** Modos de Concentración (Focus) y Descanso (Break) ajustables desde el menú contextual con notificaciones visuales.
2. **Sistema de Recordatorios:** Panel lateral deslizable para programar alertas únicas o recurrentes (por días de la semana) con mensajes personalizados en bocadillos de diálogo.
3. **Editor de Patrones (Pattern Editor):** Permite personalizar los colores base, manchas y color de ojos (incluyendo heterocromía / odd-eye) de la mascota original.
4. **Grabación de Video (Share Video):** Genera clips MP4 recortados del escritorio con la mascota para compartir en redes sociales.
5. **Onboarding Inicial:** Ventana de bienvenida post-licencia para elegir mascota preferida y habilitar conexión con agentes de IA.
