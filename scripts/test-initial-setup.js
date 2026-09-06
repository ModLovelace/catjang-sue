/**
 * Test automatizado para el nuevo flujo de configuración inicial:
 * - Validación del formulario de licencia (Paso 1).
 * - Transición al panel de configuración inicial (Paso 2).
 * - Selección de las 5 mascotas (Catjang, Toto, Chisi, Milo, Musubi).
 * - Selección de conectar agentes IA ("Sí" vs "No").
 * - Soporte multilingüe (ES, EN, KO, JA).
 * - Llamada a licenseStart con los parámetros elegidos.
 */
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");

let lastLicenseStartPayload = null;

ipcMain.handle("license-activate", async (_evt, key) => {
  if (key === "VALID-KEY") {
    return { ok: true, productName: "Catjang Prototype", customerEmail: "tester@example.com" };
  }
  throw new Error("Invalid license key");
});

ipcMain.handle("license-start", async (_evt, options) => {
  lastLicenseStartPayload = options;
  return { ok: true };
});

ipcMain.handle("language-get", async () => "es");
ipcMain.handle("language-set", async (_evt, lang) => lang);

const watchdog = setTimeout(() => {
  console.error("Test timeout after 20s");
  app.exit(1);
}, 20000);

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 500,
    height: 640,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadFile(path.join(__dirname, "../license/index.html"));
  await new Promise((r) => setTimeout(r, 600));

  let results = [];
  try {
    results = await win.webContents.executeJavaScript(`
      (async () => {
        const logs = [];
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        // 1. Verificar estado inicial: Paso 1 visible, Paso 2 oculto
        const step1 = document.getElementById("step-license");
        const step2 = document.getElementById("step-setup");
        const step1Visible = window.getComputedStyle(step1).display !== "none";
        const step2Visible = window.getComputedStyle(step2).display !== "none";

        logs.push({
          test: "Initial state: Step 1 visible, Step 2 hidden",
          pass: step1Visible && !step2Visible,
          details: \`step1Visible=\${step1Visible}, step2Visible=\${step2Visible}\`
        });

        // 2. Probar error con clave vacía o inválida
        const input = document.getElementById("license-key");
        const form = document.getElementById("license-form");
        input.value = "INVALID-KEY";
        form.dispatchEvent(new Event("submit"));
        await sleep(200);

        const statusMsg = document.getElementById("status-message").textContent;
        logs.push({
          test: "Invalid key shows error message",
          pass: statusMsg.length > 0 && !statusMsg.includes("Activado"),
          details: \`statusMsg="\${statusMsg}"\`
        });

        // 3. Activar con clave válida y verificar transición al Paso 2
        input.value = "VALID-KEY";
        form.dispatchEvent(new Event("submit"));
        await sleep(600);

        const step1After = window.getComputedStyle(step1).display;
        const step2After = window.getComputedStyle(step2).display;
        logs.push({
          test: "Valid key transitions to Step 2 (Initial Setup)",
          pass: step1After === "none" && step2After !== "none",
          details: \`step1Display=\${step1After}, step2Display=\${step2After}\`
        });

        // 4. Verificar que existen las 5 mascotas con sus imágenes y nombres
        const cards = document.querySelectorAll(".mascot-card");
        const mascotsFound = Array.from(cards).map(c => c.dataset.mascot);
        const expectedMascots = ["cat", "schnauzer", "chisi", "milo", "musubi"];
        const allMascotsPresent = expectedMascots.every(m => mascotsFound.includes(m));

        logs.push({
          test: "All 5 mascot cards are rendered",
          pass: cards.length === 5 && allMascotsPresent,
          details: \`found=\${mascotsFound.join(", ")}\`
        });

        // 5. Probar selección de mascota (clic en Toto / schnauzer)
        const schnauzerCard = document.querySelector('.mascot-card[data-mascot="schnauzer"]');
        schnauzerCard.click();
        await sleep(50);

        const isSchnauzerSelected = schnauzerCard.classList.contains("is-selected");
        const catCard = document.querySelector('.mascot-card[data-mascot="cat"]');
        const isCatDeselected = !catCard.classList.contains("is-selected");

        logs.push({
          test: "Clicking Toto selects schnauzer and deselects cat",
          pass: isSchnauzerSelected && isCatDeselected,
          details: \`schnauzerSelected=\${isSchnauzerSelected}, catDeselected=\${isCatDeselected}\`
        });

        // 6. Probar selección de IA: elegir "No, más tarde"
        const noChoiceBtn = document.querySelector('.choice-button[data-choice="no"]');
        const yesChoiceBtn = document.querySelector('.choice-button[data-choice="yes"]');
        noChoiceBtn.click();
        await sleep(50);

        const isNoActive = noChoiceBtn.classList.contains("is-active");
        const isYesInactive = !yesChoiceBtn.classList.contains("is-active");

        logs.push({
          test: "Clicking 'No' choice button sets option to false",
          pass: isNoActive && isYesInactive,
          details: \`noActive=\${isNoActive}, yesInactive=\${isYesInactive}\`
        });

        // 7. Probar multilingüe en Paso 2: cambiar a EN y verificar textos
        applyLanguage("en");
        await sleep(50);

        const titleText = document.querySelector(".setup-header h2").textContent;
        const noTitleText = noChoiceBtn.querySelector("strong").textContent;
        const isEnglish = titleText === "Initial Setup" && noTitleText.includes("No");

        logs.push({
          test: "Language switching updates Step 2 texts",
          pass: isEnglish,
          details: \`title="\${titleText}", noBtn="\${noTitleText}"\`
        });

        // Volver a español
        applyLanguage("es");
        await sleep(50);

        // 8. Clic en "Comenzar" y verificar envío
        const startBtn = document.getElementById("start-button");
        startBtn.click();
        await sleep(200);

        return logs;
      })()
    `);
  } catch (err) {
    console.error("Execution error in webContents:", err);
    clearTimeout(watchdog);
    app.exit(1);
    return;
  }

  console.log("=== INITIAL SETUP ONBOARDING TEST RESULTS ===");
  let allPass = true;
  for (const r of results) {
    console.log(`  [${r.pass ? "PASS" : "FAIL"}] ${r.test}: ${r.details}`);
    if (!r.pass) allPass = false;
  }

  // 9. Verificar que licenseStart recibió { mascot: 'schnauzer', connectAgents: false }
  const payloadPass = lastLicenseStartPayload &&
    lastLicenseStartPayload.mascot === "schnauzer" &&
    lastLicenseStartPayload.connectAgents === false;

  console.log(`  [${payloadPass ? "PASS" : "FAIL"}] licenseStart received options: ${JSON.stringify(lastLicenseStartPayload)}`);
  if (!payloadPass) allPass = false;

  clearTimeout(watchdog);
  if (allPass) {
    console.log("=== ALL INITIAL SETUP TESTS PASSED! ===");
    app.exit(0);
  } else {
    console.error("=== SOME TESTS FAILED! ===");
    app.exit(1);
  }
});
