# Instalación de Catjang experimental

Estas instrucciones corresponden a `v0.1.40-experimental.1`. Es una versión
preliminar del fork comunitario y sus aplicaciones no tienen firma digital ni
notarización. Descarga los archivos únicamente desde la
[versión oficial en GitHub](https://github.com/ModLovelace/catjang-sue/releases/tag/v0.1.40-experimental.1).

## macOS con Apple Silicon

1. Descarga `Catjang-0.1.40-experimental.1-arm64.dmg`. Los archivos sin
   `arm64` son para Macs Intel.
2. Opcionalmente, verifica el archivo con `SHA256SUMS-macOS.txt`:

   ```bash
   cd ~/Downloads
   shasum -a 256 Catjang-0.1.40-experimental.1-arm64.dmg
   ```

3. Abre el `.dmg` y arrastra `Catjang.app` a `Aplicaciones`.
4. Intenta abrir Catjang una vez. macOS puede bloquearlo porque esta versión no
   está firmada ni notarizada.
5. Abre `Configuración del Sistema → Privacidad y seguridad`, baja hasta el
   aviso sobre Catjang y selecciona `Abrir de todas formas`. Autoriza la acción
   y confirma `Abrir`.
6. Cuando Catjang lo solicite, concede `Accesibilidad` y, si aparece,
   `Monitorización de entrada` en `Privacidad y seguridad`. Cierra y vuelve a
   abrir Catjang para aplicar los permisos.

Si macOS continúa mostrando que la aplicación está dañada después de verificar
que el SHA-256 coincide con el archivo oficial, elimina únicamente la marca de
cuarentena de esta copia y vuelve a abrirla:

```bash
xattr -dr com.apple.quarantine /Applications/Catjang.app
open /Applications/Catjang.app
```

## Windows 10/11 x64

1. Descarga `Catjang Setup 0.1.40-experimental.1.exe` desde la misma versión de
   GitHub.
2. Opcionalmente, verifica el archivo con `SHA256SUMS-Windows.txt`:

   ```powershell
   Get-FileHash "$HOME\Downloads\Catjang Setup 0.1.40-experimental.1.exe" -Algorithm SHA256
   ```

3. Ejecuta el instalador. Si Microsoft Defender SmartScreen muestra
   `Windows protegió su PC`, selecciona `Más información` y después
   `Ejecutar de todas formas`.
4. Completa la instalación. No se requieren permisos de administrador.
5. Si la mascota no reacciona al teclado o al desplazamiento, revisa si el
   antivirus bloqueó el hook de entrada y permite Catjang desde su aviso.

No es necesario desactivar Gatekeeper, SmartScreen ni el antivirus. Las
excepciones descritas se aplican solamente al archivo oficial cuyo SHA-256
coincida con el publicado.

## Primer inicio

La ventana de licencia usa claves de prototipo locales. Puedes introducir una
de las claves documentadas en el
[README](../README.md#prototype-license-keys). La conexión con agentes de IA
es opcional: actívala en el onboarding únicamente si deseas que Catjang lea sus
eventos locales y configure sus hooks.
