"use strict";
const { spawn } = require("node:child_process");
const readline = require("node:readline");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {formatAgentEvent}=require("./agent-messages");

// Loaded only by the explicit Linux GNOME branch in main.js.
function createNativeController({ app, BrowserWindow, ipcMain, getSettings, updateSettings, onPosition, onClosed, features }) {
  const catalog = require('./catalog.json');
  let catalogSupported = false;
  let extensionVersion = null;
  const featureService = require('./features').createFeatures(features);
  let controlsSupported = false;
  let child = null;
  let reader = null;
  let sequence = 0;
  let stopping = false;
  let connected = false;
  let status = "Conectando con GNOME…";
  let heartbeat = null;
  let connectionAttempt = null;
  let attachTimer = null;
  let keyboardChild = null;
  let keyboardReader = null;
  let keyboard = {mode: 'local', devices: 0};
  const requests = new Map();
  const root = __dirname;
  const win = new BrowserWindow({width: 560, height: 760, title: "Catjang — Configuración",
    show: false, backgroundColor: "#17212f", webPreferences: {
      preload: path.join(root, "preferences-preload.js"), contextIsolation: true,
      nodeIntegration: false, sandbox: true, autoplayPolicy: "no-user-gesture-required",
    }});
  win.setMenu(null);

  function settings() {
    return { ...getSettings(), visible: true };
  }
  function present() {
    if (win.isDestroyed()) return;
    win.show();
    win.focus();
  }
  function openPanel(panel = 'settings') {
    present();
    win.webContents.send('gnome:panel', panel);
  }
  function controls() {
    const state = featureService.get();
    return {pomodoroRunning: state.pomodoro.running, stretchIntervalMin: state.stretchIntervalMin,
      nameVisible: getSettings().nameVisible, fixedMessage: state.fixedMessage};
  }
  async function synchronizeControls() {
    if (connected && controlsSupported) await request('SetControls', controls());
  }
  function publishFeatures() {
    if (!win.isDestroyed()) win.webContents.send('gnome:features', featureService.get());
    synchronizeControls().catch(report);
  }
  async function contextAction(action) {
    const panels = {preferences: 'settings', reminders: 'reminders', 'pomodoro-settings': 'pomodoro'};
    if (panels[action]) { openPanel(panels[action]); return; }
    if (action.startsWith('mascot-')) {
      const mascot = action.slice(7);
      if (!Object.hasOwn(catalog,mascot)) return;
      if (!catalogSupported) throw new Error('Actualiza la extensión y vuelve a iniciar sesión para elegir otras mascotas');
      updateSettings({...getSettings(),mascot}); await synchronize(); await synchronizeControls(); publishSettings(); return;
    }
    if (action === 'quit') { app.quit(); return; }
    if (['jump', 'stretch'].includes(action)) { await animate(action); return; }
    if (['size-smaller', 'size-larger', 'name-toggle'].includes(action)) {
      const current = getSettings();
      updateSettings({...current, size: action === 'name-toggle' ? current.size :
        Math.max(40, Math.min(400, current.size + (action === 'size-larger' ? 20 : -20))),
        nameVisible: action === 'name-toggle' ? !current.nameVisible : current.nameVisible});
      await synchronize(); publishFeatures(); return;
    }
    if (action === 'pomodoro-toggle') action = featureService.get().pomodoro.running ? 'pomodoro-pause' : 'pomodoro-start';
    if (['pomodoro-start', 'pomodoro-pause', 'pomodoro-reset', 'agents-setup'].includes(action)) {
      featureService.execute(action); publishFeatures();
    }
  }
  function publish(message) {
    if (!connected && !win.isDestroyed()) win.webContents.send("gnome:petting", false);
    status = message;
    if (!win.isDestroyed()) win.webContents.send("gnome:status", {connected, status});
  }
  function request(method, value) {
    if (!child || !child.stdin.writable) return Promise.reject(new Error("El puente GNOME no está conectado"));
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { requests.delete(id); reject(new Error("GNOME no respondió a tiempo")); }, 4500);
      requests.set(id, {resolve, reject, timer});
      child.stdin.write(`${JSON.stringify({id, method, value})}\n`, error => {
        if (error && requests.has(id)) {
          clearTimeout(timer); requests.delete(id); reject(error);
        }
      });
    });
  }
  function failPending() {
    for (const item of requests.values()) {
      clearTimeout(item.timer);
      item.reject(new Error("El puente GNOME se cerró"));
    }
    requests.clear();
  }
  function report(error) {
    stopKeyboard();
    connected = false;
    publish(`No se pudo conectar la mascota: ${error.message}. Prepara la extensión GNOME y pulsa Reconectar.`);
  }
  async function synchronize() {
    if (!connected) return;
    try {
      await request("Update", settings());
      await synchronizeControls();
    } catch (error) { report(error); }
  }
  async function animate(name) {
    if(name==='stretch' && !catalog[getSettings().mascot].stretchSupported)return;
    if (!connected) return;
    try { await request("Animate", name); } catch (error) { report(error); }
  }
  async function forward(channel, data) {
    if(channel==='ai-task-state'){
      if(connected && extensionVersion>=5 && ['thinking','working','idle','error'].includes(data?.state))
        await request('SetActivity',{state:data.state,text:formatAgentEvent(data)});
      return;
    }
    if (['pomodoro-state', 'reminders-changed', 'user-name-changed', 'fixed-message-changed',
      'task-complete-sound-volume', 'language-changed'].includes(channel)) publishFeatures();
    if (["cat-name-changed", "mascot-changed"].includes(channel)) { await synchronize(); publishSettings(); }
    const animations = {"key-pressed": "typing", "mouse-wheel": "scroll", "do-jump": "jump",
      "do-stretch": "stretch", "stretch-started": "stretch", "pomodoro-focus-start": "jump"};
    if (animations[channel]) await animate(animations[channel]);
    if (["reminder-triggered", "ai-task-complete", "ai-task-notification", "pomodoro-complete"].includes(channel) && connected) {
      const ai=channel.startsWith('ai-task-');
      const state=channel==='ai-task-complete'?'complete':'notification';
      const text = ai ? formatAgentEvent(data,state) : channel === 'pomodoro-complete'
        ? (data?.completedMode === 'focus' ? 'Terminó el enfoque. Es momento de descansar.' : 'Terminó el descanso. Volvemos al enfoque.')
        : String(data?.text || data?.message || data?.title || "Tarea completada").slice(0, 512);
      if (!win.isDestroyed()) win.webContents.send('gnome:alert', {text,
        sound: channel === 'reminder-triggered' ? 'reminder' : 'completion', volume: featureService.get().taskCompleteSoundVolume});
      try {
        if(extensionVersion>=5)await request('SetActivity',{state,text});
        else if(channel==='ai-task-complete')await animate('jump');
        await request("Notify", text);
      } catch (error) { report(error); }
    }
  }
  function stopKeyboard() {
    const old = keyboardChild; keyboardChild = null;
    keyboardReader?.close(); keyboardReader = null;
    keyboard = {mode: 'local', devices: 0};
    if (old) {
      old.stdin.end();
      const timer = setTimeout(() => old.kill('SIGTERM'), 1000); timer.unref();
      old.once('exit', () => clearTimeout(timer));
    }
  }
  function startKeyboard() {
    if (process.env.CATJANG_GNOME_INPUT_SOURCE === 'local') return;
    const worker = spawn('python3', [path.join(root, 'keyboard-counter.py')], {stdio: ['pipe', 'pipe', 'pipe']});
    keyboardChild = worker;
    worker.stderr.on('data', () => {});
    keyboardReader = readline.createInterface({input: worker.stdout});
    keyboardReader.on('line', line => {
      if (keyboardChild !== worker || !connected || line.length > 256) return;
      let item; try { item = JSON.parse(line); } catch { return; }
      if (item.event === 'typing' && keyboard.mode === 'global') animate('typing');
      else if (item.event === 'status' && Number.isInteger(item.devices) && item.devices >= 0) {
        keyboard = {mode: item.devices > 0 ? 'global' : 'local', devices: item.devices};
        if (!win.isDestroyed()) win.webContents.send('gnome:keyboard', keyboard);
      }
    });
    worker.on('error', () => { if (keyboardChild === worker) stopKeyboard(); });
    worker.once('exit', () => {
      if (keyboardChild !== worker) return;
      keyboardChild = null; keyboard = {mode: 'local', devices: 0};
      if (!win.isDestroyed()) win.webContents.send('gnome:keyboard', keyboard);
    });
  }
  function stopHelper() {
    if(attachTimer)clearTimeout(attachTimer); attachTimer=null;
    stopKeyboard();
    const old = child;
    child = null;
    connected = false;
    if (!win.isDestroyed()) win.webContents.send("gnome:petting", false);
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
    reader?.close(); reader = null;
    failPending();
    // EOF makes the helper detach its unique owner before exiting. SIGTERM
    // is a bounded backup if a D-Bus request is temporarily stalled.
    if (old) {
      old.stdin.end();
      const killTimer = setTimeout(() => old.kill("SIGTERM"), 3500);
      killTimer.unref();
      return new Promise(resolve => old.once("exit", () => { clearTimeout(killTimer); resolve(); }));
    }
    return Promise.resolve();
  }
  function connect() {
    if (connectionAttempt) return connectionAttempt;
    // Repeated clicks share one attempt; two helpers must never compete for
    // the same native owner while an earlier helper is still detaching.
    connectionAttempt = connectOnce().finally(() => { connectionAttempt = null; });
    return connectionAttempt;
  }
  async function connectOnce() {
    await stopHelper();
    if (stopping) return;
    publish("Conectando con GNOME…");
    const process = spawn("python3", [path.join(root, "client.py")], {stdio: ["pipe", "pipe", "pipe"]});
    child = process;
    // Drain diagnostics without logging user input or promoting it to commands.
    process.stderr.on("data", () => {});
    reader = readline.createInterface({input: process.stdout});
    reader.on("line", async line => {
      if (child !== process || line.length > 16384) return;
      let event;
      try { event = JSON.parse(line); } catch { return; }
      if (event.id) {
        const pending = requests.get(event.id);
        if (!pending) return;
        clearTimeout(pending.timer); requests.delete(event.id);
        if (event.ok) pending.resolve(event.state);
        else pending.reject(new Error(event.error || "Solicitud rechazada por GNOME"));
      } else if (event.event === "ready") {
        attachWhenReady(process);
      } else if (connected && event.event === "position" && Number.isInteger(event.x) && Number.isInteger(event.y)) {
        onPosition({x: event.x, y: event.y});
      } else if (connected && event.event === "preferences") present();
      else if (connected && event.event === 'context') contextAction(event.action).catch(error => publish(`No se pudo realizar la acción: ${error.message}`));
      else if (connected && event.event === "petting") win.webContents.send("gnome:petting", event.active === true);
    });
    process.once("error", error => { if (child === process) { failPending(); report(error); } });
    process.once("exit", () => {
      if (child !== process) return;
      child = null; stopKeyboard(); failPending(); connected = false;
      if (heartbeat) clearInterval(heartbeat);
      heartbeat = null;
      if (!stopping) publish("El puente GNOME se cerró. Pulsa Reconectar para volver a abrirlo.");
    });
  }
  async function attachWhenReady(helper, attempt=0) {
    if(child!==helper || stopping)return;
    try {
      const attached = await request("Attach", settings());
      if (child !== helper || stopping) return;
      connected = true;
      extensionVersion = attached.version;
      catalogSupported = attached.version >= 4;
      controlsSupported = attached.version >= 3;
      await synchronizeControls();
      startKeyboard();
      console.log(`[Catjang GNOME] Attached to extension v${extensionVersion}`);
      publish("Mascota conectada a GNOME"); publishSettings();
      heartbeat = setInterval(() => request("GetState").catch(error => { if (child === helper) report(error); }), 5000);
    } catch (error) {
      if(child!==helper || stopping)return;
      const pending=/UnknownMethod|UnknownObject|ServiceUnknown|NameHasNoOwner|NoReply|Timeout|timed out|tiempo/i.test(error.message);
      if(!connected && pending && attempt<8){
        publish('Esperando a que GNOME termine de cargar la mascota…');
        console.log('[Catjang GNOME] Waiting for native extension readiness');
        attachTimer=setTimeout(()=>{attachTimer=null;attachWhenReady(helper,attempt+1);},Math.min(2000,250*2**attempt));
      }else report(error);
    }
  }
  function authorized(event) {
    if (event.sender !== win.webContents) throw new Error("Ventana de configuración no autorizada");
  }
  const audioRoot=path.join(app.isPackaged?app.getAppPath():path.join(root,'../..'),'workspace/assets/sound');
  const audioProfiles=require(path.join(audioRoot,'pet-audio.js'));
  const sound = name => pathToFileURL(path.join(audioRoot,name)).href;
  function uiSettings() {
    const current = getSettings(), audio=audioProfiles[current.mascot];
    return {...current,connected,status,keyboard,catalog,catalogSupported,extensionVersion,paritySupported:extensionVersion>=5,
      purringSound:sound(audio.petting),pettingVolume:audio.pettingVolume,completionSound:sound(audio.voice),reminderSound:sound(audio.voice)};
  }
  function publishSettings() { if (!win.isDestroyed()) win.webContents.send('gnome:settings',uiSettings()); }
  ipcMain.handle("gnome:get-settings", event => { authorized(event); return uiSettings(); });
  ipcMain.handle('gnome:get-features', event => { authorized(event); return featureService.get(); });
  ipcMain.handle('gnome:feature-action', (event, action, payload) => {
    authorized(event);
    const result = featureService.execute(action, payload); publishFeatures(); return result;
  });
  ipcMain.handle("gnome:set-settings", async (event, patch) => {
    authorized(event);
    if (!patch || !Object.hasOwn(catalog, patch.mascot) || typeof patch.name !== "string" || patch.name.length > 24 ||
        typeof patch.nameVisible !== "boolean" || !Number.isInteger(patch.size) || patch.size < 40 || patch.size > 400)
      throw new Error("Ajustes inválidos para Catjang");
    if (patch.mascot !== 'cat' && !catalogSupported) throw new Error('Actualiza la extensión y vuelve a iniciar sesión para elegir otras mascotas');
    updateSettings(patch);
    await synchronize(); await synchronizeControls(); publishSettings();
    if (!connected) await connect();
    return uiSettings();
  });
  ipcMain.handle("gnome:reconnect", event => { authorized(event); connect(); });
  ipcMain.handle("gnome:animate", (event, name) => {
    authorized(event);
    if (!["typing", "scroll", "jump", "stretch"].includes(name)) throw new Error("Animación inválida");
    return animate(name);
  });
  const forwardListener = (event, channel, data) => {
    if (event.sender === win.webContents) forward(channel, data).catch(report);
  };
  ipcMain.on("gnome:forward", forwardListener);
  const quit = event => { if (event.sender === win.webContents) app.quit(); };
  ipcMain.on("gnome:quit", quit);
  const beforeQuit = event => {
    if (!stopping && child) {
      event.preventDefault();
      stopping = true;
      stopHelper().finally(() => app.quit());
    } else { stopping = true; stopHelper(); }
  };
  app.on("before-quit", beforeQuit);
  win.webContents.on("before-input-event", (_event, input) => {
    if (keyboard.mode !== "global" && input.type === "keyDown" && !input.control && !input.meta && !input.alt && input.key.length === 1)
      animate("typing");
  });
  win.on("close", event => { if (!stopping) { event.preventDefault(); win.hide(); } });
  win.on("closed", () => {
    stopping = true; stopHelper();
    for (const name of ["gnome:get-settings", "gnome:set-settings", "gnome:reconnect", "gnome:animate", 'gnome:get-features', 'gnome:feature-action']) ipcMain.removeHandler(name);
    ipcMain.removeListener("gnome:quit", quit);
    // Remove only this controller's forwarding listener and lifecycle handler.
    ipcMain.removeListener("gnome:forward", forwardListener);
    app.removeListener("before-quit", beforeQuit);
    onClosed();
  });
  // A hidden Wayland surface may not paint, so do not wait for its first
  // frame before mapping preferences. The fully loaded page shows progress.
  win.webContents.once("did-finish-load", () => { present(); connect(); });
  win.loadFile(path.join(root, "preferences.html"));
  return {window: win, synchronize, animate, present,
    close() { stopping = true; stopHelper(); win.destroy(); },
    get connected() { return connected; }};
}
module.exports = { createNativeController };
