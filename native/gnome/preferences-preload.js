"use strict";
const {contextBridge, ipcRenderer} = require("electron");
for (const channel of ["cat-name-changed", "mascot-changed", "key-pressed", "mouse-wheel", "do-jump",
  "do-stretch", "stretch-started", "pomodoro-focus-start", "reminder-triggered", "ai-task-complete",
  "ai-task-notification", "pomodoro-complete"])
  ipcRenderer.on(channel, (_event, data) => ipcRenderer.send("gnome:forward", channel, data));
contextBridge.exposeInMainWorld("catjangNative", {
  get: () => ipcRenderer.invoke("gnome:get-settings"),
  set: settings => ipcRenderer.invoke("gnome:set-settings", settings),
  reconnect: () => ipcRenderer.invoke("gnome:reconnect"),
  animate: name => ipcRenderer.invoke("gnome:animate", name),
  quit: () => ipcRenderer.send("gnome:quit"),
  onKeyboard: callback => { ipcRenderer.on("gnome:keyboard", (_event, state) => callback(state)); },
  onPetting: callback => { ipcRenderer.on("gnome:petting", (_event, active) => callback(active === true)); },
  onStatus: callback => { ipcRenderer.on("gnome:status", (_event, data) => callback(data)); },
});
