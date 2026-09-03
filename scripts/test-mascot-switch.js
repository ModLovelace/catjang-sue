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

  // 2.6 Test dragging while schnauzer is active
  const stateDragDog = await win.webContents.executeJavaScript(`
    (() => {
      document.body.classList.add("dragging");
      const catDrag = document.getElementById("stretch-svg-end");
      const dogDrag = document.getElementById("schnauzer-drag");
      const dogIdle = document.getElementById("schnauzer");
      return {
        catDragDisplay: window.getComputedStyle(catDrag).display,
        dogDragDisplay: window.getComputedStyle(dogDrag).display,
        dogIdleDisplay: window.getComputedStyle(dogIdle).display,
        dogDragWidth: dogDrag.getBoundingClientRect().width,
      };
    })()
  `);
  console.log("STATE 2.6 (Schnauzer Dragging):", stateDragDog);

  if (stateDragDog.catDragDisplay !== "none") {
    console.error("FAIL: Cat drag is showing while Schnauzer is dragged!");
    app.exit(1);
    return;
  }
  if (stateDragDog.dogDragDisplay === "none") {
    console.error("FAIL: Dog drag is NOT showing while Schnauzer is dragged!");
    app.exit(1);
    return;
  }
  if (stateDragDog.dogIdleDisplay !== "none") {
    console.error("FAIL: Dog idle is showing while Schnauzer is dragged!");
    app.exit(1);
    return;
  }
  console.log("PASS 2.6: Schnauzer drag is visible, Cat drag and Dog idle are hidden.");
  await win.webContents.executeJavaScript(`document.body.classList.remove("dragging")`);

  // 2.7 Test stretching while schnauzer is active
  const stateStretchDog = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.stretching = "ing";
      const catStretch = document.getElementById("stretch-pose-default");
      const dogStretch = document.getElementById("schnauzer-stretch");
      const dogIdle = document.getElementById("schnauzer");
      return {
        catStretchDisplay: window.getComputedStyle(catStretch).display,
        dogStretchDisplay: window.getComputedStyle(dogStretch).display,
        dogIdleDisplay: window.getComputedStyle(dogIdle).display,
      };
    })()
  `);
  console.log("STATE 2.7 (Schnauzer Stretching):", stateStretchDog);

  if (stateStretchDog.catStretchDisplay !== "none") {
    console.error("FAIL: Cat stretch is showing while Schnauzer is stretching!");
    app.exit(1);
    return;
  }
  if (stateStretchDog.dogStretchDisplay === "none") {
    console.error("FAIL: Dog stretch is NOT showing while Schnauzer is stretching!");
    app.exit(1);
    return;
  }
  if (stateStretchDog.dogIdleDisplay !== "none") {
    console.error("FAIL: Dog idle is showing while Schnauzer is stretching (double dog bug)!");
    app.exit(1);
    return;
  }
  console.log("PASS 2.7: Schnauzer stretch is visible, Cat stretch and Dog idle are hidden.");
  await win.webContents.executeJavaScript(`delete document.body.dataset.stretching`);

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
  await win.webContents.executeJavaScript(`delete document.body.dataset.scroll`);

  // 3.6 Test dragging while cat is active
  const stateDragCat = await win.webContents.executeJavaScript(`
    (() => {
      document.body.classList.add("dragging");
      const catDrag = document.getElementById("stretch-svg-end");
      const dogDrag = document.getElementById("schnauzer-drag");
      return {
        catDragDisplay: window.getComputedStyle(catDrag).display,
        dogDragDisplay: window.getComputedStyle(dogDrag).display,
      };
    })()
  `);
  console.log("STATE 3.6 (Cat Dragging):", stateDragCat);

  if (stateDragCat.catDragDisplay === "none") {
    console.error("FAIL: Cat drag is NOT showing while cat is dragged!");
    app.exit(1);
    return;
  }
  if (stateDragCat.dogDragDisplay !== "none") {
    console.error("FAIL: Dog drag is showing while cat is dragged!");
    app.exit(1);
    return;
  }
  console.log("PASS 3.6: Cat drag is visible, Dog drag is hidden.");
  await win.webContents.executeJavaScript(`document.body.classList.remove("dragging")`);

  // 4. Switch to Chisi
  const stateChisi = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.mascot = "chisi";
      const cat = document.getElementById("cat");
      const schnauzer = document.getElementById("schnauzer");
      const chisi = document.getElementById("chisi");
      return {
        mascot: document.body.dataset.mascot,
        catDisplay: window.getComputedStyle(cat).display,
        schnauzerDisplay: window.getComputedStyle(schnauzer).display,
        chisiDisplay: window.getComputedStyle(chisi).display,
        chisiWidth: chisi.getBoundingClientRect().width,
        chisiHeight: chisi.getBoundingClientRect().height,
      };
    })()
  `);
  console.log("STATE 4 (Switched to Chisi):", stateChisi);

  if (stateChisi.catDisplay !== "none" || stateChisi.schnauzerDisplay !== "none" || stateChisi.chisiDisplay !== "block") {
    console.error("FAIL: Chisi is not properly visible or other mascots not hidden!");
    app.exit(1);
    return;
  }
  console.log("PASS 4: Chisi is visible and Cat/Schnauzer are hidden.");

  // 4.1 Test Chisi typing
  const stateChisiPress = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.press = "left";
      const chisi = document.getElementById("chisi");
      const chisiPressLeft = document.getElementById("chisi-press-left");
      return {
        chisiIdle: window.getComputedStyle(chisi).display,
        chisiPress: window.getComputedStyle(chisiPressLeft).display,
      };
    })()
  `);
  console.log("STATE 4.1 (Chisi Typing Left):", stateChisiPress);
  if (stateChisiPress.chisiIdle !== "none" || stateChisiPress.chisiPress !== "block") {
    console.error("FAIL: Chisi typing left display incorrect!");
    app.exit(1);
    return;
  }
  await win.webContents.executeJavaScript(`delete document.body.dataset.press`);

  // 4.2 Test Chisi scrolling
  const stateChisiScroll = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.scroll = "1";
      const chisi = document.getElementById("chisi");
      const chisiScroll = document.getElementById("chisi-scroll-unroll");
      return {
        chisiIdle: window.getComputedStyle(chisi).display,
        chisiScroll: window.getComputedStyle(chisiScroll).display,
      };
    })()
  `);
  console.log("STATE 4.2 (Chisi Scrolling):", stateChisiScroll);
  if (stateChisiScroll.chisiIdle !== "none" || stateChisiScroll.chisiScroll !== "block") {
    console.error("FAIL: Chisi scrolling display incorrect!");
    app.exit(1);
    return;
  }
  await win.webContents.executeJavaScript(`delete document.body.dataset.scroll`);

  // 4.3 Test Chisi dragging
  const stateChisiDrag = await win.webContents.executeJavaScript(`
    (() => {
      document.body.classList.add("dragging");
      const chisi = document.getElementById("chisi");
      const chisiDrag = document.getElementById("chisi-drag");
      const schnauzerDrag = document.getElementById("schnauzer-drag");
      return {
        chisiIdle: window.getComputedStyle(chisi).display,
        chisiDrag: window.getComputedStyle(chisiDrag).display,
        schnauzerDrag: window.getComputedStyle(schnauzerDrag).display,
      };
    })()
  `);
  console.log("STATE 4.3 (Chisi Dragging):", stateChisiDrag);
  if (stateChisiDrag.chisiIdle !== "none" || stateChisiDrag.chisiDrag !== "block" || stateChisiDrag.schnauzerDrag !== "none") {
    console.error("FAIL: Chisi dragging display incorrect!");
    app.exit(1);
    return;
  }
  await win.webContents.executeJavaScript(`document.body.classList.remove("dragging")`);

  // 4.4 Test Chisi stretching
  const stateChisiStretch = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.stretching = "ing";
      const chisi = document.getElementById("chisi");
      const chisiStretch = document.getElementById("chisi-stretch");
      const schnauzerStretch = document.getElementById("schnauzer-stretch");
      return {
        chisiIdle: window.getComputedStyle(chisi).display,
        chisiStretch: window.getComputedStyle(chisiStretch).display,
        schnauzerStretch: window.getComputedStyle(schnauzerStretch).display,
      };
    })()
  `);
  console.log("STATE 4.4 (Chisi Stretching):", stateChisiStretch);
  if (stateChisiStretch.chisiIdle !== "none" || stateChisiStretch.chisiStretch !== "block" || stateChisiStretch.schnauzerStretch !== "none") {
    console.error("FAIL: Chisi stretching display incorrect!");
    app.exit(1);
    return;
  }
  await win.webContents.executeJavaScript(`delete document.body.dataset.stretching`);
  console.log("PASS 4: All Chisi animations and state transitions passed cleanly!");

  // 5. Switch to Milo
  const state5 = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.mascot = "milo";
      const cat = document.getElementById("cat");
      const schnauzer = document.getElementById("schnauzer");
      const chisi = document.getElementById("chisi");
      const milo = document.getElementById("milo");
      const rect = milo.getBoundingClientRect();
      return {
        mascot: document.body.dataset.mascot,
        catDisplay: window.getComputedStyle(cat).display,
        schnauzerDisplay: window.getComputedStyle(schnauzer).display,
        chisiDisplay: window.getComputedStyle(chisi).display,
        miloDisplay: window.getComputedStyle(milo).display,
        miloWidth: rect.width,
        miloHeight: rect.height,
      };
    })()
  `);
  console.log("STATE 5 (Switched to Milo):", state5);
  if (state5.miloDisplay !== "block" || state5.catDisplay !== "none" || state5.schnauzerDisplay !== "none" || state5.chisiDisplay !== "none") {
    console.error("FAIL: Milo is not visible or other mascots are not hidden!");
    app.exit(1);
    return;
  }
  console.log("PASS 5: Milo is visible and Cat/Schnauzer/Chisi are hidden.");

  // 5.1 Test Milo typing
  const stateMiloPress = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.press = "left";
      const milo = document.getElementById("milo");
      const miloPress = document.getElementById("milo-press-left");
      return {
        miloIdle: window.getComputedStyle(milo).display,
        miloPress: window.getComputedStyle(miloPress).display,
      };
    })()
  `);
  console.log("STATE 5.1 (Milo Typing Left):", stateMiloPress);
  if (stateMiloPress.miloIdle !== "none" || stateMiloPress.miloPress !== "block") {
    console.error("FAIL: Milo typing display incorrect!");
    app.exit(1);
    return;
  }
  await win.webContents.executeJavaScript(`delete document.body.dataset.press`);

  // 5.2 Test Milo scrolling
  const stateMiloScroll = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.scroll = "unroll";
      const milo = document.getElementById("milo");
      const miloScroll = document.getElementById("milo-scroll-unroll");
      return {
        miloIdle: window.getComputedStyle(milo).display,
        miloScroll: window.getComputedStyle(miloScroll).display,
      };
    })()
  `);
  console.log("STATE 5.2 (Milo Scrolling):", stateMiloScroll);
  if (stateMiloScroll.miloIdle !== "none" || stateMiloScroll.miloScroll !== "block") {
    console.error("FAIL: Milo scrolling display incorrect!");
    app.exit(1);
    return;
  }
  await win.webContents.executeJavaScript(`delete document.body.dataset.scroll`);

  // 5.3 Test Milo dragging
  const stateMiloDrag = await win.webContents.executeJavaScript(`
    (() => {
      document.body.classList.add("dragging");
      const milo = document.getElementById("milo");
      const miloDrag = document.getElementById("milo-drag");
      const chisiDrag = document.getElementById("chisi-drag");
      const schnauzerDrag = document.getElementById("schnauzer-drag");
      return {
        miloIdle: window.getComputedStyle(milo).display,
        miloDrag: window.getComputedStyle(miloDrag).display,
        chisiDrag: window.getComputedStyle(chisiDrag).display,
        schnauzerDrag: window.getComputedStyle(schnauzerDrag).display,
      };
    })()
  `);
  console.log("STATE 5.3 (Milo Dragging):", stateMiloDrag);
  if (stateMiloDrag.miloIdle !== "none" || stateMiloDrag.miloDrag !== "block" || stateMiloDrag.chisiDrag !== "none" || stateMiloDrag.schnauzerDrag !== "none") {
    console.error("FAIL: Milo dragging display incorrect!");
    app.exit(1);
    return;
  }
  await win.webContents.executeJavaScript(`document.body.classList.remove("dragging")`);

  // 5.4 Test Milo stretching
  const stateMiloStretch = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.stretching = "ing";
      const milo = document.getElementById("milo");
      const miloStretch = document.getElementById("milo-stretch");
      const chisiStretch = document.getElementById("chisi-stretch");
      const schnauzerStretch = document.getElementById("schnauzer-stretch");
      return {
        miloIdle: window.getComputedStyle(milo).display,
        miloStretch: window.getComputedStyle(miloStretch).display,
        chisiStretch: window.getComputedStyle(chisiStretch).display,
        schnauzerStretch: window.getComputedStyle(schnauzerStretch).display,
      };
    })()
  `);
  console.log("STATE 5.4 (Milo Stretching):", stateMiloStretch);
  if (stateMiloStretch.miloIdle !== "none" || stateMiloStretch.miloStretch !== "block" || stateMiloStretch.chisiStretch !== "none" || stateMiloStretch.schnauzerStretch !== "none") {
    console.error("FAIL: Milo stretching display incorrect!");
    app.exit(1);
    return;
  }
  await win.webContents.executeJavaScript(`delete document.body.dataset.stretching`);
  console.log("PASS 5: All Milo animations and state transitions passed cleanly!");

  console.log("=== ALL LIVE ELECTRON MASCOT ANIMATIONS & ISOLATION TESTS PASSED! ===");
  app.exit(0);
});
