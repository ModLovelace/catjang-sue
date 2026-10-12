#!/usr/bin/env bash
set -euo pipefail
MODE="$1"
BASE_DIR="$2"
BUNDLE="$3"
export GNOME_SHELL_BUILDDIR="$BASE_DIR/test-runtime"
OPTIONS=(--headless)
# A private audio server with a null sink makes decoding/clock tests stable;
# it never probes or changes the user's hardware audio configuration.
export XDG_CONFIG_HOME="$XDG_RUNTIME_DIR/config"
export XDG_DATA_HOME="$XDG_RUNTIME_DIR/data"
export XDG_CACHE_HOME="$XDG_RUNTIME_DIR/cache"
mkdir -p -- "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "$XDG_CACHE_HOME"
pipewire > "$CATJANG_PROTOTYPE_OUTPUT/pipewire.log" 2>&1 &
PIPEWIRE_PID=$!
wireplumber --profile=policy > "$CATJANG_PROTOTYPE_OUTPUT/wireplumber.log" 2>&1 &
POLICY_PID=$!
pipewire-pulse > "$CATJANG_PROTOTYPE_OUTPUT/pulse.log" 2>&1 &
PULSE_PID=$!
trap 'kill "$PULSE_PID" "$POLICY_PID" "$PIPEWIRE_PID" 2>/dev/null || true; wait "$PULSE_PID" "$POLICY_PID" "$PIPEWIRE_PID" 2>/dev/null || true' EXIT
for ((attempt=0; attempt<50; attempt++)); do
  [[ -S "$XDG_RUNTIME_DIR/pipewire-0" && -S "$XDG_RUNTIME_DIR/pulse/native" ]] && break
  sleep .1
done
pw-cli create-node adapter '{ factory.name=support.null-audio-sink node.name=catjang-qa-null media.class=Audio/Sink object.linger=true audio.position=[ FL FR ] }' > "$CATJANG_PROTOTYPE_OUTPUT/null-audio.log" 2>&1
if [[ "$MODE" != --application ]]; then export PULSE_SERVER="unix:$XDG_RUNTIME_DIR/pulse/native"; fi
if [[ "$MODE" == --manual || "$MODE" == --application ]]; then
  OPTIONS+=(--wrap "$BASE_DIR/headless-devkit.sh")
fi
if [[ "$MODE" == --matrix ]]; then
  OPTIONS+=(--wrap "$BASE_DIR/headless-matrix.sh")
fi
gnome-shell-test-tool "${OPTIONS[@]}" \
  --extra-filter=io.github.ModLovelace.CatjangInputWitness \
  --extra-filter=catjang-bin --extra-filter=Catjang-bin \
  --extra-filter=catjang --extra-filter=Catjang --extra-filter=electron --extra-filter=Electron \
  --extension "$BUNDLE" "$BASE_DIR/probes/${MODE#--}.js"
