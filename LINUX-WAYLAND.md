# Linux and Wayland community port

This document describes the experimental Linux/Wayland adaptation of the
archived Catjang prototype. It is a community build, not an official Comnyang
release.

## Supported launch modes

### XWayland (recommended)

On a Wayland desktop, `run-linux.sh` adds `--ozone-platform=x11` unless the
caller already selected a backend. XWayland is the recommended mode because it
retains global cursor coordinates, full elastic dragging, saved window
position, petting reactions, and shaped click-through input.

```bash
./run-linux.sh
```

### Native Wayland (experimental)

```bash
CATJANG_NATIVE_WAYLAND=1 ./run-linux.sh
```

Native Wayland delegates movement to the compositor with `app-region: drag`.
The head contains a small `no-drag` region for petting; drag the rest of the
body to move the pet. Wayland intentionally hides global toplevel coordinates,
so Catjang cannot persist its final position or reproduce every X11 cursor
effect in this mode.

## Build

```bash
npm ci
npm run dist:linux
```

When AppArmor blocks Electron's sandbox setup, a source smoke test also needs
the same explicit local-only diagnostic workaround used by CI:

```bash
npm run smoke -- --no-sandbox --ozone-platform=x11
npm run smoke -- --no-sandbox --ozone-platform=wayland
```

Do not treat a successful `--no-sandbox` smoke test as release approval.

The AppImage is written to `dist/` and is intentionally ignored by Git.

## Isolated runtime

The launcher redirects Electron state to the ignored `runtime/` directory:

```text
runtime/config
runtime/cache
runtime/data
```

Override these paths when needed:

```bash
CATJANG_APPIMAGE=/path/to/Catjang.AppImage \
CATJANG_RUNTIME_DIR=/path/to/runtime \
./run-linux.sh
```

## Input and transparent regions

Electron does not implement forwarded ignored-mouse events on Linux. Catjang
therefore keeps mouse input enabled and uses `BrowserWindow.setShape()` to
restrict the native window to the visible pet, buttons, bubbles, editors, and
panels. This keeps Catjang interactive without blocking applications beneath
the transparent part of its 500 x 480 canvas.

## Security defaults

Global input monitoring and editor/agent integrations are disabled by default.
They may read global input, edit editor configuration, or read session logs.
Opt in only after reviewing the relevant code:

```bash
CATJANG_ENABLE_GLOBAL_INPUT=1 ./run-linux.sh
CATJANG_ENABLE_AGENT_INTEGRATIONS=1 ./run-linux.sh
```

`uiohook-napi` is optional. If it fails to build, the application still starts
without global typing and wheel reactions.

On the tested Ubuntu 26.04 installation, AppArmor blocks unprivileged user
namespaces. The electron-builder AppImage launcher detects that condition and
starts Electron with `--no-sandbox`; the renderer process was verified to have
the same switch. This disables Chromium's renderer sandbox. `run-linux.sh`
prints a warning when it detects the restriction but does not add the switch
itself.

For that reason, the current AppImage is suitable only for local experimental
testing with the corresponding source available. Do not publish it as a
general-purpose binary release until the AppImage can start with Chromium's
sandbox enabled. The Git branch and source changes can still be shared for
review and further development.

## Rendering

Hardware acceleration and Vulkan are disabled when the desktop session is
Wayland because Electron 43 produced unstable GPU surface errors on the tested
Ubuntu 26.04 system. The renderer therefore primarily uses CPU and system RAM;
the desktop compositor may still use the GPU for final composition.

## Validation matrix

Tested on Ubuntu 26.04 LTS, GNOME Wayland, x86-64:

| Check | XWayland | Native Wayland |
| --- | --- | --- |
| Source smoke startup (`--no-sandbox`) | Pass | Pass |
| AppImage smoke startup | Pass | Pass |
| Full packaged UI startup | Pass | Pass |
| Shaped click-through regions | Pass | Pass |
| Pet and controls retain mouse input | Pass | Pass |
| Reminder/task panel opens | Pass | Pass |
| Petting state activates | Pass | Pass |
| Drag animation activates | Pass | Pass, compositor driven |
| Saved global position | Pass | Not available by protocol |

The final locally validated AppImage was built from source revision
`0c1cdcb669a41072e12a27dbb9dfe76c942da9d5`, was 127824100 bytes, and had
SHA-256:

```text
c501e4c643f0cabcf7b9c07d1dbf15d20b492b0db17b6e5aca5efb052734c759
```

Generated binaries are reproducibility aids, not source-controlled files. Do
not publish the currently validated AppImage because of the sandbox limitation
described above. Any future sandboxed community binary should include the exact
source revision and checksum.

## Known limitations

- Native Wayland cannot expose or save global window coordinates.
- Native global typing hooks remain environment-dependent.
- Agent integrations were not enabled during the Linux validation because they
  modify personal editor configuration and read local session logs.
- Electron's Linux shaped-window API is experimental and should be retested
  after Electron upgrades or desktop-compositor changes.
- On the tested Ubuntu/AppArmor configuration, electron-builder's AppImage
  launcher falls back to `--no-sandbox`; this must be resolved before a binary
  release.
- This branch retains the prototype license flow and is not connected to a
  production payment backend.

## Attribution

See [`NOTICE.md`](NOTICE.md) and [`License.md`](License.md). This adaptation is
non-commercial and must not be represented as an official release.
