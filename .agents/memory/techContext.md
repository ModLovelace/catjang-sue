# Memoria: Contexto Técnico y Entorno (Tech Context)

## 1. Stack Tecnológico Base
- **Runtime:** Node.js **24.18.0 x64** (administrado por NVM for Windows). `.nvmrc` y `package.json:engines` fijan esta versión.
- **Framework de Escritorio:** **Electron 43.1.0** (Chromium / Node integrados).
- **Empaquetado y Distribución:** **electron-builder 26.15.3**.
- **Módulos Nativos / Dependencias:**
  - `uiohook-napi` (^1.5.5): Hook global para detectar eventos de teclado y ratón fuera de la ventana. **Debe ser opcional**.
  - `ffmpeg-static` (^5.3.0): Binarios de FFmpeg empaquetados para la transcodificación de clips de pantalla a MP4.

---

## 2. Plataformas y Soporte de Sistemas Operativos

| Sistema Operativo | Arquitectura | Nivel de Soporte | Método de Empaquetado |
| :--- | :--- | :--- | :--- |
| **Windows 11 (24H2/25H2)** | x64 | Plataforma Principal | Instalador NSIS x64 (`.exe`) sin firma comercial. |
| **Windows 10 (22H2)** | x64 | *Best Effort* / Compatible | Instalador NSIS x64 (`.exe`). |
| **macOS Apple Silicon (M1..M4)** | arm64 | Soportado oficialmente | `.dmg` y `.zip` arm64 vía GitHub Actions. |
| **macOS Intel** | x64 | Soportado | `.dmg` y `.zip` x64. |
| **Linux (Ubuntu / Debian)** | x64 | Experimental comunitario | AppImage (XWayland por defecto / Wayland experimental con `setShape`). |

---

## 3. Comandos de Trabajo y Scripts NPM

```bash
# Desarrollo local
npm start                 # Inicia la mascota en modo desarrollo
npm run smoke             # Smoke test rápido de arranque y cierre limpio

# Empaquetado
npm run pack              # Empaqueta en directorio dist/win-unpacked sin comprimir
npm run dist:win          # Genera el instalador NSIS para Windows x64
npm run dist:mac          # Genera el instalador DMG para macOS
npm run dist:linux        # Genera el paquete AppImage para Linux

# Integraciones y Hooks
npm run setup:hooks       # Registra automáticamente los hooks de Antigravity, Claude y Cursor
npm run notify            # Envía un evento de notificación de prueba a la mascota
```

---

## 4. Suite de Pruebas Automatizadas (`scripts/`)

El proyecto dispone de scripts específicos de validación con salida limpia (exit code 0):

```bash
# 1. Comprobar recursos y equivalencias de las 6 mascotas (animaciones SVG, DOM y CSS)
node scripts/test-mascot.js

# 2. Prueba completa de cambio de mascotas en vivo bajo Electron
npx electron scripts/test-mascot-switch.js

# 3. Comprobar reacciones de caricias y sonidos
npx electron scripts/test-petting.js

# 4. Validar el retardo intencional de 1.4s en las caricias
npx electron scripts/test-petting-delay.js

# 5. Validar el flujo de Onboarding inicial post-licencia
npx electron scripts/test-initial-setup.js

# 6. Validar arrastre y estados de pensamiento de agentes IA
npx electron scripts/test-drag-and-ai-thinking.js

# 7. Verificación integral de todas las mascotas
npx electron scripts/test-all-mascots-complete.js

# 8. Siesta de las seis mascotas y notificaciones de agentes por IPC
npx electron scripts/test-nap-and-agents.js

# 9. CPU en reposo/siesta y capturas del renderer con perfil temporal
npx electron scripts/qa-desktop.js
```
