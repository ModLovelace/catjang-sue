"use strict";

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const assert = require("assert");

// Test 1: Static SVG Keyboards audit
console.log("=== AUDITING STATIC SVG KEYBOARDS FOR PERUPERRO ===");

const pressLeftSvg = fs.readFileSync(path.join(__dirname, "..", "svg", "peruperro", "press-left.svg"), "utf8");
const pressRightSvg = fs.readFileSync(path.join(__dirname, "..", "svg", "peruperro", "press-right.svg"), "utf8");

// In press-left.svg: left key down (y=33), right key up (y=29)
assert(pressLeftSvg.includes('d="M4 33V32H5V31H18V32H19V35H18V38H17V40H16V42H1V41H0V39H1V37H2V35H3V33H4Z"'), "press-left.svg must have left keyboard pressed down at y=33");
assert(pressLeftSvg.includes('d="M24 29V28H25V27H38V28H39V31H38V34H37V36H36V38H21V37H20V35H21V33H22V31H23V29H24Z"'), "press-left.svg must have right keyboard raised at y=29");
assert(pressLeftSvg.includes('fill="#222222"'), "press-left.svg must contain 3D key shadow #222222");
assert(pressLeftSvg.includes('data-heat-overlay="true"'), "press-left.svg must contain data-heat-overlay attributes");
console.log("  [PASS] press-left.svg: Left key down at 33, right key up at 29, 3D shadows & heat overlays present.");

// In press-right.svg: right key down (y=33), left key up (y=29)
assert(pressRightSvg.includes('d="M24 33V32H25V31H38V32H39V35H38V38H37V40H36V42H21V41H20V39H21V37H22V35H23V33H24Z"'), "press-right.svg must have right keyboard pressed down at y=33");
assert(pressRightSvg.includes('d="M4 29V28H5V27H18V28H19V31H18V34H17V36H16V38H1V37H0V35H1V33H2V31H3V29H4Z"'), "press-right.svg must have left keyboard raised at y=29");
assert(pressRightSvg.includes('fill="#222222"'), "press-right.svg must contain 3D key shadow #222222");
assert(pressRightSvg.includes('data-heat-overlay="true"'), "press-right.svg must contain data-heat-overlay attributes");
console.log("  [PASS] press-right.svg: Right key down at 33, left key up at 29, 3D shadows & heat overlays present.");

// Test 2: Drag SVG audit
const dragSvg = fs.readFileSync(path.join(__dirname, "..", "svg", "peruperro", "drag.svg"), "utf8");
assert(dragSvg.includes(".dangle-body"), "drag.svg must have .dangle-body swinging animation");
assert(dragSvg.includes("peru-dangle-front-l"), "drag.svg must have front leg swing");
assert(dragSvg.includes("peru-dangle-tail"), "drag.svg must have tail swing");
assert(dragSvg.includes('data-heat-overlay="true"'), "drag.svg must contain data-heat-overlay");
console.log("  [PASS] drag.svg: Dynamic swinging body, legs, tail animations & heat overlays present.");

// Test 3: Runtime verification in Electron
app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 320,
    height: 320,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  let currentMascot = "peruperro";
  ipcMain.handle("mascot-get", () => currentMascot);
  ipcMain.on("mascot-set", (_evt, m) => {
    currentMascot = m;
    win.webContents.send("mascot-changed", m);
  });
  ipcMain.handle("window-capabilities", () => ({
    backend: "x11",
    nativeWayland: false,
    supportsProgrammaticMove: true,
  }));
  ipcMain.handle("cat-name-get", () => "Chuño");
  ipcMain.handle("cat-name-prompt-shown", () => true);
  ipcMain.handle("user-name-get", () => "");
  ipcMain.handle("fixed-message-get", () => "");
  ipcMain.handle("reminders-get", () => []);
  ipcMain.handle("pomodoro-get", () => ({ active: false }));
  ipcMain.handle("pattern-get", () => null);
  ipcMain.handle("language-get", () => "es");
  ipcMain.handle("task-complete-sound-volume-get", () => 0.1);

  await win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  await new Promise((r) => setTimeout(r, 600));

  console.log("\n=== RUNTIME ELECTRON AUDIT FOR CHUÑO ===");

  const runtimeResults = await win.webContents.executeJavaScript(`
    (async () => {
      applyMascot("peruperro");
      await new Promise(r => setTimeout(r, 200));

      const idleObj = document.getElementById("peruperro");
      const idleDoc = idleObj ? idleObj.contentDocument : null;
      const idleHeatOverlays = idleDoc ? idleDoc.querySelectorAll(".heat-overlay") : [];

      ensureSvgObjectReady("peruperro-press-left");
      const pressLeftObj = document.getElementById("peruperro-press-left");
      const doc = pressLeftObj ? pressLeftObj.contentDocument : null;
      if (doc) installHeatOverlays(doc);
      const heatOverlays = doc ? doc.querySelectorAll(".heat-overlay") : [];

      // Test heat overlay installation
      const hasHeatOverlays = heatOverlays.length > 0 || idleHeatOverlays.length > 0;

      // Simulate typing heat tick
      setHeatOverlayAllSvgs("#dc2828", "0.650", "0.650");
      const targetDoc = doc || idleDoc;
      const rootOpacity = targetDoc && targetDoc.documentElement ? targetDoc.documentElement.style.getPropertyValue("--legacy-heat-overlay-opacity") : null;
      const rootColor = targetDoc && targetDoc.documentElement ? targetDoc.documentElement.style.getPropertyValue("--heat-overlay-color") : null;

      // Test hit point test across Chuño
      const r = (doc ? pressLeftObj : idleObj).getBoundingClientRect();
      const hitCenter = isCatHitPoint(r.left + r.width * 0.5, r.top + r.height * 0.5);
      const hitTop = isCatHitPoint(r.left + r.width * 0.5, r.top + r.height * 0.25);

      // The dedicated Chuño drag sprite must survive animation frames. This
      // regresses the bug where cat-only chainTick removed the dragging class
      // immediately for every non-cat mascot.
      beginDragStretch(
        { screenX: 100, screenY: 100 },
        { screenX: 108, screenY: 108 },
      );
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const dragActiveAfterFrames = document.body.classList.contains("dragging");
      const dragDisplayAfterFrames = getComputedStyle(document.getElementById("peruperro-drag")).display;
      finishDragStretch(false);

      return {
        hasHeatOverlays,
        overlayCount: (heatOverlays.length || idleHeatOverlays.length),
        rootOpacity,
        rootColor,
        hitCenter,
        hitTop,
        dragActiveAfterFrames,
        dragDisplayAfterFrames,
      };
    })()
  `);

  console.log("  Runtime heat overlays installed:", runtimeResults.hasHeatOverlays, `(${runtimeResults.overlayCount} overlays)`);
  assert(runtimeResults.hasHeatOverlays, "Chuño SVGs must receive heat overlays");
  console.log("  Runtime heat opacity:", runtimeResults.rootOpacity, "color:", runtimeResults.rootColor);
  assert.strictEqual(runtimeResults.rootOpacity, "0.650", "Heat overlay opacity must reflect currentHeat");
  assert.strictEqual(runtimeResults.rootColor, "#dc2828", "Heat overlay color must be red #dc2828");
  console.log("  Runtime hit testing: center =", runtimeResults.hitCenter, "top =", runtimeResults.hitTop);
  assert(runtimeResults.hitCenter && runtimeResults.hitTop, "Hit testing must cover center and top of mascot");
  console.log("  Runtime drag after two frames:", runtimeResults.dragActiveAfterFrames, "display:", runtimeResults.dragDisplayAfterFrames);
  assert(runtimeResults.dragActiveAfterFrames, "Chuño dragging state must survive animation frames until mouseup");
  assert.strictEqual(runtimeResults.dragDisplayAfterFrames, "block", "Chuño dedicated drag sprite must stay visible while dragging");

  console.log("=== ALL PERUPERRO SPECIFIC TESTS PASSED! ===");
  app.exit(0);
});
