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
  ipcMain.handle("user-name-get", () => "");
  ipcMain.handle("fixed-message-get", () => "");
  ipcMain.handle("reminders-get", () => []);
  ipcMain.handle("pomodoro-get", () => ({ active: false }));
  ipcMain.handle("pattern-get", () => null);
  ipcMain.handle("language-get", () => "es");
  ipcMain.handle("task-complete-sound-volume-get", () => 0.1);

  await win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  await new Promise((r) => setTimeout(r, 600));

  console.log("=== TESTING PETTING ANIMATIONS AND SOUNDS ===");

  // 1. Test Cat Petting
  const catPetState = await win.webContents.executeJavaScript(`
    (() => {
      document.body.dataset.mascot = "cat";
      currentMascot = "cat";
      const cat = document.getElementById("cat");
      const rect = cat.getBoundingClientRect();
      const headX = rect.left + rect.width * 0.40;
      const headY = rect.top + rect.height * 0.33;
      
      startPurring(headX, headY);

      const hearts = document.getElementById("purr-hearts");
      const catDoc = cat.contentDocument;
      const catRoot = catDoc && catDoc.documentElement;
      const isPurringClass = catRoot ? catRoot.classList.contains("purring") : false;

      return {
        purringDataset: document.body.dataset.purring,
        heartsDisplay: window.getComputedStyle(hearts).display,
        catHasPurringClass: isPurringClass,
      };
    })()
  `);
  console.log("Cat Petting State:", catPetState);

  if (catPetState.purringDataset !== "1" || catPetState.heartsDisplay === "none" || !catPetState.catHasPurringClass) {
    console.error("FAIL: Cat petting did not trigger properly!");
    app.exit(1);
    return;
  }
  console.log("PASS 1: Cat petting triggered, hearts visible, cat root has .purring class.");

  // Stop Cat Petting
  const catStopState = await win.webContents.executeJavaScript(`
    (() => {
      stopPurring();
      const hearts = document.getElementById("purr-hearts");
      const cat = document.getElementById("cat");
      const catRoot = cat.contentDocument && cat.contentDocument.documentElement;
      return {
        purringDataset: document.body.dataset.purring,
        heartsDisplay: window.getComputedStyle(hearts).display,
        catHasPurringClass: catRoot ? catRoot.classList.contains("purring") : false,
      };
    })()
  `);
  console.log("Cat Stop Petting State:", catStopState);
  if (catStopState.purringDataset || catStopState.heartsDisplay !== "none" || catStopState.catHasPurringClass) {
    console.error("FAIL: Cat petting did not stop cleanly!");
    app.exit(1);
    return;
  }
  console.log("PASS 2: Cat petting stopped cleanly, hearts hidden, .purring class removed.");

  // 2. Test Schnauzer Petting
  const dogPetState = await win.webContents.executeJavaScript(`
    (async () => {
      document.body.dataset.mascot = "schnauzer";
      currentMascot = "schnauzer";
      const dog = document.getElementById("schnauzer");
      if (!dog.contentDocument || !dog.contentDocument.querySelector("svg")) {
        await new Promise(r => {
          dog.addEventListener("load", r, { once: true });
          setTimeout(r, 600);
        });
      }
      await new Promise(r => setTimeout(r, 200));
      const rect = dog.getBoundingClientRect();
      const headX = rect.left + rect.width * 0.50;
      const headY = rect.top + rect.height * 0.34;

      startPurring(headX, headY);

      const hearts = document.getElementById("purr-hearts");
      const dogDoc = dog.contentDocument;
      const dogRoot = dogDoc && dogDoc.documentElement;
      const isPurringClass = dogRoot ? dogRoot.classList.contains("purring") : false;

      const tongue = dogDoc ? (dogDoc.getElementById("dog-tongue") || dogDoc.querySelector("#dog-tongue")) : null;
      let tongueDisplay = "none";
      let tongueOuter = "";
      const hasTongueInHtml = dogDoc ? dogDoc.documentElement.innerHTML.includes("dog-tongue") : false;
      const allIds = dogDoc ? Array.from(dogDoc.querySelectorAll("[id]")).map(e => e.id) : [];
      if (tongue) {
        tongueDisplay = dogDoc.defaultView ? dogDoc.defaultView.getComputedStyle(tongue).display : window.getComputedStyle(tongue).display;
        tongueOuter = tongue.outerHTML;
      }

      return {
        purringDataset: document.body.dataset.purring,
        heartsDisplay: window.getComputedStyle(hearts).display,
        dogHasPurringClass: isPurringClass,
        tongueDisplay: tongueDisplay,
        dogPettingNodesActive: !!dogPettingNodes,
      };
    })()
  `);
  console.log("Dog Petting State:", dogPetState);

  if (dogPetState.purringDataset !== "1" || dogPetState.heartsDisplay === "none" || !dogPetState.dogHasPurringClass) {
    console.error("FAIL: Schnauzer petting did not trigger properly!");
    app.exit(1);
    return;
  }
  if (dogPetState.tongueDisplay === "none") {
    console.error("FAIL: Schnauzer tongue is not displayed while petting!");
    app.exit(1);
    return;
  }
  if (!dogPetState.dogPettingNodesActive) {
    console.error("FAIL: Schnauzer petting audio nodes were not activated!");
    app.exit(1);
    return;
  }
  console.log("PASS 3: Schnauzer petting active, hearts visible, .purring applied, tongue shown, dog audio active.");

  // Stop Schnauzer Petting
  const dogStopState = await win.webContents.executeJavaScript(`
    (() => {
      stopPurring();
      const hearts = document.getElementById("purr-hearts");
      const dog = document.getElementById("schnauzer");
      const dogRoot = dog.contentDocument && dog.contentDocument.documentElement;
      return {
        purringDataset: document.body.dataset.purring,
        heartsDisplay: window.getComputedStyle(hearts).display,
        dogHasPurringClass: dogRoot ? dogRoot.classList.contains("purring") : false,
        dogPettingNodesActive: !!dogPettingNodes,
      };
    })()
  `);
  console.log("Dog Stop Petting State:", dogStopState);
  if (dogStopState.purringDataset || dogStopState.heartsDisplay !== "none" || dogStopState.dogHasPurringClass || dogStopState.dogPettingNodesActive) {
    console.error("FAIL: Schnauzer petting did not stop cleanly!");
    app.exit(1);
    return;
  }
  console.log("PASS 4: Schnauzer petting stopped cleanly, hearts hidden, audio stopped.");

  // 3. Test Chisi Petting
  const chisiPetState = await win.webContents.executeJavaScript(`
    (async () => {
      document.body.dataset.mascot = "chisi";
      currentMascot = "chisi";
      const chisi = document.getElementById("chisi");
      if (!chisi.contentDocument || !chisi.contentDocument.querySelector("svg")) {
        await new Promise(r => {
          chisi.addEventListener("load", r, { once: true });
          setTimeout(r, 600);
        });
      }
      await new Promise(r => setTimeout(r, 200));
      const rect = chisi.getBoundingClientRect();
      const headX = rect.left + rect.width * 0.50;
      const headY = rect.top + rect.height * 0.35;

      startPurring(headX, headY);

      const hearts = document.getElementById("purr-hearts");
      const chisiDoc = chisi.contentDocument;
      const chisiRoot = chisiDoc && chisiDoc.documentElement;
      const isPurringClass = chisiRoot ? chisiRoot.classList.contains("purring") : false;

      const tongue = chisiDoc ? chisiDoc.getElementById("dog-tongue") : null;
      let tongueDisplay = "none";
      if (tongue) {
        tongueDisplay = chisiDoc.defaultView ? chisiDoc.defaultView.getComputedStyle(tongue).display : window.getComputedStyle(tongue).display;
      }

      return {
        purringDataset: document.body.dataset.purring,
        heartsDisplay: window.getComputedStyle(hearts).display,
        chisiHasPurringClass: isPurringClass,
        tongueDisplay: tongueDisplay,
        dogPettingNodesActive: !!dogPettingNodes,
      };
    })()
  `);
  console.log("Chisi Petting State:", chisiPetState);

  if (chisiPetState.purringDataset !== "1" || chisiPetState.heartsDisplay === "none" || !chisiPetState.chisiHasPurringClass) {
    console.error("FAIL: Chisi petting did not trigger properly!");
    app.exit(1);
    return;
  }
  if (chisiPetState.tongueDisplay === "none") {
    console.error("FAIL: Chisi tongue is not displayed while petting!");
    app.exit(1);
    return;
  }
  if (!chisiPetState.dogPettingNodesActive) {
    console.error("FAIL: Chisi petting audio nodes were not activated!");
    app.exit(1);
    return;
  }
  console.log("PASS 5: Chisi petting active, hearts visible, .purring applied, tongue shown, dog audio active.");

  // Stop Chisi Petting
  const chisiStopState = await win.webContents.executeJavaScript(`
    (() => {
      stopPurring();
      const hearts = document.getElementById("purr-hearts");
      const chisi = document.getElementById("chisi");
      const chisiRoot = chisi.contentDocument && chisi.contentDocument.documentElement;
      return {
        purringDataset: document.body.dataset.purring,
        heartsDisplay: window.getComputedStyle(hearts).display,
        chisiHasPurringClass: chisiRoot ? chisiRoot.classList.contains("purring") : false,
        dogPettingNodesActive: !!dogPettingNodes,
      };
    })()
  `);
  console.log("Chisi Stop Petting State:", chisiStopState);
  if (chisiStopState.purringDataset || chisiStopState.heartsDisplay !== "none" || chisiStopState.chisiHasPurringClass || chisiStopState.dogPettingNodesActive) {
    console.error("FAIL: Chisi petting did not stop cleanly!");
    app.exit(1);
    return;
  }
  console.log("PASS 6: Chisi petting stopped cleanly, hearts hidden, audio stopped.");

  console.log("=== ALL PETTING ANIMATIONS AND SOUND TESTS PASSED! ===");
  app.exit(0);
});
