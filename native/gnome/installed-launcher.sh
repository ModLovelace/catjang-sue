#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="$(cd -- "$(dirname -- "$(readlink -f -- "$0")")" && pwd)"
UUID=catjang-native@modlovelace.github.io
if [[ "${XDG_SESSION_TYPE:-}" != wayland ]] || [[ "$(gnome-shell --version 2>/dev/null || true)" != 'GNOME Shell 50.'* ]]; then
  message='Esta versión nativa necesita Wayland y GNOME Shell 50.'
  if command -v zenity >/dev/null; then zenity --error --title=Catjang --text="$message"; else printf '%s\n' "$message" >&2; fi
  exit 2
fi
info="$(LC_ALL=C gnome-extensions info "$UUID" 2>/dev/null || true)"
version="$(printf '%s\n' "$info" | awk '/^[[:space:]]*Version:/ {print $2; exit}')"
# v2/v3 can attach Catjang. The bridge negotiates newer controls/catalog,
# so an extension waiting for a session reload must not block the entire app.
if [[ ! "$version" =~ ^[0-9]+$ ]] || (( 10#$version < 2 )); then
  message='La extensión de Catjang está instalada, pero GNOME debe cargar su versión nueva. Cierra y vuelve a iniciar sesión; después abre Catjang desde el menú.'
  if command -v zenity >/dev/null; then zenity --info --title=Catjang --text="$message"; else printf '%s\n' "$message" >&2; fi
  exit 3
fi
gnome-extensions enable "$UUID"
export CATJANG_IDE_CONFIG_HOME="${CATJANG_IDE_CONFIG_HOME:-${XDG_CONFIG_HOME:-$HOME/.config}}"
if [[ "${1:-}" == --laboratorio ]]; then
  shift
  TRIAL_RUNTIME="${XDG_DATA_HOME:-$HOME/.local/share}/catjang-laboratorio/runtime"
  PROFILE="$TRIAL_RUNTIME/config/Catjang"
  mkdir -p -- "$TRIAL_RUNTIME/config" "$TRIAL_RUNTIME/cache" "$TRIAL_RUNTIME/data"
  # Use the existing public demo activation endpoint, never bypass validation.
  ELECTRON_RUN_AS_NODE=1 "$BASE_DIR/catjang-bin" - "$BASE_DIR/resources/app.asar" "$PROFILE" <<'JS'
const fs=require('node:fs'),path=require('node:path');
const root=process.argv[2],profile=process.argv[3];fs.mkdirSync(profile,{recursive:true});
const license=path.join(profile,'license.json');
if(!fs.existsSync(license)){
 const endpoint=require(path.join(root,'prototype-license/endpoint.js'));
 endpoint.saveLicenseFile(license,endpoint.activate('CATJANG-PROTO-DEMO-1234-5678-9ABC-DEF0',{platform:'linux'}).record);
}
const settings=path.join(profile,'settings.json');
if(!fs.existsSync(settings))fs.writeFileSync(settings,JSON.stringify({mascot:'cat',petSize:200,catName:'Catjang',catNamePromptShown:true,agentOnboardingShown:true,agentIntegrationsEnabled:false,stretchIntervalMin:0}));
JS
  export XDG_CONFIG_HOME="$TRIAL_RUNTIME/config" XDG_CACHE_HOME="$TRIAL_RUNTIME/cache" XDG_DATA_HOME="$TRIAL_RUNTIME/data"
  # The demo starts opted out; users may connect IDEs explicitly in Settings.
fi
SANDBOX_ARGS=()
if command -v unshare >/dev/null && ! unshare -Ur true 2>/dev/null; then SANDBOX_ARGS+=(--no-sandbox); fi
exec env CATJANG_LINUX_BACKEND=gnome "$BASE_DIR/catjang-bin" --ozone-platform=wayland "${SANDBOX_ARGS[@]}" "$@"
