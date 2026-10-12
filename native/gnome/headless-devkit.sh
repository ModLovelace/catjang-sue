#!/usr/bin/env bash
set -euo pipefail
# Enable the official devkit API, with its automatic viewer launch suppressed.
# manual.js starts the selected viewer from a local path on the parent display.
exec "$@" --devkit
