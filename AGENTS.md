# Catjang - Instrucciones y Memoria para Agentes de IA

Este repositorio utiliza el sistema de memoria y configuración de agentes ubicado en [`.agents/`](.agents/).

Para consultar la memoria de desarrollo, la arquitectura y las tareas activas, revisa:

- [**`.agents/AGENTS.md`**](.agents/AGENTS.md): Guía de entrada y reglas innegociables del proyecto.
- [**`.agents/memory/projectbrief.md`**](.agents/memory/projectbrief.md): Resumen del proyecto, licencias (`CC BY-NC 4.0`), autoría y modelo de ramas.
- [**`.agents/memory/productContext.md`**](.agents/memory/productContext.md): Funcionalidades de usuario, catálogo de las 6 mascotas e interacción.
- [**`.agents/memory/systemPatterns.md`**](.agents/memory/systemPatterns.md): Arquitectura de procesos Electron, matriz canónica de 8 SVGs y reglas de renderizado.
- [**`.agents/memory/techContext.md`**](.agents/memory/techContext.md): Stack técnico (Node 24.18.0 x64, Electron 43), dependencias y scripts de prueba.
- [**`.agents/memory/activeContext.md`**](.agents/memory/activeContext.md): Estado actual de la rama activa (`connect-ia-agent`) y cambios recientes.
- [**`.agents/memory/progress.md`**](.agents/memory/progress.md): Hitos completados (v0.1.39) y hoja de ruta pendiente.
- [**`docs/TESTING_AND_QA_GUIDE.md`**](docs/TESTING_AND_QA_GUIDE.md): Protocolo metódico de pruebas, control del objeto, qué esperar y matriz "si falla: pausar y corregir".

---

### 🚨 Regla Crítica Visual
> **NUNCA usar `filter: drop-shadow(...)` de CSS en la mascota.** En ventanas transparentes de Electron bajo Windows, genera un **recuadro negro opaco**. Usar siempre el filtro SVG `<feMorphology>` de Catjang con dilatación y flood blanco.
