#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
APPIMAGE="${CATJANG_APPIMAGE:-$BASE_DIR/dist/Catjang-0.1.38.AppImage}"
RUNTIME_DIR="${CATJANG_RUNTIME_DIR:-$BASE_DIR/runtime}"

if [[ ! -x "$APPIMAGE" ]]; then
  printf 'Catjang AppImage was not found or is not executable: %s\n' "$APPIMAGE" >&2
  printf '%s\n' 'Build it first with: npm ci && npm run dist:linux' >&2
  exit 1
fi

if command -v unshare >/dev/null 2>&1 && ! unshare -Ur true 2>/dev/null; then
  printf '%s\n' \
    'WARNING: unprivileged user namespaces are blocked on this system.' \
    'The AppImage launcher may start Electron with --no-sandbox, which disables' \
    "Chromium's renderer sandbox. Use this build only for local testing." >&2
fi

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

exec env \
  XDG_CONFIG_HOME="$RUNTIME_DIR/config" \
  XDG_CACHE_HOME="$RUNTIME_DIR/cache" \
  XDG_DATA_HOME="$RUNTIME_DIR/data" \
  "$APPIMAGE" "${OZONE_ARGS[@]}" "$@"
