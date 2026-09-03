"use strict";

const badgeGemini = document.getElementById("badge-gemini");
const badgeCodex = document.getElementById("badge-codex");
const badgeClaude = document.getElementById("badge-claude");
const badgeCursor = document.getElementById("badge-cursor");

const btnTest = document.getElementById("btn-test");
const btnSync = document.getElementById("btn-sync");
const btnDone = document.getElementById("btn-done");

async function refreshStatus() {
  if (!window.electronAPI || !window.electronAPI.agentStatusGet) return;
  try {
    const status = await window.electronAPI.agentStatusGet();
    if (status.antigravityInstalled) {
      badgeGemini.textContent = "Conectado";
      badgeGemini.classList.add("is-active");
    } else {
      badgeGemini.textContent = "No instalado";
      badgeGemini.classList.remove("is-active");
    }

    if (status.claudeInstalled) {
      badgeClaude.textContent = "Sincronizado";
      badgeClaude.classList.add("is-active");
    } else {
      badgeClaude.textContent = "No instalado";
      badgeClaude.classList.remove("is-active");
    }

    if (status.cursorInstalled) {
      badgeCursor.textContent = "Sincronizado";
      badgeCursor.classList.add("is-active");
    } else {
      badgeCursor.textContent = "No instalado";
      badgeCursor.classList.remove("is-active");
    }

    badgeCodex.textContent = "Monitoreo Activo";
    badgeCodex.classList.add("is-active");
  } catch (err) {
    console.error("Error al obtener estado de agentes:", err);
  }
}

btnTest.addEventListener("click", async () => {
  if (!window.electronAPI || !window.electronAPI.agentTestNotify) return;
  btnTest.disabled = true;
  btnTest.textContent = "🐾 Avisando a Catjang...";
  try {
    await window.electronAPI.agentTestNotify({
      text: "¡Conexión establecida con tus agentes!",
    });
  } catch {}
  setTimeout(() => {
    btnTest.disabled = false;
    btnTest.textContent = "🐾 Probar aviso con la mascota";
  }, 1200);
});

btnSync.addEventListener("click", async () => {
  if (!window.electronAPI || !window.electronAPI.agentHooksInstall) return;
  btnSync.disabled = true;
  btnSync.textContent = "Sincronizando...";
  try {
    await window.electronAPI.agentHooksInstall();
    await refreshStatus();
    btnSync.textContent = "✓ Sincronizados";
  } catch (err) {
    btnSync.textContent = "Error";
  }
  setTimeout(() => {
    btnSync.disabled = false;
    btnSync.textContent = "Sincronizar Hooks";
  }, 1500);
});

btnDone.addEventListener("click", async () => {
  if (window.electronAPI && window.electronAPI.agentOnboardingComplete) {
    await window.electronAPI.agentOnboardingComplete();
  } else {
    window.close();
  }
});

refreshStatus();
