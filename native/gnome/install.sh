#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
UUID=catjang-native@modlovelace.github.io
if ! gnome-shell --version 2>/dev/null | grep -Eq '^GNOME Shell 50\.'; then
  printf 'Esta extensión requiere GNOME Shell 50.\n' >&2
  exit 2
fi
WAS_INSTALLED=false
if gnome-extensions info "$UUID" >/dev/null 2>&1; then WAS_INSTALLED=true; fi
python3 "$BASE_DIR/build.py" --application
ROOT="$(cd -- "$BASE_DIR/../.." && pwd)"
gnome-extensions install --force "$ROOT/.tmp/gnome-prototype/$UUID.shell-extension.zip"
if gnome-extensions enable "$UUID"; then
  if [[ "$WAS_INSTALLED" == true ]]; then
    printf 'Extensión actualizada. Cierra y vuelve a iniciar sesión para cargar el código nuevo; después inicia Catjang con npm run start:linux:gnome.\n'
  else
    printf 'Extensión preparada. Inicia Catjang con npm run start:linux:gnome.\n'
  fi
else
  printf 'Extensión instalada. Cierra y vuelve a iniciar tu sesión de GNOME; después ejecuta:\n  gnome-extensions enable %s\n  npm run start:linux:gnome\n' "$UUID" >&2
  exit 3
fi
