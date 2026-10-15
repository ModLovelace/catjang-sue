#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:---manual}"
case "$MODE" in
  --manual|--verify|--application|--integration|--matrix|--performance|--reference|--refine|--isolation|--features|--hunting|--mascots|--agents|--autoconnect|--context) ;;
  *) printf 'Usage: %s [--manual|--verify|--application|--integration|--matrix|--performance|--reference|--refine|--isolation|--features|--hunting|--mascots|--agents|--autoconnect|--context]\n' "$0" >&2; exit 2 ;;
esac
UUID=catjang-prototype@modlovelace.github.io
if [[ "$MODE" == --autoconnect || "$MODE" == --context || "$MODE" == --agents || "$MODE" == --application || "$MODE" == --integration || "$MODE" == --matrix || "$MODE" == --performance || "$MODE" == --reference || "$MODE" == --refine || "$MODE" == --isolation || "$MODE" == --features || "$MODE" == --hunting || "$MODE" == --mascots ]]; then
  python3 "$BASE_DIR/build.py" --application
  UUID=catjang-native@modlovelace.github.io
else
  python3 "$BASE_DIR/build.py"
fi
ROOT="$(cd -- "$BASE_DIR/../.." && pwd)"
export CATJANG_GNOME_PROJECT="$ROOT"
export CATJANG_GNOME_ELECTRON="${CATJANG_ELECTRON_BIN:-$ROOT/node_modules/electron/dist/electron}"
export CATJANG_PROTOTYPE_WITNESS="$BASE_DIR/probes/witness.py"
BUILD_OUTPUT="$ROOT/.tmp/gnome-prototype"
export CATJANG_PROTOTYPE_OUTPUT="$BUILD_OUTPUT/${MODE#--}"
mkdir -p -- "$CATJANG_PROTOTYPE_OUTPUT"
if [[ "$MODE" == --manual || "$MODE" == --application ]]; then
  DEFAULT_VIEWER=/usr/libexec/mutter-devkit
  if [[ ! -x "$DEFAULT_VIEWER" ]]; then
    DEFAULT_VIEWER="$BUILD_OUTPUT/viewer-runtime/extracted/usr/libexec/mutter-devkit"
  fi
  export CATJANG_PROTOTYPE_VIEWER="${CATJANG_PROTOTYPE_VIEWER:-$DEFAULT_VIEWER}"
  if [[ ! -x "$CATJANG_PROTOTYPE_VIEWER" ]]; then
    printf 'Falta mutter-devkit. Consulta native/gnome/README.md para usar un visor local.\n' >&2
    exit 2
  fi
else
  rm -f -- "$CATJANG_PROTOTYPE_OUTPUT/context-observations.json" "$CATJANG_PROTOTYPE_OUTPUT/native-observations.json" "$CATJANG_PROTOTYPE_OUTPUT/application-observations.json" "$CATJANG_PROTOTYPE_OUTPUT/matrix-observations.json" "$CATJANG_PROTOTYPE_OUTPUT/performance.json" "$CATJANG_PROTOTYPE_OUTPUT/refined-observations.json" "$CATJANG_PROTOTYPE_OUTPUT/electron-reference.json" "$CATJANG_PROTOTYPE_OUTPUT/isolation.json" "$CATJANG_PROTOTYPE_OUTPUT/features-observations.json" "$CATJANG_PROTOTYPE_OUTPUT/hunting-observations.json" "$CATJANG_PROTOTYPE_OUTPUT/mascot-observations.json"
fi
# The tool installs/enables ONLY in its temporary XDG profile on a private bus.
# The current desktop's extension list and Electron profile are not changed.
# Isolate Mutter's sockets and crash-guard files too. An absolute parent
# socket still lets devkit open its preview on the existing Wayland desktop.
PARENT_RUNTIME="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
# Only the physical application review plays through the existing audio server.
# Automated probes continue with private runtime/audio diagnostics.
if [[ "$MODE" == --application && -S "$PARENT_RUNTIME/pulse/native" ]]; then
  export PULSE_SERVER="${PULSE_SERVER:-unix:$PARENT_RUNTIME/pulse/native}"
fi
PARENT_DISPLAY="${WAYLAND_DISPLAY:-wayland-0}"
if [[ "$PARENT_DISPLAY" != /* ]]; then
  PARENT_DISPLAY="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/$PARENT_DISPLAY"
fi
PROTOTYPE_RUNTIME="$(mktemp -d /tmp/catjang-gnome-runtime.XXXXXX)"
trap 'rm -rf -- "$PROTOTYPE_RUNTIME"' EXIT
export XDG_RUNTIME_DIR="$PROTOTYPE_RUNTIME"
export WAYLAND_DISPLAY="$PARENT_DISPLAY"
export CATJANG_PROTOTYPE_PARENT_DISPLAY="$PARENT_DISPLAY"
export GTK_IM_MODULE=simple
export GTK_A11Y=none
export NO_AT_BRIDGE=1
dbus-run-session --config-file="$BASE_DIR/private-bus.conf" -- \
  "$BASE_DIR/session.sh" "$MODE" "$BASE_DIR" \
  "${CATJANG_GNOME_TEST_BUNDLE:-$BUILD_OUTPUT/$UUID.shell-extension.zip}"
