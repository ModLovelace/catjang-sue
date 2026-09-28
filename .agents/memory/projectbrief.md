# Memoria: Resumen del Proyecto (Project Brief)

## 1. Misión y Visión
**Catjang** es una mascota de escritorio virtual interactiva orientada a desarrolladores, programadores y usuarios técnicos. Proporciona:
- Un compañero visual persistente que vive en la pantalla, sigue el cursor con la mirada, reacciona al tecleo frenético ("typing heat"), se estira periódicamente y responde a caricias.
- Utilidades de productividad: temporizador Pomodoro personalizable y sistema de recordatorios recurrentes.
- **Conciencia de Agentes de IA:** Notificación y reacción visual/sonora ante los ciclos de trabajo de asistentes de codificación (Google Antigravity/Gemini, Claude Code, OpenAI Codex, Cursor, Kiro).

---

## 2. Origen del Código y Autoría
- **Autor Original:** `jan` (`nerfspeed` en Discord), creador de `jandev-png/catjang`.
- **Prototipo Base:** Derivado del fork público archivado [`cloud9209/catjang-sue`](https://github.com/cloud9209/catjang-sue).
- **Adaptación Comunitaria:** Mantenida por **Enrique Rafael Becerra Bocangel** (`@Mod-zZz` / `@ModLovelace`) en el repositorio [`ModLovelace/catjang-sue`](https://github.com/ModLovelace/catjang-sue).
- **Licencia:** **Creative Commons Atribución-NoComercial 4.0 Internacional (`CC BY-NC 4.0`)**. El proyecto no es comercial y conserva la atribución obligatoria al autor original en [`NOTICE.md`](../../NOTICE.md) y [`License.md`](../../License.md).

---

## 3. Modelo de Ramas de la Comunidad
Para evitar acoplamientos entre sistemas operativos y mantener el código base limpio, el repositorio utiliza un modelo estricto de bifurcación:

```text
community/base (Base compartida y protegida)
├── community/windows (Soporte Windows 10/11 x64, NSIS, NVM)
├── community/linux-wayland (Soporte Linux XWayland/Wayland con setShape)
└── connect-ia-agent (Rama activa: integración de agentes IA, onboarding y nuevas mascotas)
```

- `community/base`: Preserva el estado genérico común.
- `community/windows`: Contiene la adaptación a Windows y configuraciones específicas de empaquetado.
- `connect-ia-agent`: Rama de desarrollo donde convergen las características de agentes de IA, el sistema multi-mascota y las últimas mejoras de interacción.
- `main`: Se mantiene únicamente como un espejo histórico del repositorio upstream.
