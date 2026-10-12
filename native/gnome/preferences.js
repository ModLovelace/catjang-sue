"use strict";
const purringAudio = new Audio();
purringAudio.loop = true;
purringAudio.volume = 0.28;
window.catjangNative.onPetting(active => {
  if (active) purringAudio.play().catch(failure);
  else { purringAudio.pause(); purringAudio.currentTime = 0; }
});
const field = id => document.getElementById(id);
function showStatus(data) { field("status").textContent = data.status; }
async function load() {
  const settings = await window.catjangNative.get();
  purringAudio.src = settings.purringSound;
  field("name").value = settings.name;
  field("nameVisible").checked = settings.nameVisible;
  field("size").value = settings.size;
  showStatus(settings);
  showKeyboard(settings.keyboard);
}
function failure(error) { showStatus({status: error.message}); }
function showKeyboard(state) {
  field('keyboard').textContent = state?.mode === 'global'
    ? 'Teclado del escritorio conectado. Cada pulsación mueve una pata; el ritmo acumula calor.'
    : 'Teclado local: responde en esta configuración. El lector del escritorio necesita acceso de lectura al teclado.';
}
window.catjangNative.onKeyboard(showKeyboard);
window.catjangNative.onStatus(showStatus);
field("settings").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const updated = await window.catjangNative.set({mascot: "cat", name: field("name").value.trim(),
      nameVisible: field("nameVisible").checked, size: Number(field("size").value)});
    showStatus({status: updated.connected ? "Ajustes guardados" : `Ajustes guardados en este equipo. ${updated.status}`});
  } catch (error) { failure(error); }
});
field("reconnect").addEventListener("click", () => window.catjangNative.reconnect().catch(failure));
field("quit").addEventListener("click", () => window.catjangNative.quit());
for (const button of document.querySelectorAll("[data-animation]"))
  button.addEventListener('click', () => window.catjangNative.animate(button.dataset.animation).catch(failure));

load().catch(failure);
