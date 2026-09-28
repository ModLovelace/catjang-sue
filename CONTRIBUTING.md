# Contributing

Thank you for helping with the community Linux and Wayland adaptation of
Catjang. The source repository from which this work was derived is archived,
so development happens in this community fork and is not an official Comnyang
project.

## Before opening a change

- Read [`NOTICE.md`](NOTICE.md), [`License.md`](License.md), and
  [`LINUX-WAYLAND.md`](LINUX-WAYLAND.md).
- Keep the work non-commercial and retain attribution to **jan (nerfspeed on
  Discord)** under CC BY-NC 4.0.
- Identify substantial modifications in the pull request and update the change
  notice when authorship or scope changes materially.
- Do not commit generated packages, `node_modules/`, or the local `runtime/`
  directory.

## Local checks

Use a supported Node.js release and run:

```bash
npm ci
npm audit --omit=optional
node --check main.js
node --check preload.js
node --check renderer/renderer.js
node --check editor/editor.js
bash -n run-linux.sh
```

On systems where AppArmor blocks Electron's sandbox setup, CI and local source
diagnostics use `npm run smoke -- --no-sandbox --ozone-platform=x11`. This is a
test-only workaround, not release approval.

On Linux, test both backends when the change affects input, movement, window
shape, rendering, or startup:

```bash
./run-linux.sh
CATJANG_NATIVE_WAYLAND=1 ./run-linux.sh
```

Record the desktop environment, session type, Electron version, and whether
the test used source mode or an AppImage.

## Security and release policy

Global input monitoring and editor/agent integrations must remain opt-in. Avoid
adding writes outside the isolated runtime unless the user explicitly enables
the relevant integration.

Keep `uiohook-napi` optional. Do not reintroduce an unconditional native-module
rebuild in `postinstall`: it makes `npm ci` fail on Linux systems without X11
development headers even though the application can run without the hook.

Do not publish the currently produced AppImage as a general-purpose binary. On
the validated Ubuntu 26.04/AppArmor setup, electron-builder's AppImage launcher
falls back to `--no-sandbox`, which disables Chromium's renderer sandbox. A
future binary release requires a verified sandboxed startup and should include
the source revision, test matrix, and SHA-256 checksum.

## Pull requests

Keep commits focused where practical. Explain behavior changes, security or
privacy impact, tests performed, and limitations that remain. Screenshots or a
short recording are useful for changes to dragging, petting, shaped input, and
the pattern editor.
