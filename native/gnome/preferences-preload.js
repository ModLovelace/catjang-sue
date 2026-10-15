"use strict";
const {contextBridge, ipcRenderer} = require("electron");
for (const channel of ["cat-name-changed", "mascot-changed", "key-pressed", "mouse-wheel", "do-jump",
  "do-stretch", "stretch-started", "pomodoro-focus-start", "reminder-triggered", "ai-task-complete",
  "ai-task-notification", "ai-task-state", "pomodoro-complete", 'pomodoro-state', 'reminders-changed',
  'user-name-changed', 'fixed-message-changed', 'task-complete-sound-volume', 'language-changed'])
  ipcRenderer.on(channel, (_event, data) => ipcRenderer.send("gnome:forward", channel, data));
contextBridge.exposeInMainWorld("catjangNative", {
  get: () => ipcRenderer.invoke("gnome:get-settings"),
  getFeatures: () => ipcRenderer.invoke('gnome:get-features'),
  feature: (action, payload) => ipcRenderer.invoke('gnome:feature-action', action, payload),
  set: settings => ipcRenderer.invoke("gnome:set-settings", settings),
  reconnect: () => ipcRenderer.invoke("gnome:reconnect"),
  animate: name => ipcRenderer.invoke("gnome:animate", name),
  quit: () => ipcRenderer.send("gnome:quit"),
  onSettings: callback => { ipcRenderer.on('gnome:settings', (_event,state) => callback(state)); },
  onKeyboard: callback => { ipcRenderer.on("gnome:keyboard", (_event, state) => callback(state)); },
  onPetting: callback => { ipcRenderer.on("gnome:petting", (_event, active) => callback(active === true)); },
  onStatus: callback => { ipcRenderer.on("gnome:status", (_event, data) => callback(data)); },
  onFeatures: callback => { ipcRenderer.on('gnome:features', (_event, data) => callback(data)); },
  onPanel: callback => { ipcRenderer.on('gnome:panel', (_event, panel) => callback(panel)); },
  onAlert: callback => { ipcRenderer.on('gnome:alert', (_event, data) => callback(data)); },
});
