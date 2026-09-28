#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
RUNTIME_DIR="${CATJANG_RUNTIME_DIR:-$BASE_DIR/runtime}"

mkdir -p "$RUNTIME_DIR/config" "$RUNTIME_DIR/cache" "$RUNTIME_DIR/data"

OZONE_ARGS=()
HAS_OZONE_PLATFORM=0
for arg in "$@"; do
  if [[ "$arg" == --ozone-platform=* ]]; then
    HAS_OZONE_PLATFORM=1
    break
  fi
done

# Electron cannot programmatically position a native Wayland toplevel. Use
# XWayland by default to retain the complete elastic drag and saved position.
# Native Wayland stays available as an explicit compatibility option.
if [[ "${XDG_SESSION_TYPE:-}" == "wayland" && "$HAS_OZONE_PLATFORM" == "0" && "${CATJANG_NATIVE_WAYLAND:-0}" != "1" ]]; then
  OZONE_ARGS+=(--ozone-platform=x11)
fi

SANDBOX_ARGS=()
if command -v unshare >/dev/null 2>&1 && ! unshare -Ur true 2>/dev/null; then
  SANDBOX_ARGS+=(--no-sandbox)
fi

# Find latest AppImage in dist/ if available
LATEST_APPIMAGE="$(ls -t "$BASE_DIR/dist/"Catjang-*.AppImage 2>/dev/null | head -n 1 || true)"
APPIMAGE="${CATJANG_APPIMAGE:-$LATEST_APPIMAGE}"

if [[ -n "${APPIMAGE:-}" && -x "$APPIMAGE" && "${CATJANG_DEV:-0}" != "1" ]]; then
  exec env \
    XDG_CONFIG_HOME="$RUNTIME_DIR/config" \
    XDG_CACHE_HOME="$RUNTIME_DIR/cache" \
    XDG_DATA_HOME="$RUNTIME_DIR/data" \
    "$APPIMAGE" "${OZONE_ARGS[@]}" "${SANDBOX_ARGS[@]}" "$@"
else
  ELECTRON_BIN="$BASE_DIR/node_modules/electron/dist/electron"
  if [[ ! -x "$ELECTRON_BIN" ]]; then
    ELECTRON_BIN="electron"
  fi
  exec env \
    XDG_CONFIG_HOME="$RUNTIME_DIR/config" \
    XDG_CACHE_HOME="$RUNTIME_DIR/cache" \
    XDG_DATA_HOME="$RUNTIME_DIR/data" \
    "$ELECTRON_BIN" "$BASE_DIR" "${OZONE_ARGS[@]}" "${SANDBOX_ARGS[@]}" "$@"
fi
