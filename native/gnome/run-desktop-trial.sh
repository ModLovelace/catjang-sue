#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd -- "$BASE_DIR/../.." && pwd)"
UUID=catjang-native@modlovelace.github.io
if ! gnome-extensions info "$UUID" >/dev/null 2>&1; then
  printf 'GNOME todavía no reconoce la extensión instalada. Cierra sesión y vuelve a entrar; después repite este comando.\n' >&2
  exit 3
fi
gnome-extensions enable "$UUID"
ELECTRON_BIN="${CATJANG_ELECTRON_BIN:-$ROOT/node_modules/electron/dist/electron}"
TRIAL_RUNTIME="$ROOT/.tmp/gnome-prototype/desktop-trial/runtime"
PROFILE="$TRIAL_RUNTIME/config/Catjang"
# A separate demo profile; the user's normal Catjang license and settings stay intact.
ELECTRON_RUN_AS_NODE=1 "$ELECTRON_BIN" - "$ROOT" "$PROFILE" <<'JS'
const fs=require('node:fs'),path=require('node:path');
const root=process.argv[2],profile=process.argv[3];
fs.mkdirSync(profile,{recursive:true});
const license=path.join(profile,'license.json');
if(!fs.existsSync(license)){
 const endpoint=require(path.join(root,'prototype-license/endpoint.js'));
 endpoint.saveLicenseFile(license,endpoint.activate('CATJANG-PROTO-DEMO-1234-5678-9ABC-DEF0',{platform:'linux'}).record);
}
const settings=path.join(profile,'settings.json');
if(!fs.existsSync(settings))fs.writeFileSync(settings,JSON.stringify({mascot:'cat',petSize:200,catName:'Prueba GNOME',catNamePromptShown:true,agentOnboardingShown:true,agentIntegrationsEnabled:false,stretchIntervalMin:0}));
JS
exec env CATJANG_RUNTIME_DIR="$TRIAL_RUNTIME" CATJANG_LINUX_BACKEND=gnome CATJANG_ENABLE_AGENT_INTEGRATIONS=0 "$ROOT/run-linux.sh" "$@"
