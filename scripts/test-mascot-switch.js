"use strict";

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

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
  ipcMain.handle("fixed-message-get", () => "");
  ipcMain.handle("reminders-get", () => []);
  ipcMain.handle("pomodoro-get", () => ({ active: false }));
  ipcMain.handle("pattern-get", () => null);
  ipcMain.handle("language-get", () => "es");

  await win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));

  // Allow DOM and SVGs to initialize
  await new Promise(r => setTimeout(r, 600));

  // 1. Initial state (cat)
  const state1 = await win.webContents.executeJavaScript(`
    (() => {
      const cat = document.getElementById("cat");
      const schnauzer = document.getElementById("schnauzer");
      return {
        mascot: document.body.dataset.mascot || "cat",
        catDisplay: window.getComputedStyle(cat).display,
        schnauzerDisplay: window.getComputedStyle(schnauzer).display,
        catWidth: cat.getBoundingClientRect().width,
        catHeight: cat.getBoundingClientRect().height,
      };
    })()
  `);
  console.log("STATE 1 (Initial Cat):", state1);

  if (state1.catDisplay === "none") {
    console.error("FAIL: #cat is hidden initially!");
    app.exit(1);
    return;
  }
  if (state1.schnauzerDisplay !== "none") {
    console.error("FAIL: #schnauzer should be hidden initially!");
    app.exit(1);
    return;
  }
  console.log("PASS 1: Initial cat is visible, schnauzer is hidden.");

  // 2. Switch to schnauzer
  const state2 = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.mascot = "schnauzer";
      const cat = document.getElementById("cat");
      const schnauzer = document.getElementById("schnauzer");
      return {
        mascot: document.body.dataset.mascot,
        catDisplay: window.getComputedStyle(cat).display,
        schnauzerDisplay: window.getComputedStyle(schnauzer).display,
        schnauzerWidth: schnauzer.getBoundingClientRect().width,
        schnauzerHeight: schnauzer.getBoundingClientRect().height,
      };
    })()
  `);
  console.log("STATE 2 (Switched to Schnauzer):", state2);

  if (state2.catDisplay !== "none") {
    console.error("FAIL: #cat is NOT hidden when mascot is schnauzer!");
    app.exit(1);
    return;
  }
  if (state2.schnauzerDisplay === "none") {
    console.error("FAIL: #schnauzer is hidden when mascot is schnauzer!");
    app.exit(1);
    return;
  }
  if (state2.schnauzerWidth <= 0 || state2.schnauzerHeight <= 0) {
    console.error("FAIL: #schnauzer width/height is zero!", state2.schnauzerWidth, state2.schnauzerHeight);
    app.exit(1);
    return;
  }
  console.log("PASS 2: Schnauzer is rendered and visible with width=" + state2.schnauzerWidth + " and height=" + state2.schnauzerHeight);

  // 2.5 Test scrolling while schnauzer is active
  const stateScrollDog = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.scroll = "unroll";
      const cat = document.getElementById("cat");
      const schnauzer = document.getElementById("schnauzer");
      const catScroll = document.getElementById("scroll-unroll");
      const dogScroll = document.getElementById("schnauzer-scroll-unroll");
      return {
        catDisplay: window.getComputedStyle(cat).display,
        schnauzerDisplay: window.getComputedStyle(schnauzer).display,
        catScrollDisplay: window.getComputedStyle(catScroll).display,
        dogScrollDisplay: window.getComputedStyle(dogScroll).display,
        dogScrollWidth: dogScroll.getBoundingClientRect().width,
      };
    })()
  `);
  console.log("STATE 2.5 (Schnauzer Scrolling):", stateScrollDog);

  if (stateScrollDog.catScrollDisplay !== "none") {
    console.error("FAIL: Cat scroll unroll is showing while Schnauzer is active!");
    app.exit(1);
    return;
  }
  if (stateScrollDog.dogScrollDisplay === "none") {
    console.error("FAIL: Schnauzer scroll unroll is NOT showing while scrolling!");
    app.exit(1);
    return;
  }
  console.log("PASS 2.5: Schnauzer scroll unroll is visible, Cat scroll unroll is hidden.");

  // Clean scroll state
  await win.webContents.executeJavaScript(`delete document.body.dataset.scroll`);

  // 3. Switch back to cat
  const state3 = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.mascot = "cat";
      const cat = document.getElementById("cat");
      const schnauzer = document.getElementById("schnauzer");
      return {
        mascot: document.body.dataset.mascot,
        catDisplay: window.getComputedStyle(cat).display,
        schnauzerDisplay: window.getComputedStyle(schnauzer).display,
      };
    })()
  `);
  console.log("STATE 3 (Switched back to Cat):", state3);

  if (state3.catDisplay === "none" || state3.schnauzerDisplay !== "none") {
    console.error("FAIL: Switching back to cat did not restore correctly!");
    app.exit(1);
    return;
  }
  console.log("PASS 3: Switched back to cat cleanly.");

  // 3.5 Test scrolling while cat is active
  const stateScrollCat = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.scroll = "unroll";
      const catScroll = document.getElementById("scroll-unroll");
      const dogScroll = document.getElementById("schnauzer-scroll-unroll");
      return {
        catScrollDisplay: window.getComputedStyle(catScroll).display,
        dogScrollDisplay: window.getComputedStyle(dogScroll).display,
      };
    })()
  `);
  console.log("STATE 3.5 (Cat Scrolling):", stateScrollCat);

  if (stateScrollCat.catScrollDisplay === "none") {
    console.error("FAIL: Cat scroll unroll is NOT showing while cat is scrolling!");
    app.exit(1);
    return;
  }
  if (stateScrollCat.dogScrollDisplay !== "none") {
    console.error("FAIL: Dog scroll unroll is showing while cat is scrolling!");
    app.exit(1);
    return;
  }
  console.log("PASS 3.5: Cat scroll unroll is visible, Dog scroll unroll is hidden.");

  console.log("=== ALL LIVE ELECTRON MASCOT SWITCH & SCROLL TESTS PASSED! ===");
  app.exit(0);
});
