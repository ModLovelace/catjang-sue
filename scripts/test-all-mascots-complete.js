"use strict";

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { MASCOTS } = require("../renderer/mascots.js");

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

  let currentMascot = "cat";
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
  await new Promise((r) => setTimeout(r, 800));

  console.log("==================================================================");
  console.log("=== COMPREHENSIVE MASCOT-BY-MASCOT SUITE (5/5 MASCOTS AUDIT) ===");
  console.log("==================================================================");

  const mascotList = Object.keys(MASCOTS);
  let totalTestsPassed = 0;

  for (const mascotId of mascotList) {
    const mascotConfig = MASCOTS[mascotId];
    console.log(`\n>>> [TESTING MASCOT: ${mascotId.toUpperCase()} (${mascotConfig.label})] <<<`);

    // Step A: Switch to Mascot
    const switchResult = await win.webContents.executeJavaScript(`
      (async () => {
        applyMascot("${mascotId}");
        await new Promise(r => setTimeout(r, 100));
        const idleEl = document.getElementById("${mascotConfig.elements.idle}");
        const allSprites = Array.from(document.querySelectorAll(".mascot-sprite"));
        const foreignVisible = allSprites.filter(el => {
          const owner = el.dataset.mascot;
          const display = window.getComputedStyle(el).display;
          return owner !== "${mascotId}" && display !== "none";
        }).map(el => el.id);

        const idleDisplay = idleEl ? window.getComputedStyle(idleEl).display : "none";
        const rect = idleEl ? idleEl.getBoundingClientRect() : { width: 0, height: 0 };

        return {
          bodyMascot: document.body.dataset.mascot,
          idleDisplay,
          idleWidth: rect.width,
          idleHeight: rect.height,
          foreignVisible,
        };
      })()
    `);

    console.log(`  [A] Idle & Isolation:`, switchResult);
    if (switchResult.bodyMascot !== mascotId) {
      console.error(`FAIL: body.dataset.mascot was not set to ${mascotId}`);
      app.exit(1);
    }
    if (switchResult.idleDisplay !== "block") {
      console.error(`FAIL: ${mascotConfig.elements.idle} display is '${switchResult.idleDisplay}', expected 'block'`);
      app.exit(1);
    }
    if (switchResult.idleWidth <= 0 || switchResult.idleHeight <= 0) {
      console.error(`FAIL: ${mascotConfig.elements.idle} dimensions invalid: ${switchResult.idleWidth}x${switchResult.idleHeight}`);
      app.exit(1);
    }
    if (switchResult.foreignVisible.length > 0) {
      console.error(`FAIL: Foreign mascot sprites visible while ${mascotId} is active:`, switchResult.foreignVisible);
      app.exit(1);
    }
    console.log(`  PASS: Idle rendered perfectly without foreign sprites visible.`);
    totalTestsPassed++;

    // Step B: Typing Left
    const leftResult = await win.webContents.executeJavaScript(`
      (() => {
        document.body.dataset.press = "left";
        const idleEl = document.getElementById("${mascotConfig.elements.idle}");
        const pressEl = document.getElementById("${mascotConfig.elements.pressLeft}");
        return {
          idleDisplay: window.getComputedStyle(idleEl).display,
          pressDisplay: window.getComputedStyle(pressEl).display,
        };
      })()
    `);
    console.log(`  [B] Press Left:`, leftResult);
    if (leftResult.idleDisplay !== "none" || leftResult.pressDisplay !== "block") {
      console.error(`FAIL: Press Left display mismatch for ${mascotId}`);
      app.exit(1);
    }
    await win.webContents.executeJavaScript(`delete document.body.dataset.press`);
    console.log(`  PASS: Press Left works correctly.`);
    totalTestsPassed++;

    // Step C: Typing Right
    const rightResult = await win.webContents.executeJavaScript(`
      (() => {
        document.body.dataset.press = "right";
        const idleEl = document.getElementById("${mascotConfig.elements.idle}");
        const pressEl = document.getElementById("${mascotConfig.elements.pressRight}");
        return {
          idleDisplay: window.getComputedStyle(idleEl).display,
          pressDisplay: window.getComputedStyle(pressEl).display,
        };
      })()
    `);
    console.log(`  [C] Press Right:`, rightResult);
    if (rightResult.idleDisplay !== "none" || rightResult.pressDisplay !== "block") {
      console.error(`FAIL: Press Right display mismatch for ${mascotId}`);
      app.exit(1);
    }
    await win.webContents.executeJavaScript(`delete document.body.dataset.press`);
    console.log(`  PASS: Press Right works correctly.`);
    totalTestsPassed++;

    // Step D: Scroll
    const scrollResult = await win.webContents.executeJavaScript(`
      (() => {
        document.body.dataset.scroll = "unroll";
        const idleEl = document.getElementById("${mascotConfig.elements.idle}");
        const scrollEl = document.getElementById("${mascotConfig.elements.scroll}");
        return {
          idleDisplay: window.getComputedStyle(idleEl).display,
          scrollDisplay: window.getComputedStyle(scrollEl).display,
        };
      })()
    `);
    console.log(`  [D] Scroll:`, scrollResult);
    if (scrollResult.idleDisplay !== "none" || scrollResult.scrollDisplay !== "block") {
      console.error(`FAIL: Scroll display mismatch for ${mascotId}`);
      app.exit(1);
    }
    await win.webContents.executeJavaScript(`delete document.body.dataset.scroll`);
    console.log(`  PASS: Scroll works correctly.`);
    totalTestsPassed++;

    // Step E: Jump Start
    const jumpStartResult = await win.webContents.executeJavaScript(`
      (() => {
        document.body.dataset.jump = "start";
        const idleEl = document.getElementById("${mascotConfig.elements.idle}");
        const jumpStartEl = document.getElementById("${mascotConfig.elements.jumpStart}");
        return {
          idleDisplay: window.getComputedStyle(idleEl).display,
          jumpStartDisplay: window.getComputedStyle(jumpStartEl).display,
        };
      })()
    `);
    console.log(`  [E] Jump Start:`, jumpStartResult);
    if (jumpStartResult.idleDisplay !== "none" || jumpStartResult.jumpStartDisplay !== "block") {
      console.error(`FAIL: Jump Start display mismatch for ${mascotId}`);
      app.exit(1);
    }
    await win.webContents.executeJavaScript(`delete document.body.dataset.jump`);
    console.log(`  PASS: Jump Start works correctly.`);
    totalTestsPassed++;

    // Step F: Jump Ing
    const jumpIngResult = await win.webContents.executeJavaScript(`
      (() => {
        document.body.dataset.jump = "ing";
        const idleEl = document.getElementById("${mascotConfig.elements.idle}");
        const jumpIngEl = document.getElementById("${mascotConfig.elements.jumpIng}");
        return {
          idleDisplay: window.getComputedStyle(idleEl).display,
          jumpIngDisplay: window.getComputedStyle(jumpIngEl).display,
        };
      })()
    `);
    console.log(`  [F] Jump Ing:`, jumpIngResult);
    if (jumpIngResult.idleDisplay !== "none" || jumpIngResult.jumpIngDisplay !== "block") {
      console.error(`FAIL: Jump Ing display mismatch for ${mascotId}`);
      app.exit(1);
    }
    await win.webContents.executeJavaScript(`delete document.body.dataset.jump`);
    console.log(`  PASS: Jump Ing works correctly.`);
    totalTestsPassed++;

    // Step G: Drag
    const dragResult = await win.webContents.executeJavaScript(`
      (() => {
        document.body.classList.add("dragging");
        const idleEl = document.getElementById("${mascotConfig.elements.idle}");
        const dragEl = document.getElementById("${mascotConfig.elements.drag}");
        return {
          idleDisplay: window.getComputedStyle(idleEl).display,
          dragDisplay: window.getComputedStyle(dragEl).display,
        };
      })()
    `);
    console.log(`  [G] Drag:`, dragResult);
    if (dragResult.idleDisplay !== "none" || dragResult.dragDisplay !== "block") {
      console.error(`FAIL: Drag display mismatch for ${mascotId}`);
      app.exit(1);
    }
    await win.webContents.executeJavaScript(`document.body.classList.remove("dragging")`);
    console.log(`  PASS: Drag works correctly (idle is strictly hidden).`);
    totalTestsPassed++;

    // Step H: Stretch
    const stretchResult = await win.webContents.executeJavaScript(`
      (() => {
        document.body.dataset.stretching = "ing";
        const idleEl = document.getElementById("${mascotConfig.elements.idle}");
        const stretchEl = document.getElementById("${mascotConfig.elements.stretch}");
        return {
          idleDisplay: window.getComputedStyle(idleEl).display,
          stretchDisplay: window.getComputedStyle(stretchEl).display,
        };
      })()
    `);
    console.log(`  [H] Stretch:`, stretchResult);
    if (stretchResult.idleDisplay !== "none" || stretchResult.stretchDisplay !== "block") {
      console.error(`FAIL: Stretch display mismatch for ${mascotId} (possible double mascot bug!)`);
      app.exit(1);
    }
    await win.webContents.executeJavaScript(`delete document.body.dataset.stretching`);
    console.log(`  PASS: Stretch works correctly (idle is strictly hidden).`);
    totalTestsPassed++;

    // Step I: Petting & Sound Reaction
    const petResult = await win.webContents.executeJavaScript(`
      (async () => {
        const idleEl = document.getElementById("${mascotConfig.elements.idle}");
        if (!idleEl.contentDocument || !idleEl.contentDocument.querySelector("svg")) {
          await new Promise(r => {
            idleEl.addEventListener("load", r, { once: true });
            setTimeout(r, 500);
          });
        }
        await new Promise(r => setTimeout(r, 150));

        const rect = idleEl.getBoundingClientRect();
        const p = ${JSON.stringify(mascotConfig.petting)};
        const headX = rect.left + rect.width * p.cx;
        const headY = rect.top + rect.height * p.cy;

        startPurring(headX, headY);

        const hearts = document.getElementById("purr-hearts");
        const doc = idleEl.contentDocument;
        const root = doc && doc.documentElement;
        const hasPurringClass = root ? root.classList.contains("purring") : false;

        const tongue = doc ? (doc.getElementById("dog-tongue") || doc.querySelector("#dog-tongue")) : null;
        let tongueVisible = false;
        if (tongue) {
          const tDisp = doc.defaultView ? doc.defaultView.getComputedStyle(tongue).display : window.getComputedStyle(tongue).display;
          tongueVisible = tDisp !== "none";
        }

        const isDogAudioActive = !!dogPettingNodes;

        // Cleanup
        stopPurring();

        return {
          purringDataset: document.body.dataset.purring,
          heartsDisplayedInitially: window.getComputedStyle(hearts).display,
          hasPurringClass,
          tongueVisible,
          isDogAudioActive,
          soundType: "${mascotConfig.soundType}",
        };
      })()
    `);
    console.log(`  [I] Petting:`, petResult);
    if (!petResult.hasPurringClass) {
      console.error(`FAIL: SVG root did not receive .purring class for ${mascotId}`);
      app.exit(1);
    }
    if (mascotConfig.soundType === "bark") {
      if (!petResult.tongueVisible) {
        console.error(`FAIL: Canine ${mascotId} tongue was not visible while petting!`);
        app.exit(1);
      }
    }
    console.log(`  PASS: Petting interaction verified for ${mascotId} (soundType=${mascotConfig.soundType}).`);
    totalTestsPassed++;
  }

  console.log("\n==================================================================");
  console.log(`=== ALL 5 MASCOTS PASSED 100% OF TESTS (${totalTestsPassed}/${mascotList.length * 9} CHECKS) ===`);
  console.log("==================================================================");
  app.exit(0);
});
