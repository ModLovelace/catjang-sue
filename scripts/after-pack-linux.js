"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

module.exports = async function afterPackLinux(context) {
  if (context.electronPlatformName !== "linux") return;
  const executableName = context.packager.executableName;
  const executable = path.join(context.appOutDir, executableName);
  await fs.rename(executable, `${executable}-bin`);
  // Keep the public executable name used by .desktop, .deb and AppRun. The
  // renamed Electron binary remains beside resources and its native libraries.
  await fs.writeFile(executable, `#!/usr/bin/env bash
set -euo pipefail
EXECUTABLE="$(readlink -f -- "$0")"
BASE_DIR="$(dirname -- "$EXECUTABLE")"
source "$BASE_DIR/resources/linux-backend.sh"
catjang_select_backend "$@"
exec "$EXECUTABLE-bin" "\${OZONE_ARGS[@]}" "$@"
`, { mode: 0o755 });
};
