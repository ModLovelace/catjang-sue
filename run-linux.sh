#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${CATJANG_RUNTIME_DIR:-$BASE_DIR/runtime}"

mkdir -p "$RUNTIME_DIR/config" "$RUNTIME_DIR/cache" "$RUNTIME_DIR/data"

source "$BASE_DIR/scripts/linux-backend.sh"
catjang_select_backend "$@"

SANDBOX_ARGS=()
if command -v unshare >/dev/null 2>&1 && ! unshare -Ur true 2>/dev/null; then
  SANDBOX_ARGS+=(--no-sandbox)
fi

# By default, run repository source with local Electron so working tree changes take effect immediately.
# Set CATJANG_USE_APPIMAGE=1 only if you explicitly want to run the pre-built AppImage in dist/.
ELECTRON_BIN="${CATJANG_ELECTRON_BIN:-$BASE_DIR/node_modules/electron/dist/electron}"
if [[ ! -x "$ELECTRON_BIN" ]]; then
  ELECTRON_BIN="electron"
fi

LATEST_APPIMAGE="$(ls -t "$BASE_DIR/dist/"Catjang-*.AppImage 2>/dev/null | head -n 1 || true)"
APPIMAGE="${CATJANG_APPIMAGE:-$LATEST_APPIMAGE}"

if [[ "${CATJANG_USE_APPIMAGE:-0}" == "1" && -n "${APPIMAGE:-}" && -x "$APPIMAGE" ]]; then
  exec env \
    XDG_CONFIG_HOME="$RUNTIME_DIR/config" \
    XDG_CACHE_HOME="$RUNTIME_DIR/cache" \
    XDG_DATA_HOME="$RUNTIME_DIR/data" \
    "$APPIMAGE" "${OZONE_ARGS[@]}" "${SANDBOX_ARGS[@]}" "$@"
else
  exec env \
    XDG_CONFIG_HOME="$RUNTIME_DIR/config" \
    XDG_CACHE_HOME="$RUNTIME_DIR/cache" \
    XDG_DATA_HOME="$RUNTIME_DIR/data" \
    "$ELECTRON_BIN" "$BASE_DIR" "${OZONE_ARGS[@]}" "${SANDBOX_ARGS[@]}" "$@"
fi
