"use strict";

// Simulates platform branches on Linux. This does not certify native OS behavior.
const { app, BrowserWindow, ipcMain } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "catjang-platform-"));
app.setPath("userData", profile);
app.disableHardwareAcceleration();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const watchdog = setTimeout(() => { console.error("Platform isolation test timed out"); app.exit(1); }, 30000);

for (const [channel, value] of Object.entries({
  "mascot-get": "cat", "cat-name-get": "Catjang", "user-name-get": "",
  "fixed-message-get": "", "reminders-get": [], "pomodoro-get": {},
  "pattern-get": null, "language-get": "es", "task-complete-sound-volume-get": 0,
  "window-capabilities": { backend: "x11", supportsWindowShape: false },
})) ipcMain.handle(channel, () => value);

function checkWindowSequences(platform) {
  const source = fs.readFileSync(path.join(root, "main.js"), "utf8");
  const sequence = source.slice(source.indexOf("const STRETCH_DURATION_MS ="), source.indexOf("// ── App lifecycle"));
  const saved = { x: 50, y: 100, width: 500, height: 480 };
  const calls = [];
  const timers = [];
  const context = vm.createContext({
    IS_LINUX: false, IS_NATIVE_WAYLAND: false, stretchWin: null, gnomeController: null,
    petWin: { isDestroyed: () => false, getBounds: () => saved,
      setBounds: (bounds, animate) => calls.push({ bounds, animate }),
      setResizable: () => assert.fail(`${platform}: must preserve resizable=false`),
      webContents: { send: (channel) => calls.push({ channel }) } },
    screen: { getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }) },
    setTimeout: (callback, delay) => { timers.push({ callback, delay }); },
  });
  vm.runInContext(sequence, context);
  vm.runInContext("triggerStretchSequence()", context);
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), { bounds: { x: 474, y: 54, width: 972, height: 972 }, animate: true });
  assert.deepEqual(timers.map((t) => t.delay), [400, 3600]);
  timers[0].callback();
  assert.equal(calls[1].channel, "do-stretch");
  timers[1].callback();
  assert.deepEqual(calls[2], { bounds: saved, animate: true });
  assert.ok(!calls.some((call) => call.channel === "stretch-ended"));
  calls.length = 0; timers.length = 0;
  vm.runInContext("triggerPomodoroFocusStartSequence()", context);
  assert.equal(calls[0].animate, true);
  assert.deepEqual(timers.map((t) => t.delay), [160, 1400]);
  timers[1].callback();
  assert.deepEqual(calls[1], { bounds: saved, animate: true });
}

app.whenReady().then(async () => {
  // Keep a hidden owner so closing each test window does not end the process.
  const owner = new BrowserWindow({ show: false });
  for (const platform of ["win32", "darwin", "linux"]) {
    const linux = platform === "linux";
    const preload = path.join(profile, `preload-${platform}.js`);
    fs.writeFileSync(preload, fs.readFileSync(path.join(root, "preload.js"), "utf8")
      .replace("platform: process.platform", `platform: ${JSON.stringify(platform)}`));
    const win = new BrowserWindow({ width: 500, height: 480, show: false,
      webPreferences: { preload, contextIsolation: true, nodeIntegration: false } });
    // RAF must run while measuring the original Windows/macOS drag curves.
    // Wayland suspends frames in an unmapped window, even in a headless shell.
    win.webContents.setBackgroundThrottling(false);
    await win.loadFile(path.join(root, "renderer", "index.html"));
    win.showInactive();
    await wait(300);
    const run = (code) => win.webContents.executeJavaScript(code);
    const config = await run(`({ linux: IS_LINUX, distance: MAX_RAW_DIST_PX,
      hold: STRETCH_HOLD_MS, pupils: TRACKING_LAYERS.pupils.maxOffset,
      eyes: TRACKING_LAYERS.eyes.ids, body: TRACKING_LAYERS.body.ids })`);
    assert.deepEqual(config, { linux, distance: linux ? 240 : 400, hold: linux ? 260 : 1600,
      pupils: linux ? 2.2 : 1.6, eyes: linux ? ["eyes-js", "eye-left", "eye-right"] : ["eyes-js"],
      body: linux ? ["body", "idle-body"] : ["body"] });
    const capture = await run(`(() => {
      let captured = 0;
      dragHandle.setPointerCapture = () => captured++;
      dragHandle.releasePointerCapture = () => captured++;
      dragHandle.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerId: 1 }));
      dragHandle.dispatchEvent(new PointerEvent('pointerup', { button: 0, pointerId: 1 }));
      return captured;
    })()`);
    assert.equal(capture, linux ? 2 : 0);
    const eyeMoved = await run(`(() => {
      targetDx = 0; targetDy = 0;
      const rect = currentPoseElement().getBoundingClientRect();
      updatePointerEyeTracking({ clientX: rect.right, clientY: rect.top });
      return targetDx !== 0 || targetDy !== 0;
    })()`);
    assert.equal(eyeMoved, linux);
    // Load the drag SVG before measuring the curve, independent of Chromium's
    // lazy loading of hidden objects and the original missing-SVG behavior.
    await run("stretchEndObj.style.setProperty('display', 'block', 'important'); stretchEndObj.style.visibility = 'hidden';");
    await wait(200);
    await run("stretchEndObj.style.removeProperty('display'); stretchEndObj.style.removeProperty('visibility'); beginDragStretch({screenX:200,screenY:200});");
    await wait(1800);
    const stretch = await run("({ ready: !!endData, value: stretchT })");
    assert.equal(stretch.ready, true);
    assert.ok(Math.abs(stretch.value - (linux ? 1 : 0.32)) < 0.001, `${platform}: drag curve ${stretch.value}`);
    await run("cancelDragStretchState(); applyMascot('peruperro');");
    await wait(200);
    const dogRelease = await run(`(() => {
      beginDragStretch({screenX:200,screenY:200}); pendulumAngle = 25;
      finishDragStretch(false); const result = { releasing, draggingClass: document.body.classList.contains('dragging') };
      cancelDragStretchState(); return result;
    })()`);
    assert.deepEqual(dogRelease, { releasing: linux, draggingClass: linux });
    const stretchLayout = await run(`(() => {
      document.body.dataset.stretching = 'ing';
      const style = getComputedStyle(currentStretchElement());
      const result = { width: currentStretchElement().getBoundingClientRect().width,
        viewport: innerWidth, maxWidth: style.maxWidth };
      delete document.body.dataset.stretching; return result;
    })()`);
    assert.ok(Math.abs(stretchLayout.width - stretchLayout.viewport * (linux ? 0.85 : 0.771)) < 1,
      `${platform}: stretch must retain its platform's dimensions`);
    assert.equal(stretchLayout.maxWidth === "none", !linux, `${platform}: fullscreen CSS must be Linux-only`);
    if (!linux) checkWindowSequences(platform);
    console.log(`PASS ${platform}: isolated tracking, pointer capture, drag, stretch CSS and window sequences`);
    win.destroy();
  }
  owner.destroy();
  clearTimeout(watchdog);
  app.quit();
}).catch((error) => { console.error(error); clearTimeout(watchdog); app.exit(1); });
