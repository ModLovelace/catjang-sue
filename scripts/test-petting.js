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

  // 4. Test Milo Petting
  const miloPetState = await win.webContents.executeJavaScript(`
    (async () => {
      document.body.dataset.mascot = "milo";
      currentMascot = "milo";
      const milo = document.getElementById("milo");
      if (!milo.contentDocument || !milo.contentDocument.querySelector("svg")) {
        await new Promise(r => {
          milo.addEventListener("load", r, { once: true });
          setTimeout(r, 600);
        });
      }
      await new Promise(r => setTimeout(r, 200));
      const rect = milo.getBoundingClientRect();
      const headX = rect.left + rect.width * 0.50;
      const headY = rect.top + rect.height * 0.35;

      startPurring(headX, headY);

      const hearts = document.getElementById("purr-hearts");
      const miloDoc = milo.contentDocument;
      const miloRoot = miloDoc && miloDoc.documentElement;
      const isPurringClass = miloRoot ? miloRoot.classList.contains("purring") : false;

      const tongue = miloDoc ? miloDoc.getElementById("dog-tongue") : null;
      let tongueDisplay = "none";
      if (tongue) {
        tongueDisplay = miloDoc.defaultView ? miloDoc.defaultView.getComputedStyle(tongue).display : window.getComputedStyle(tongue).display;
      }

      return {
        purringDataset: document.body.dataset.purring,
        heartsDisplay: window.getComputedStyle(hearts).display,
        miloHasPurringClass: isPurringClass,
        tongueDisplay: tongueDisplay,
        dogPettingNodesActive: !!dogPettingNodes,
      };
    })()
  `);
  console.log("Milo Petting State:", miloPetState);

  if (miloPetState.purringDataset !== "1" || miloPetState.heartsDisplay === "none" || !miloPetState.miloHasPurringClass) {
    console.error("FAIL: Milo petting did not trigger properly!");
    app.exit(1);
    return;
  }
  if (miloPetState.tongueDisplay === "none") {
    console.error("FAIL: Milo tongue is not displayed while petting!");
    app.exit(1);
    return;
  }
  if (!miloPetState.dogPettingNodesActive) {
    console.error("FAIL: Milo petting audio nodes were not activated!");
    app.exit(1);
    return;
  }
  console.log("PASS 7: Milo petting active, hearts visible, .purring applied, tongue shown, dog audio active.");

  // Stop Milo Petting
  const miloStopState = await win.webContents.executeJavaScript(`
    (() => {
      stopPurring();
      const hearts = document.getElementById("purr-hearts");
      const milo = document.getElementById("milo");
      const miloRoot = milo.contentDocument && milo.contentDocument.documentElement;
      return {
        purringDataset: document.body.dataset.purring,
        heartsDisplay: window.getComputedStyle(hearts).display,
        miloHasPurringClass: miloRoot ? miloRoot.classList.contains("purring") : false,
        dogPettingNodesActive: !!dogPettingNodes,
      };
    })()
  `);
  console.log("Milo Stop Petting State:", miloStopState);
  if (miloStopState.purringDataset || miloStopState.heartsDisplay !== "none" || miloStopState.miloHasPurringClass || miloStopState.dogPettingNodesActive) {
    console.error("FAIL: Milo petting did not stop cleanly!");
    app.exit(1);
    return;
  }
  console.log("PASS 8: Milo petting stopped cleanly, hearts hidden, audio stopped.");

  // 5. Test Musubi Petting (Cat audio / purring)
  const musubiPetState = await win.webContents.executeJavaScript(`
    (async () => {
      document.body.dataset.mascot = "musubi";
      currentMascot = "musubi";
      const musubi = document.getElementById("musubi");
      if (!musubi.contentDocument || !musubi.contentDocument.querySelector("svg")) {
        await new Promise(r => {
          musubi.addEventListener("load", r, { once: true });
          setTimeout(r, 600);
        });
      }
      await new Promise(r => setTimeout(r, 200));
      const rect = musubi.getBoundingClientRect();
      const headX = rect.left + rect.width * 0.48;
      const headY = rect.top + rect.height * 0.33;

      startPurring(headX, headY);

      const hearts = document.getElementById("purr-hearts");
      const musubiDoc = musubi.contentDocument;
      const musubiRoot = musubiDoc && musubiDoc.documentElement;
      const isPurringClass = musubiRoot ? musubiRoot.classList.contains("purring") : false;

      return {
        purringDataset: document.body.dataset.purring,
        heartsDisplay: window.getComputedStyle(hearts).display,
        musubiHasPurringClass: isPurringClass,
        dogPettingNodesActive: !!dogPettingNodes,
      };
    })()
  `);
  console.log("Musubi Petting State:", musubiPetState);

  if (musubiPetState.purringDataset !== "1" || musubiPetState.heartsDisplay === "none" || !musubiPetState.musubiHasPurringClass) {
    console.error("FAIL: Musubi petting did not trigger properly!");
    app.exit(1);
    return;
  }
  if (musubiPetState.dogPettingNodesActive) {
    console.error("FAIL: Musubi should use cat purring audio, not dog petting audio!");
    app.exit(1);
    return;
  }
  console.log("PASS 9: Musubi petting active, hearts visible, .purring applied, feline purr audio active.");

  // Stop Musubi Petting
  const musubiStopState = await win.webContents.executeJavaScript(`
    (() => {
      stopPurring();
      const hearts = document.getElementById("purr-hearts");
      const musubi = document.getElementById("musubi");
      const musubiRoot = musubi.contentDocument && musubi.contentDocument.documentElement;
      return {
        purringDataset: document.body.dataset.purring,
        heartsDisplay: window.getComputedStyle(hearts).display,
        musubiHasPurringClass: musubiRoot ? musubiRoot.classList.contains("purring") : false,
      };
    })()
  `);
  console.log("Musubi Stop Petting State:", musubiStopState);
  if (musubiStopState.purringDataset || musubiStopState.heartsDisplay !== "none" || musubiStopState.musubiHasPurringClass) {
    console.error("FAIL: Musubi petting did not stop cleanly!");
    app.exit(1);
    return;
  }
  console.log("PASS 10: Musubi petting stopped cleanly, hearts hidden, purr stopped.");

  // 6. Test Chuño Petting (dog audio / tongue)
  const chunoPetState = await win.webContents.executeJavaScript(`
    (async () => {
      document.body.dataset.mascot = "peruperro";
      currentMascot = "peruperro";
      const chuno = document.getElementById("peruperro");
      if (!chuno.contentDocument || !chuno.contentDocument.querySelector("svg")) {
        await new Promise(r => {
          chuno.addEventListener("load", r, { once: true });
          setTimeout(r, 600);
        });
      }
      await new Promise(r => setTimeout(r, 200));
      const rect = chuno.getBoundingClientRect();
      const headX = rect.left + rect.width * 0.50;
      const headY = rect.top + rect.height * 0.30;

      startPurring(headX, headY);

      const hearts = document.getElementById("purr-hearts");
      const chunoDoc = chuno.contentDocument;
      const chunoRoot = chunoDoc && chunoDoc.documentElement;
      const tongue = chunoDoc ? chunoDoc.getElementById("dog-tongue") : null;
      const tongueDisplay = tongue && chunoDoc.defaultView
        ? chunoDoc.defaultView.getComputedStyle(tongue).display
        : "none";
      return {
        purringDataset: document.body.dataset.purring,
        heartsDisplay: window.getComputedStyle(hearts).display,
        chunoHasPurringClass: chunoRoot ? chunoRoot.classList.contains("purring") : false,
        tongueDisplay,
        dogPettingNodesActive: !!dogPettingNodes,
      };
    })()
  `);
  console.log("Chuño Petting State:", chunoPetState);
  if (
    chunoPetState.purringDataset !== "1" ||
    chunoPetState.heartsDisplay === "none" ||
    !chunoPetState.chunoHasPurringClass ||
    chunoPetState.tongueDisplay === "none" ||
    !chunoPetState.dogPettingNodesActive
  ) {
    console.error("FAIL: Chuño petting did not trigger dog visuals and audio properly!");
    app.exit(1);
    return;
  }
  console.log("PASS 11: Chuño petting active, hearts visible, tongue shown and dog audio active.");

  const chunoStopState = await win.webContents.executeJavaScript(`
    (() => {
      stopPurring();
      const hearts = document.getElementById("purr-hearts");
      const chuno = document.getElementById("peruperro");
      const chunoRoot = chuno.contentDocument && chuno.contentDocument.documentElement;
      return {
        purringDataset: document.body.dataset.purring,
        heartsDisplay: window.getComputedStyle(hearts).display,
        chunoHasPurringClass: chunoRoot ? chunoRoot.classList.contains("purring") : false,
        dogPettingNodesActive: !!dogPettingNodes,
      };
    })()
  `);
  console.log("Chuño Stop Petting State:", chunoStopState);
  if (
    chunoStopState.purringDataset ||
    chunoStopState.heartsDisplay !== "none" ||
    chunoStopState.chunoHasPurringClass ||
    chunoStopState.dogPettingNodesActive
  ) {
    console.error("FAIL: Chuño petting did not stop cleanly!");
    app.exit(1);
    return;
  }
  console.log("PASS 12: Chuño petting stopped cleanly, hearts hidden and audio stopped.");

  console.log("=== ALL 6 MASCOT PETTING ANIMATIONS AND SOUND TESTS PASSED! ===");
  app.exit(0);
});
