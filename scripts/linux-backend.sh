#!/usr/bin/env bash

# Shared by the source launcher and packaged Linux executable. Ozone must be
# selected on the command line before Electron initializes its native windows.
catjang_select_backend() {
  OZONE_ARGS=()
  local arg
  if [[ "${CATJANG_LINUX_BACKEND:-classic}" == "gnome" ]]; then
    if [[ "${XDG_SESSION_TYPE:-}" != "wayland" ]] || [[ "$(gnome-shell --version 2>/dev/null || true)" != "GNOME Shell 50."* ]]; then
      printf 'El backend nativo requiere una sesión Wayland con GNOME Shell 50.\n' >&2
      return 2
    fi
    local explicit_ozone="" expect_ozone=0
    for arg in "$@"; do
      if [[ "$expect_ozone" == 1 ]]; then
        explicit_ozone="$arg"
        expect_ozone=0
        continue
      fi
      case "$arg" in
        --ozone-platform) expect_ozone=1 ;;
        --ozone-platform=*) explicit_ozone="${arg#*=}" ;;
      esac
    done
    if [[ "$expect_ozone" == 1 ]] || [[ -n "$explicit_ozone" && "$explicit_ozone" != wayland ]]; then
      printf 'El backend GNOME requiere --ozone-platform=wayland.\n' >&2
      return 2
    fi
    if [[ -z "$explicit_ozone" ]]; then OZONE_ARGS+=(--ozone-platform=wayland); fi
    return
  fi
  for arg in "$@"; do
    case "$arg" in
      --ozone-platform|--ozone-platform=*) return ;;
    esac
  done
  if [[ "${XDG_SESSION_TYPE:-}" == "wayland" ]]; then
    if [[ "${CATJANG_NATIVE_WAYLAND:-0}" == "1" ]]; then
      OZONE_ARGS+=(--ozone-platform=wayland --enable-features=WaylandWindowDecorations)
    else
      OZONE_ARGS+=(--ozone-platform=x11)
    fi
  fi
}
