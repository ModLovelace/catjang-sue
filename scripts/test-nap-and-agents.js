"use strict";

// Real renderer + preload IPC, isolated from user settings and agent logs.
const { app, BrowserWindow, ipcMain } = require("electron");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
app.setPath("userData", fs.mkdtempSync(path.join(os.tmpdir(), "catjang-nap-")));
const handlers = {
  "cat-name-get": () => "Catjang", "cat-name-prompt-shown": () => true,
  "user-name-get": () => "QA", "fixed-message-get": () => "",
  "reminders-get": () => [], "task-complete-sound-volume-get": () => 0,
  "pomodoro-get": () => ({ visible: false }), "language-get": () => "es",
  "window-capabilities": () => ({ backend: "x11", supportsProgrammaticMove: true }),
  "mascot-get": () => "cat", "pattern-get": () => null,
  "pattern-presets-get": () => [], "mapping-load": () => ({}),
};
for (const [channel, handler] of Object.entries(handlers)) ipcMain.handle(channel, handler);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const watchdog = setTimeout(() => { console.error("Nap test timed out"); app.exit(1); }, 60000);

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 320, height: 320, frame: false, transparent: true, show: false,
    webPreferences: { preload: path.join(__dirname, "../preload.js"), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  });
  const run = (code) => win.webContents.executeJavaScript(code);
  const errors = [];
  win.webContents.on("console-message", (details) => {
    if (details.level === "error") errors.push(details.message);
  });
  await win.loadFile(path.join(__dirname, "../renderer/index.html"));
  await wait(600);
  for (const mascot of ["cat", "schnauzer", "chisi", "milo", "musubi", "peruperro"]) {
    await run(`applyMascot(${JSON.stringify(mascot)});`);
    await wait(250);
    for (const state of ["thinking", "working", "notification", "complete"]) {
      await run(`
        clearAiTaskStaleTimer(); setThinkingDotsVisible(false);
        delete document.body.dataset.jump; putPetToSleep();
      `);
      assert.equal(await run(`isPetSleeping && currentIdleElement().contentDocument.documentElement.classList.contains("sleeping")`), true, `${mascot}: eyes must close during nap`);
      const payload = { agentId: "codex", conversationName: "Prueba siesta", state, text: "Codex: aviso durante siesta" };
      win.webContents.send("ai-task-state", payload);
      if (state === "notification") win.webContents.send("ai-task-notification", payload);
      if (state === "complete") win.webContents.send("ai-task-complete", payload);
      await wait(100);
      const result = await run(`({
        awake: !isPetSleeping && !document.body.dataset.sleeping,
        eyesOpen: !currentIdleElement().contentDocument.documentElement.classList.contains("sleeping"),
        bubble: getComputedStyle(catSpeechBubble).display !== "none" && catSpeechBubble.textContent.includes("Codex"),
        refreshed: Date.now() - lastUserActivity < 2000,
        thinking: document.body.hasAttribute("data-thinking")
      })`);
      assert.ok(result.awake && result.eyesOpen && result.bubble && result.refreshed, `${mascot}/${state}: ${JSON.stringify(result)}`);
      assert.equal(result.thinking, state === "thinking" || state === "working");
      if (result.thinking) {
        await run("putPetToSleep()");
        assert.equal(await run("isPetSleeping"), false, "Active task must prevent nap");
      }
      if (state === "complete") await wait(2200);
    }
    await run("putPetToSleep(); applyMascot('cat');");
    assert.equal(await run(`Array.from(document.querySelectorAll('.mascot-idle')).some(el => el.contentDocument?.documentElement.classList.contains('sleeping'))`), false, "Switch must clear sleeping eyes from every mascot");
    console.log(`PASS ${mascot}: nap, 4 agent events through IPC, wake and switch`);
  }
  await run("lastUserActivity = Date.now() - SLEEP_IDLE_TIMEOUT_MS - 1;");
  await wait(5100);
  assert.equal(await run("isPetSleeping"), true, "Automatic nap must resume after inactivity");
  assert.deepEqual(errors, [], "Renderer must initialize without console errors");
  console.log("ALL NAP AND AGENT TESTS PASSED");
  clearTimeout(watchdog);
  app.exit(0);
}).catch((error) => { console.error(error); clearTimeout(watchdog); app.exit(1); });
