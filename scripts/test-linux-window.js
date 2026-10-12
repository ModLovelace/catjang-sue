"use strict";

// Exercise production Linux windows with a temporary profile and no agent hooks.
const { app, BrowserWindow } = require("electron");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Module = require("node:module");
assert.equal(process.platform, "linux");
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "catjang-linux-window-")));
process.env.CATJANG_ENABLE_AGENT_INTEGRATIONS = "0";
process.env.CATJANG_ENABLE_GLOBAL_INPUT = "0";
const realWhenReady = app.whenReady.bind(app);
app.whenReady = () => new Promise(() => {});
Object.defineProperty(app, "isPackaged", { value: true });
const root = path.resolve(__dirname, "..");
const mainPath = path.join(root, "main.js");
const target = new Module(mainPath, module);
target.filename = mainPath;
target.paths = Module._nodeModulePaths(root);
target._compile(fs.readFileSync(mainPath, "utf8") + `
module.exports = {
  start() {
    catNamePromptShown = true; agentOnboardingShown = true;
    createPetWindow(); return petWin;
  },
  setMascot, triggerStretchSequence,
  closeStretchOverlay,
  overlay: () => stretchWin,
  isStretching: () => stretchInProgress,
};`, mainPath);
app.whenReady = realWhenReady;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const watchdog = setTimeout(() => { console.error("Linux window test timed out"); app.exit(1); }, 40000);

app.whenReady().then(async () => {
  const win = target.exports.start();
  await new Promise((resolve) => win.webContents.once("did-finish-load", resolve));
  await wait(500);
  const initialBounds = win.getBounds();
  for (const mascot of ["cat", "schnauzer", "chisi", "milo", "musubi", "peruperro"]) {
    target.exports.setMascot(mascot);
    await wait(100);
    target.exports.triggerStretchSequence();
    const overlay = target.exports.overlay();
    assert.ok(overlay && !overlay.isDestroyed(), `${mascot}: overlay must open`);
    await wait(600);
    assert.ok(overlay.isVisible(), `${mascot}: overlay must be visible`);
    assert.equal(await win.webContents.executeJavaScript("document.body.classList.contains('pet-hidden-for-stretch')"), true);
    const sprite = await overlay.webContents.executeJavaScript(`(() => {
      const obj = document.getElementById('mascot-stretch-object');
      const svg = obj.contentDocument?.documentElement;
      return { loaded: !!svg, filter: getComputedStyle(obj).filter,
        outline: !!svg?.querySelector('feMorphology'),
        animated: ${JSON.stringify(mascot)} !== 'cat' || svg?.classList.contains('stretching') };
    })()`);
    assert.deepEqual(sprite, { loaded: true, filter: "none", outline: true, animated: true });
    const capture = await overlay.webContents.capturePage();
    assert.ok(!capture.isEmpty(), `${mascot}: renderer must produce an image`);
    const bitmap = capture.toBitmap();
    const { width, height } = capture.getSize();
    for (const [x, y] of [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]) {
      assert.equal(bitmap[(y * width + x) * 4 + 3], 0, `${mascot}: overlay corners must be transparent`);
    }
    assert.ok(bitmap.some((byte, index) => index % 4 === 3 && byte > 0), `${mascot}: sprite must have visible pixels`);
    if (mascot === "cat" || mascot === "peruperro") {
      const output = path.join(root, ".tmp", "qa-linux");
      fs.mkdirSync(output, { recursive: true });
      fs.writeFileSync(path.join(output, `${mascot}-stretch.png`), capture.toPNG());
    }
    await wait(2700);
    assert.equal(target.exports.overlay(), null, `${mascot}: overlay must close`);
    assert.equal(target.exports.isStretching(), false);
    assert.equal(await win.webContents.executeJavaScript("document.body.classList.contains('pet-hidden-for-stretch')"), false);
    assert.deepEqual(win.getBounds(), initialBounds, `${mascot}: pet bounds must survive stretch`);
    console.log(`PASS ${mascot}: visible stretch, SVG outline, transparent corners, restored pet and bounds`);
  }
  // Closing the overlay early must immediately restore the pet and cancel
  // the previous session's timers before another stretch starts.
  target.exports.triggerStretchSequence();
  await wait(300);
  target.exports.overlay().destroy();
  await wait(50);
  assert.equal(target.exports.isStretching(), false);
  assert.equal(await win.webContents.executeJavaScript("document.body.classList.contains('pet-hidden-for-stretch')"), false);
  target.exports.triggerStretchSequence();
  await wait(300);
  assert.ok(target.exports.overlay().isVisible());
  target.exports.closeStretchOverlay();
  assert.equal(target.exports.overlay(), null);
  console.log("PASS early close: restores pet and allows a new stretch");

  // A rejected load must not hide the pet or leave the sequence locked.
  const loadFile = BrowserWindow.prototype.loadFile;
  try {
    BrowserWindow.prototype.loadFile = function (file, options) {
      return file.endsWith("stretch-overlay.html")
        ? Promise.reject(new Error("simulated missing overlay"))
        : loadFile.call(this, file, options);
    };
    target.exports.triggerStretchSequence();
    await wait(50);
    assert.equal(target.exports.overlay(), null);
    assert.equal(target.exports.isStretching(), false);
    assert.equal(await win.webContents.executeJavaScript("document.body.classList.contains('pet-hidden-for-stretch')"), false);
  } finally {
    BrowserWindow.prototype.loadFile = loadFile;
  }
  console.log("PASS failed load: pet stays visible and stretch is unlocked");
  assert.equal(BrowserWindow.getAllWindows().length, 1);
  // Prevent main's window-all-closed handler from quitting before assertions.
  const keeper = new BrowserWindow({ show: false });
  target.exports.triggerStretchSequence();
  await wait(300);
  win.destroy();
  await wait(50);
  assert.equal(target.exports.overlay(), null);
  assert.equal(target.exports.isStretching(), false);
  assert.deepEqual(BrowserWindow.getAllWindows(), [keeper]);
  console.log("PASS parent close: closes overlay and cancels timers");
  clearTimeout(watchdog);
  keeper.destroy();
  app.quit();
}).catch((error) => {
  console.error(error);
  clearTimeout(watchdog);
  app.exit(1);
});
