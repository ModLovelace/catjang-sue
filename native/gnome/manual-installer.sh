#!/usr/bin/env bash
set -euo pipefail
# The builder replaces these values and appends a verified distribution archive.
PAYLOAD_SHA256='@PAYLOAD_SHA256@'
RELEASE='@RELEASE@'
UUID=catjang-native@modlovelace.github.io
MODE=gui
PREFIX="${HOME}/.local/opt/catjang-gnome"
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
SKIP_EXTENSION=false
EXTRACT=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --gui) MODE=gui; shift ;;
    --install) MODE=install; shift ;;
    --prefix) PREFIX="${2:?Falta ruta para --prefix}"; shift 2 ;;
    --data-home) DATA_HOME="${2:?Falta ruta para --data-home}"; shift 2 ;;
    --skip-extension) SKIP_EXTENSION=true; shift ;;
    --extract) MODE=extract; EXTRACT="${2:?Falta destino para --extract}"; shift 2 ;;
    --help) printf 'Catjang GNOME: instalador manual Linux x64\n  %s [--gui | --install | --extract RUTA]\n  --prefix RUTA       Destino de la aplicación\n  --data-home RUTA    Destino de accesos y datos XDG\n  --skip-extension   Solo para pruebas de empaquetado aisladas\n' "$0"; exit 0 ;;
    *) printf 'Opción desconocida: %s\n' "$1" >&2; exit 2 ;;
  esac
done
for item in "$PREFIX" "$DATA_HOME"; do
  [[ "$item" == /* && "$item" != *$'\n'* ]] || { printf 'Se requiere una ruta absoluta sin saltos de línea.\n' >&2; exit 2; }
done
TEMP_DIR="$(mktemp -d /tmp/catjang-installer.XXXXXX)"
trap 'rm -rf -- "$TEMP_DIR"' EXIT
fail() {
  printf '%s\n' "$1" >&2
  if [[ "$MODE" == gui ]] && command -v zenity >/dev/null; then zenity --error --title='Instalar Catjang' --text="$1" || true; fi
  exit 1
}
if [[ "$MODE" == gui ]]; then
  command -v zenity >/dev/null || fail 'Este entorno no tiene Zenity. Ejecuta el instalador con --install desde una terminal.'
  if ! zenity --question --width=550 --title='Instalar Catjang para Linux' --ok-label='Instalar' --cancel-label='Cancelar' --text="Instalar Catjang, Toto, Chisi, Milo, Musubi y Chuño.\n\nDestino: $PREFIX\n\nSe agregarán Catjang y Catjang Laboratorio al menú de aplicaciones y la extensión de GNOME. Laboratorio usa una licencia demo y un perfil separado. Tu configuración habitual se conserva.\n\nRequiere GNOME Shell 50, Wayland y Linux x64. Si GNOME ya tenía cargada la extensión, tendrás que cerrar y volver a iniciar sesión.\n\nLicencia CC BY-NC 4.0: uso no comercial con atribución."; then exit 0; fi
fi
if [[ "$MODE" != extract ]]; then
  [[ "$(uname -m)" == x86_64 ]] || fail 'El instalador contiene binarios para Linux x64.'
  command -v python3 >/dev/null || fail 'Instala Python 3 y python3-gi antes de continuar.'
  python3 -c 'import gi; from gi.repository import Gio, GLib' 2>/dev/null || fail 'Falta python3-gi (Gio/GLib).'
  if [[ "$SKIP_EXTENSION" != true ]]; then
    [[ "${XDG_SESSION_TYPE:-}" == wayland && "$(gnome-shell --version 2>/dev/null || true)" == 'GNOME Shell 50.'* ]] || fail 'Este instalador nativo requiere una sesión Wayland de GNOME Shell 50.'
    command -v gnome-extensions >/dev/null || fail 'No se encontró gnome-extensions.'
  fi
fi
LINE="$(awk '/^__CATJANG_ARCHIVE_BELOW__$/ {print NR + 1; exit}' "$0")"
[[ -n "$LINE" ]] || fail 'El instalador no contiene el paquete.'
tail -n +"$LINE" -- "$0" > "$TEMP_DIR/payload.tar.gz"
printf '%s  %s\n' "$PAYLOAD_SHA256" "$TEMP_DIR/payload.tar.gz" | sha256sum --check --status || fail 'El paquete está incompleto o fue modificado; su SHA-256 no coincide.'
if [[ "$MODE" == extract ]]; then
  [[ "$EXTRACT" == /* ]] || fail 'La extracción requiere una ruta absoluta.'
  [[ ! -e "$EXTRACT" ]] || fail 'El destino de extracción ya existe. Elige una carpeta nueva.'
  mkdir -p -- "$EXTRACT"
  tar --no-same-owner --no-same-permissions -xzf "$TEMP_DIR/payload.tar.gz" -C "$EXTRACT"
  printf 'Paquete verificado y extraído en %s\n' "$EXTRACT"; exit 0
fi
if [[ -e "$PREFIX" && ! -f "$PREFIX/.catjang-installation" ]]; then fail 'El destino ya existe y no pertenece a este instalador. Elige otra ruta con --prefix.'; fi
mkdir -p -- "$PREFIX/releases"
TARGET="$PREFIX/releases/$RELEASE"
if [[ -e "$TARGET" ]]; then
  [[ -f "$TARGET/.payload-sha256" && "$(cat "$TARGET/.payload-sha256")" == "$PAYLOAD_SHA256" ]] || fail 'Esta revisión ya existe con contenido distinto. Usa otro destino con --prefix.'
else
  STAGING="$PREFIX/releases/.install-$RELEASE-$$"
  mkdir -- "$STAGING"
  if ! tar --no-same-owner --no-same-permissions -xzf "$TEMP_DIR/payload.tar.gz" -C "$STAGING"; then rm -rf -- "$STAGING"; fail 'No se pudo extraer la aplicación.'; fi
  chmod u-s -- "$STAGING/chrome-sandbox"
  printf '%s\n' "$PAYLOAD_SHA256" > "$STAGING/.payload-sha256"
  mv -- "$STAGING" "$TARGET"
fi
if [[ "$SKIP_EXTENSION" != true ]]; then
  gnome-extensions install --force "$TARGET/resources/gnome/$UUID.shell-extension.zip" || fail 'No se pudo instalar la extensión GNOME.'
  # Unknown UUIDs are recognized at the next login; retain the installed app.
  gnome-extensions enable "$UUID" || true
fi
printf 'Catjang GNOME user installation\n' > "$PREFIX/.catjang-installation"
if [[ -e "$PREFIX/current" && ! -L "$PREFIX/current" ]]; then fail 'El acceso current fue reemplazado por una carpeta ajena. Elige otro destino.'; fi
ln -sfn -- "releases/$RELEASE" "$PREFIX/current"
cat > "$PREFIX/catjang" <<'LAUNCH'
#!/usr/bin/env bash
set -euo pipefail
PREFIX="$(cd -- "$(dirname -- "$0")" && pwd)"
exec "$PREFIX/current/catjang-gnome" "$@"
LAUNCH
chmod 755 -- "$PREFIX/catjang"
mkdir -p -- "$DATA_HOME/applications"
python3 - "$PREFIX" "$DATA_HOME" <<'PY'
import sys
from pathlib import Path
prefix,data=map(Path,sys.argv[1:])
def quote(value):
    # Desktop Entry Exec quoting is separate from shell quoting.
    return '"'+str(value).replace('\\','\\\\').replace('"','\\"').replace('`','\\`').replace('$','\\$').replace('%','%%')+'"'
for name,label,argument in [('catjang-gnome','Catjang',''),('catjang-laboratorio','Catjang Laboratorio',' --laboratorio')]:
    text=f'[Desktop Entry]\nType=Application\nName={label}\nComment=Compañeros de escritorio para GNOME Wayland\nExec={quote(prefix/"catjang")}{argument}\nIcon={prefix/"current/resources/gnome/catjang-logo.png"}\nTerminal=false\nCategories=Utility;\nStartupNotify=true\n'
    (data/'applications'/f'{name}.desktop').write_text(text)
PY
if command -v update-desktop-database >/dev/null; then update-desktop-database "$DATA_HOME/applications" >/dev/null 2>&1 || true; fi
printf 'Instalado en %s\nAbre Catjang Laboratorio para probar las seis mascotas en un perfil separado.\nCierra y vuelve a iniciar sesión para cargar la extensión nueva.\n' "$PREFIX"
if [[ "$MODE" == gui ]]; then zenity --info --width=480 --title='Catjang instalado' --text='Instalación completa.\n\nCierra y vuelve a iniciar sesión para que GNOME cargue la extensión nueva. Después abre «Catjang Laboratorio» desde el menú y elige la mascota en Configuración o con clic derecho.\n\n«Catjang» conserva tu licencia y perfil habituales.'; fi
exit 0
__CATJANG_ARCHIVE_BELOW__
