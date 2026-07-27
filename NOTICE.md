# Attribution and community change notice

Catjang is licensed under the Creative Commons Attribution-NonCommercial 4.0
International license (`CC BY-NC 4.0`). The original author and required
attribution party is **jan (nerfspeed on Discord)**.

This repository is based on the archived
[`cloud9209/catjang-sue`](https://github.com/cloud9209/catjang-sue) prototype,
which was itself published as a fork of `jandev-png/catjang`. The latter is no
longer publicly available at its former GitHub URL.

## Community modifications

The Linux/Wayland adaptation was prepared in July 2026 by
**Enrique Rafael Becerra Bocangel (`@Mod-zZz`)** as a non-commercial community
contribution. The modifications include:

- XWayland-by-default startup on Wayland desktops;
- an optional native Wayland mode using compositor-owned draggable regions;
- Linux shaped-window input so transparent areas remain click-through without
  disabling mouse input on the pet and its controls;
- drag, petting, SVG lazy-load, context-menu, and position-handling fixes;
- Ubuntu 26.04/Electron 43 rendering compatibility adjustments;
- opt-in global input and editor/agent integrations for safer testing;
- Linux AppImage packaging updates and an isolated launcher;
- a complete Spanish interface and Spanish defaults for the test build.

These changes do not imply endorsement by the original author or the archived
fork owner. This is not an official Comnyang or Catjang release.

## Windows compatibility branch

The `feature/windows-compatibility` branch adds reproducible Windows x64
development and packaging support, including an NVM for Windows Node.js policy,
Windows CI, NSIS packaging, the Windows application icon, and platform-scoped
global input behavior. Its full scope and validation record are maintained in
[`WINDOWS-COMPATIBILITY-PLAN.md`](WINDOWS-COMPATIBILITY-PLAN.md).

This work preserves the same CC BY-NC 4.0 attribution and non-commercial
conditions. It does not relicense the inherited source code or represent the
project as an OSI Open Source project.

Redistribution must remain non-commercial, preserve attribution, link the
license, retain an indication that the material was modified, and avoid adding
legal or technological restrictions that conflict with CC BY-NC 4.0. See
[`License.md`](License.md) for the repository license text.
