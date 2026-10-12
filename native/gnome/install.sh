#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
UUID=catjang-native@modlovelace.github.io
if ! gnome-shell --version 2>/dev/null | grep -Eq '^GNOME Shell 50\.'; then
  printf 'Esta extensión requiere GNOME Shell 50.\n' >&2
  exit 2
fi
python3 "$BASE_DIR/build.py" --application
ROOT="$(cd -- "$BASE_DIR/../.." && pwd)"
gnome-extensions install --force "$ROOT/.tmp/gnome-prototype/$UUID.shell-extension.zip"
if gnome-extensions enable "$UUID"; then
  printf 'Extensión preparada. Inicia Catjang con npm run start:linux:gnome.\n'
else
  printf 'Extensión instalada. Cierra y vuelve a iniciar tu sesión de GNOME; después ejecuta:\n  gnome-extensions enable %s\n  npm run start:linux:gnome\n' "$UUID" >&2
  exit 3
fi
