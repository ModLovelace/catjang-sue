"use strict";

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const assert = require("assert");

console.log("=== TEST AI TASK COMPLETION WITH CONVERSATION NAME / TOPIC ===");

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 300,
    height: 300,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  let currentMascot = "cat";
  ipcMain.handle("mascot-get", () => currentMascot);
  ipcMain.handle("window-capabilities", () => ({
    backend: "x11",
    nativeWayland: false,
    supportsProgrammaticMove: true,
  }));
  ipcMain.handle("cat-name-get", () => "Catjang");
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

  // Test 1: Function unit tests inside renderer
  const unitResults = await win.webContents.executeJavaScript(`
    (() => {
      const results = [];

      // Test 1.1: Gemini with conversation topic and task
      const t1 = formatAiCompleteText({
        agentId: "antigravity",
        agentName: "Gemini",
        conversationName: "catjang-sue",
        task: "Reorganizar SVGs",
      });
      results.push({ name: "Gemini with conversation and task", text: t1, expected: 'Gemini [catjang-sue]: Terminó "Reorganizar SVGs"' });

      // Test 1.2: Codex with conversation topic but generic complete
      const t2 = formatAiCompleteText({
        agentId: "codex",
        conversationName: "API de Pagos",
      });
      results.push({ name: "Codex with conversation only", text: t2, expected: 'Codex [API de Pagos]: ¡Tarea completada!' });

      // Test 1.3: Claude Code with conversation topic and custom text
      const t3 = formatAiCompleteText({
        agentId: "claude",
        conversationName: "Frontend Refactor",
        text: "Código listo para probar",
      });
      results.push({ name: "Claude with conversation and custom text", text: t3, expected: 'Claude Code [Frontend Refactor]: Código listo para probar' });

      // Test 1.4: No conversation name (fallback to agent only)
      const t4 = formatAiCompleteText({
        agentId: "gemini",
        task: "Limpiar temporales",
      });
      results.push({ name: "Gemini without conversation", text: t4, expected: 'Gemini: Terminó "Limpiar temporales"' });

      // Test 1.5: Cursor notification with conversation
      playAiNotification({
        agentId: "cursor",
        conversationName: "Debug Window",
        text: "¿Permitir comando shell?",
      });
      const bubble = document.getElementById("cat-speech-bubble");
      results.push({ name: "Cursor notification speech", text: bubble.innerText, expected: 'Cursor [Debug Window]: ¿Permitir comando shell?' });

      return results;
    })()
  `);

  console.log("Unit test results:");
  for (const r of unitResults) {
    console.log(`- ${r.name}: "${r.text}"`);
    if (r.text !== r.expected) {
      console.error(`FAIL: Expected "${r.expected}", got "${r.text}"`);
      app.exit(1);
      return;
    }
  }
  console.log("PASS: All text formatting logic with conversation name passed!");

  // Test 2: Live end-to-end speech bubble trigger via playAiComplete
  const speechState = await win.webContents.executeJavaScript(`
    (() => {
      playAiComplete({
        agentId: "antigravity",
        agentName: "Gemini",
        conversationName: "Animaciones Schnauzer",
        task: "Acariciar y jadear",
      });

      const bubble = document.getElementById("cat-speech-bubble");
      const bubbleDisplay = window.getComputedStyle(bubble).display;
      const bubbleText = bubble.innerText;
      const speechKind = document.body.dataset.speech;

      return {
        bubbleDisplay,
        bubbleText,
        speechKind,
      };
    })()
  `);
  console.log("Live Speech Bubble State:", speechState);

  if (speechState.bubbleDisplay === "none") {
    console.error("FAIL: Speech bubble is not visible!");
    app.exit(1);
    return;
  }
  if (speechState.bubbleText !== 'Gemini [Animaciones Schnauzer]: Terminó "Acariciar y jadear"') {
    console.error("FAIL: Speech bubble text mismatch! Got:", speechState.bubbleText);
    app.exit(1);
    return;
  }
  if (speechState.speechKind !== "complete") {
    console.error("FAIL: Expected data-speech='complete', got:", speechState.speechKind);
    app.exit(1);
    return;
  }
  console.log("PASS: Live speech bubble displays agent and conversation topic correctly!");

  console.log("=== ALL AGENT CONVERSATION COMPLETION TESTS PASSED! ===");
  app.exit(0);
});
