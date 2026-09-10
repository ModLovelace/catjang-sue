"use strict";

// Exercise the production window, input hook and timers with temporary settings.
// Only the license/onboarding startup is skipped in this test process. Agent log
// monitors stay disabled: the benchmark represents the default opt-in-off mode.
const { app, BrowserWindow, desktopCapturer, screen } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const Module = require("node:module");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const output = path.join(root, ".tmp", "qa-desktop");
fs.mkdirSync(output, { recursive: true });
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "catjang-desktop-")));
process.env.CATJANG_ENABLE_AGENT_INTEGRATIONS = "0";
const realWhenReady = app.whenReady.bind(app);
app.whenReady = () => new Promise(() => {});
// Match the shipped build's closed DevTools without modifying production code.
Object.defineProperty(app, "isPackaged", { value: true });
const mainPath = path.join(root, "main.js");
const target = new Module(mainPath, module);
target.filename = mainPath;
target.paths = Module._nodeModulePaths(root);
target._compile(fs.readFileSync(mainPath, "utf8") + `
module.exports = {
  start() {
    catNamePromptShown = true; agentOnboardingShown = true;
    currentLanguage = 'es'; taskCompleteSoundVolume = 0;
    startLicensedApp(); return petWin;
  },
  dispatch: handleAgentStateEvent,
};`, mainPath);
app.whenReady = realWhenReady;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const report = { date: new Date().toISOString(), electron: process.versions.electron,
  node: process.versions.node, logicalCPUs: os.cpus().length,
  mode: "production window, global input hook and timers; agent log monitors disabled", samples: [], captures: [] };
const watchdog = setTimeout(() => { console.error("Desktop QA timed out"); app.exit(1); }, 360000);
let desktopCaptureAvailable = true;

async function measure(label, win) {
  await wait(2500);
  const before = new Map(app.getAppMetrics().map((m) => [m.pid, m.cpu.cumulativeCPUUsage]));
  const started = performance.now();
  await wait(15000);
  const elapsed = (performance.now() - started) / 1000;
  let seconds = 0;
  const processes = app.getAppMetrics().map((m) => {
    assert.ok(Number.isFinite(m.cpu.cumulativeCPUUsage), "Cumulative CPU time must be available");
    const delta = m.cpu.cumulativeCPUUsage - (before.get(m.pid) ?? 0);
    seconds += Math.max(0, delta);
    return { type: m.type, seconds: delta };
  });
  const sample = { label, elapsed, oneCorePercent: seconds / elapsed * 100,
    totalMachinePercent: seconds / elapsed / os.cpus().length * 100, processes,
    sleeping: await win.webContents.executeJavaScript("isPetSleeping") };
  report.samples.push(sample);
  console.log(`CPU ${label}: ${sample.totalMachinePercent.toFixed(3)}% total (${sample.oneCorePercent.toFixed(2)}% of one core)`);
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  assert.ok(sample.totalMachinePercent < 1, `${label}: CPU must stay below 1% total`);
}

app.whenReady().then(async () => {
  const win = target.exports.start();
  await new Promise((resolve) => win.webContents.once("did-finish-load", resolve));
  await wait(1200);
  const run = (code) => win.webContents.executeJavaScript(code);
  const bounds = win.getBounds();
  const backdrop = new BrowserWindow({ ...bounds, frame: false, show: false, hasShadow: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false } });
  const sheets = [];
  for (const mascot of ["cat", "schnauzer", "chisi", "milo", "musubi", "peruperro"]) {
    await run(`applyMascot(${JSON.stringify(mascot)});`);
    await wait(500);
    for (const [name, color] of [["light", "#f4f4f4"], ["dark", "#20242d"]]) {
      await backdrop.loadURL(`data:text/html,<html style="background:${encodeURIComponent(color)}"></html>`);
      backdrop.showInactive();
      win.showInactive();
      await wait(400);
      const rendered = await win.webContents.capturePage();
      const bitmap = rendered.toBitmap();
      const size = rendered.getSize();
      for (const [x, y] of [[0, 0], [size.width - 1, 0], [0, size.height - 1], [size.width - 1, size.height - 1]]) {
        assert.equal(bitmap[(y * size.width + x) * 4 + 3], 0, `${mascot}: window corners must be transparent`);
      }
      const filename = `${mascot}-${name}.png`;
      fs.writeFileSync(path.join(output, filename), rendered.toPNG());
      sheets.push({ mascot, name, color, src: rendered.toDataURL() });
      // Capture the actual Windows compositor as well, cropped to our own QA window.
      const display = screen.getDisplayMatching(bounds);
      const sources = desktopCaptureAvailable ? await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: {
        width: Math.round(display.size.width * display.scaleFactor),
        height: Math.round(display.size.height * display.scaleFactor),
      } }) : [];
      const source = sources.find((s) => s.display_id === String(display.id));
      let desktopFile = null;
      if (source && !source.thumbnail.isEmpty()) {
        const scale = source.thumbnail.getSize().width / display.size.width;
        const crop = source.thumbnail.crop({ x: Math.round((bounds.x - display.bounds.x) * scale),
          y: Math.round((bounds.y - display.bounds.y) * scale), width: Math.round(bounds.width * scale), height: Math.round(bounds.height * scale) });
        desktopFile = `${mascot}-${name}-desktop.png`;
        fs.writeFileSync(path.join(output, desktopFile), crop.toPNG());
      } else if (desktopCaptureAvailable) {
        desktopCaptureAvailable = false;
        report.desktopCaptureLimitation = "Windows did not expose a capturable screen; only renderer transparency is verified.";
        console.warn(report.desktopCaptureLimitation);
      }
      report.captures.push({ mascot, background: name, alphaCorners: true, rendererFile: filename, desktopFile });
    }
    backdrop.hide();
    await run("registerUserActivity();");
    await measure(`${mascot}/idle`, win);
    await run("putPetToSleep();");
    await measure(`${mascot}/nap`, win);
    // Main-process event routing remains active while sleeping.
    target.exports.dispatch({ agentId: "codex", sessionId: "qa", state: "notification", text: "Codex: QA siesta" });
    await wait(100);
    assert.equal(await run(`!isPetSleeping && catSpeechBubble.textContent === 'Codex: QA siesta'`), true);
    await run("clearTimeout(speechTimer); speechTimer = null; activeSpeechKind = null; renderSpeech(null); delete document.body.dataset.alert;");
  }
  backdrop.destroy();
  const sheet = new BrowserWindow({ width: 1200, height: 900, show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
  await sheet.loadURL("data:text/html," + encodeURIComponent(`<html><body style="margin:0;display:grid;grid-template-columns:repeat(6,200px);font:14px sans-serif">${sheets.map((s) => `<div style="background:${s.color};color:${s.name === "dark" ? "white" : "black"};text-align:center"><p>${s.mascot} / ${s.name}</p><img style="width:200px;height:350px;object-fit:contain" src="${s.src}"></div>`).join("")}</body></html>`));
  await wait(500);
  fs.writeFileSync(path.join(output, "contact-sheet.png"), (await sheet.webContents.capturePage()).toPNG());
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  const failures = report.samples.filter((s) => s.totalMachinePercent >= 1);
  assert.deepEqual(failures, [], "Each idle/nap measurement must stay below 1% total CPU");
  console.log(`CPU AND RENDERER QA PASSED; desktop capture: ${desktopCaptureAvailable ? "available" : "unavailable"}; artifacts: ${output}`);
  clearTimeout(watchdog);
  app.quit();
}).catch((error) => {
  console.error(error);
  fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  clearTimeout(watchdog); app.exit(1);
});
