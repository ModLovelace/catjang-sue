/**
 * Test automatizado:
 * 1. Soltar a la mascota tras arrastrar/estirar restaura inmediatamente a idle en todas las mascotas.
 * 2. Evento thinking de Antigravity/Gemini activa carita de pensar y muestra globo de texto.
 */
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const IS_VISIBLE = process.argv.includes("--visible");

app.commandLine.appendSwitch("disable-gpu");
if (!IS_VISIBLE) {
  app.commandLine.appendSwitch("disable-software-rasterizer");
}

const defaultMockHandlers = {
  "cat-name-get": () => "Catjang",
  "user-name-get": () => "Usuario",
  "fixed-message-get": () => "",
  "reminders-get": () => [],
  "task-complete-sound-volume-get": () => 0.1,
  "pomodoro-get": () => ({ focusMin: 25, restSec: 300, running: false }),
  "language-get": () => "es",
  "window-capabilities": () => ({ transparent: true, frameless: true }),
  "mascot-get": () => "cat",
  "pattern-get": () => null,
  "pattern-presets-get": () => [],
  "mapping-load": () => ({}),
  "agent-status-get": () => ({ serverRunning: true, hooks: {} }),
};

for (const [channel, handler] of Object.entries(defaultMockHandlers)) {
  ipcMain.handle(channel, handler);
}

const noopSends = [
  "drag-window-ended",
  "set-stretch-mode",
  "passthrough-hit",
  "window-moved",
  "cat-name-set",
  "user-name-set",
  "mascot-set",
];
for (const ch of noopSends) {
  ipcMain.on(ch, () => {});
}

const watchdogTimer = setTimeout(() => {
  console.error("Test timed out after 30s");
  app.exit(1);
}, 30000);

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 320,
    height: 320,
    show: IS_VISIBLE,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (IS_VISIBLE) {
    win.center();
  }

  await win.loadFile(path.join(__dirname, "../renderer/index.html"));
  await new Promise((r) => setTimeout(r, 800));

  let results = [];
  try {
    results = await win.webContents.executeJavaScript(`
      (async () => {
        const logs = [];
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        // PRUEBA 1: Ciclo de las 5 mascotas
        const mascots = ["cat", "schnauzer", "chisi", "milo", "musubi"];

        for (const m of mascots) {
          applyMascot(m);
          await sleep(150);

          const idleEl = currentIdleElement();
          const isIdleVisible = idleEl && window.getComputedStyle(idleEl).display !== "none";
          logs.push({
            test: \`Mascot [\${m}] Idle Display\`,
            pass: isIdleVisible,
            details: \`idleEl=\${idleEl ? idleEl.id : "null"}, display=\${idleEl ? window.getComputedStyle(idleEl).display : "none"}\`
          });

          beginDragStretch({ screenX: 200, screenY: 200 }, { screenX: 200, screenY: 240 });
          const wasDragging = document.body.classList.contains("dragging");

          finishDragStretch(false);
          await sleep(250);

          const isStillDragging = document.body.classList.contains("dragging");
          const idleAfterRelease = currentIdleElement();
          const idleAfterDisplay = idleAfterRelease && window.getComputedStyle(idleAfterRelease).display !== "none";

          logs.push({
            test: \`Mascot [\${m}] Drag Release to Idle\`,
            pass: wasDragging && !isStillDragging && idleAfterDisplay,
            details: \`wasDragging=\${wasDragging}, afterReleaseDragging=\${isStillDragging}, idleDisplay=\${idleAfterDisplay}\`
          });
        }

        // PRUEBA 2: Caricias (delay y activación)
        stopPurring();
        applyMascot("schnauzer");
        await sleep(100);

        const rect = currentIdleElement().getBoundingClientRect();
        const headX = rect.left + rect.width * 0.50;
        const headY = rect.top + rect.height * 0.34;

        // Movimiento casual (<1.4s)
        updatePurringAtPoint(headX, headY);
        await sleep(100);

        const purringImmediately = document.body.dataset.purring === "1";
        logs.push({
          test: "Petting: Casual cursor pass does NOT trigger petting",
          pass: !purringImmediately,
          details: \`purring=\${purringImmediately}\`
        });

        // Movimiento sostenido (> 1.4s)
        let currX = headX;
        let currY = headY;
        for (let i = 0; i < 18; i++) {
          currX += (i % 2 === 0 ? 8 : -8);
          currY += (i % 2 === 0 ? 2 : -2);
          updatePurringAtPoint(currX, currY);
          await sleep(100);
        }

        const purringDog = document.body.dataset.purring === "1";
        logs.push({
          test: "Petting: Sustained strokes (>1.4s) triggers petting on dog",
          pass: purringDog,
          details: \`purringDog=\${purringDog}\`
        });
        stopPurring();

        // PRUEBA 3: Antigravity / Gemini
        applyAiTaskState({
          agentId: "antigravity",
          agentName: "Gemini",
          state: "thinking",
          conversationName: "Mi Proyecto",
          task: "Analizando código"
        });
        await sleep(150);

        const hasThinkingFace = document.body.hasAttribute("data-thinking");
        const bubble = document.getElementById("cat-speech-bubble");
        const bubbleVisible = bubble && window.getComputedStyle(bubble).display !== "none";
        const bubbleContent = bubble ? bubble.textContent : "";

        logs.push({
          test: "Antigravity/Gemini: Thinking face & speech bubble notice",
          pass: hasThinkingFace && bubbleVisible && bubbleContent.includes("Gemini") && bubbleContent.includes("Pensando"),
          details: \`hasThinkingFace=\${hasThinkingFace}, bubbleVisible=\${bubbleVisible}, text="\${bubbleContent}"\`
        });

        playAiComplete({
          agentId: "antigravity",
          agentName: "Gemini",
          conversationName: "Mi Proyecto",
          task: "Analizando código"
        });
        await sleep(150);

        const thinkingCleared = !document.body.hasAttribute("data-thinking");
        logs.push({
          test: "Antigravity/Gemini: Task complete clears thinking face",
          pass: thinkingCleared,
          details: \`thinkingCleared=\${thinkingCleared}\`
        });

        return logs;
      })()
    `);
  } catch (err) {
    console.error("Execution error in webContents:", err);
    clearTimeout(watchdogTimer);
    app.exit(1);
    return;
  }

  console.log("=== MASCOT BY MASCOT & AI INTEGRATION TEST RESULTS ===");
  let allPass = true;
  for (const res of results) {
    console.log(`  [${res.pass ? "PASS" : "FAIL"}] ${res.test}: ${res.details}`);
    if (!res.pass) allPass = false;
  }

  clearTimeout(watchdogTimer);
  if (allPass) {
    console.log("=== ALL TESTS PASSED SUCCESSFULLY! ===");
    app.exit(0);
  } else {
    console.error("=== SOME TESTS FAILED! ===");
    app.exit(1);
  }
});
