/**
 * Test automatizado: Verificación del retraso y simulación de movimiento para caricias.
 * 1. Accidental pass-through (<150ms) -> NO debe acariciar.
 * 2. Hover estático sin movimiento (1.8s) -> NO debe acariciar.
 * 3. Movimiento intencional simulado (~1.5s de vaivén) -> SÍ debe acariciar.
 */
const { app, BrowserWindow } = require("electron");
const path = require("path");

app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-software-rasterizer");

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 320,
    height: 320,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadFile(path.join(__dirname, "../renderer/index.html"));

  // Esperar a que el SVG y el DOM se inicialicen
  await new Promise((r) => setTimeout(r, 600));

  const results = await win.webContents.executeJavaScript(`
    (async () => {
      const logs = [];
      const m = typeof getMascot === "function" ? getMascot(currentMascot) : null;
      const target = currentIdleElement();
      const rect = target.getBoundingClientRect();
      const { cx, cy } = (m && m.petting) || { cx: 0.40, cy: 0.33 };
      const headX = rect.left + rect.width * cx;
      const headY = rect.top + rect.height * cy;

      // --- TEST 1: Pase accidental rápido (pass-through) ---
      resetPettingStroke();
      stopPurring();
      for (let i = 0; i < 5; i++) {
        updatePurringAtPoint(headX - 10 + i * 5, headY);
        await new Promise((r) => setTimeout(r, 20));
      }
      updatePurringAtPoint(headX + 60, headY + 60);
      const test1Purring = document.body.dataset.purring === "1";
      logs.push({ test: "Accidental Pass-through", expected: false, actual: test1Purring, pass: !test1Purring });

      // --- TEST 2: Hover estático sin movimiento (1.6 segundos) ---
      resetPettingStroke();
      stopPurring();
      for (let i = 0; i < 8; i++) {
        updatePurringAtPoint(headX, headY);
        await new Promise((r) => setTimeout(r, 200));
      }
      const test2Purring = document.body.dataset.purring === "1";
      logs.push({ test: "Static Hover (no motion)", expected: false, actual: test2Purring, pass: !test2Purring });

      // --- TEST 3: Caricia intencional simulada (movimiento de vaivén por ~1.6 segundos) ---
      resetPettingStroke();
      stopPurring();
      const strokeSteps = 16;
      for (let i = 0; i < strokeSteps; i++) {
        const offsetX = Math.sin(i * 0.8) * 12;
        const offsetY = Math.cos(i * 0.8) * 4;
        updatePurringAtPoint(headX + offsetX, headY + offsetY);
        await new Promise((r) => setTimeout(r, 100));
      }
      const test3Purring = document.body.dataset.purring === "1";
      logs.push({ test: "Intentional Petting Motion (~1.6s stroking)", expected: true, actual: test3Purring, pass: test3Purring });

      // --- TEST 4: Detener caricias al alejar el mouse ---
      updatePurringAtPoint(headX + 100, headY + 100);
      await new Promise((r) => setTimeout(r, 500));
      const test4Stopped = !document.body.dataset.purring;
      logs.push({ test: "Graceful Stop after leaving", expected: true, actual: test4Stopped, pass: test4Stopped });

      return logs;
    })()
  `);

  console.log("=== PETTING INTENTIONAL MOTION TEST SUITE ===");
  let allPass = true;
  for (const res of results) {
    console.log(`  [${res.pass ? "PASS" : "FAIL"}] ${res.test}: actual=${res.actual}, expected=${res.expected}`);
    if (!res.pass) allPass = false;
  }

  if (allPass) {
    console.log("=== ALL PETTING MOTION TESTS PASSED! ===");
    app.exit(0);
  } else {
    console.error("=== SOME TESTS FAILED! ===");
    app.exit(1);
  }
});
