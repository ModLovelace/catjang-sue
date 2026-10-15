# Procedencia de los sonidos

## `dog-bark.m4a`

- Grabación: **Dog bark 3**.
- Autor: **Sadiquecat**.
- Fuente: https://freesound.org/people/Sadiquecat/sounds/850824/
- Licencia del sonido: **CC0 1.0 Universal**.
- Licencia: https://creativecommons.org/publicdomain/zero/1.0/
- Fecha de consulta y sustitución: 13 de octubre de 2026.
- Archivo utilizado: muestra MP3 pública de alta calidad publicada en esa ficha,
  https://cdn.freesound.org/previews/850/850824_5287430-hq.mp3.
- SHA-256 de la muestra descargada: ba240df067eec77906b6006f44ae96590ff35039ab1685ce175eac478fdc8aa2.
- Adaptación: conversión a AAC mono, 44.100 Hz, 96 kb/s, contenedor M4A y
  reducción del nivel en 3 dB. Sin sintetizar, alterar el tono ni repetir el ladrido.
- Duración del archivo resultante: 0,43 segundos; pico decodificado: −3,4 dBFS.

La ficha identifica una grabación de un perro real realizada con DJI MIC-3,
recortada y normalizada por el autor. CC0 permite copiar, adaptar y distribuir
el sonido, incluso comercialmente, sin exigir atribución. Se conserva el crédito
por trazabilidad; no implica respaldo del autor al proyecto.

Este recurso conserva su licencia CC0. La licencia general del código de Catjang
sigue siendo CC BY-NC 4.0; esta incorporación no cambia la licencia del proyecto
ni la de los otros recursos. Las condiciones de los demás audios no se han
reevaluado en este cambio.

Usado por Toto, Chisi, Milo y Chuño. En GNOME el puente reproduce directamente
el archivo. El renderer clásico también añade una síntesis en `playPuppyBark()`;
ese comportamiento y el código de Windows/macOS no se modifican aquí.

## Voces por mascota — 15 de octubre de 2026

`pet-audio.js` es el catálogo único para Electron y GNOME. Cada mascota hereda
su voz y su audio de caricias del mismo archivo, incluidos los empaquetados.
Los audios nuevos son grabaciones reales CC0 1.0; no se altera su tono ni se
mezclan con síntesis. Las adaptaciones, recortes, ganancias y SHA-256 se conservan
en `audio-sources.json`.

| Archivo | Asignación | Grabación / autor | Licencia |
| --- | --- | --- | --- |
| `toto-bark.m4a` | Toto | [Ladrido de schnauzer, SmirnoffLulo](https://freesound.org/people/SmirnoffLulo/sounds/585873/) | CC0 1.0 |
| `chisi-bark.m4a` | Chisi | [Dog barking, krissyeliot](https://freesound.org/people/krissyeliot/sounds/125523/), etiquetado como caniche | CC0 1.0 |
| `milo-bark.m4a` | Milo | [Mixed-breed dog Mia, nsstudios](https://freesound.org/people/nsstudios/sounds/343074/) | CC0 1.0 |
| `dog-bark.m4a` | Chuño | Dog bark 3, Sadiquecat; crédito completo arriba | CC0 1.0 |
| `catjang-meow.m4a` | Catjang | [Cat Meow, qubodup](https://freesound.org/people/qubodup/sounds/813119/), derivado del CC0 de Jofae | CC0 1.0 |
| `musubi-meow.m4a` | Musubi | [Cat meow, TRNGLE](https://freesound.org/people/TRNGLE/sounds/362652/) | CC0 1.0 |
| `dog-contentment.m4a` | Caricias de los cuatro perros | [Whining Dog, Breviceps](https://freesound.org/people/Breviceps/sounds/462660/) | CC0 1.0 |

Los autores identifican schnauzer, caniche y mestizo en sus fichas. No se encontró
una grabación verificada como perro peruano calado: Chuño conserva la voz real
seleccionada previamente. Los dos gatos reciben voces individuales; sus fuentes
no acreditan una raza. Ser atigrado describe el pelaje de Musubi. La asignación
es de personalidad y no certifica la raza de los animales grabados.

La propuesta de caricia es una vocalización suave recortada a 0,76 s, atenuada
9 dB y seguida de 3,2 s de silencio para evitar un jadeo o chillido continuo.
Su interpretación como satisfacción es una decisión artística pendiente de
aceptación humana; la fuente la describe como un gemido de perro. Los gatos
conservan el ronroneo anterior. Los recursos previos no sustituidos mantienen
su procedencia y licencia anteriores.

La nota anterior sobre uso compartido de `dog-bark.m4a` por todos los perros y
síntesis adicional describe el estado del 13 de octubre. Desde esta revisión el
renderer reproduce directamente la voz de cada mascota y no añade ladridos ni
jadeos sintetizados. Los cambios compartidos de esta etapa se limitan al audio;
las animaciones de Windows/macOS conservan su implementación.
