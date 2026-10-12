#!/usr/bin/env bash
set -euo pipefail
# GNOME 50 exposes fractional scales without an experimental setting.
ARGS=()
for argument in "$@"; do
  if [[ "$argument" == 1280x720 ]]; then argument=2880x1800; fi
  ARGS+=("$argument")
done
exec "${ARGS[@]}" --virtual-monitor 1920x1080
