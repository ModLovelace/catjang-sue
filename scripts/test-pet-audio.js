"use strict";

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const assert = require("assert");

console.log("=== SHARED PET AUDIO IN THE REAL ELECTRON RENDERER ===");

const root=process.env.CATJANG_QA_APP_ROOT || path.join(__dirname,"..");
app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 300,
    height: 300,
    show: false,
    webPreferences: {
      preload: path.join(root, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  let currentMascot = "cat";
  ipcMain.handle("mascot-get", () => currentMascot);
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

  await win.loadFile(path.join(root, "renderer", "index.html"));
  await new Promise((r) => setTimeout(r, 600));

  const profiles=require(path.join(root,'workspace/assets/sound/pet-audio.js'));
  for(const [id,profile]of Object.entries(profiles)){
    const result=await win.webContents.executeJavaScript(`(async()=>{
      applyMascot(${JSON.stringify(id)});
      const voice=getAudio(${JSON.stringify(id==='cat'||id==='musubi'?'completion':'dogBark')});
      const petting=getAudio(${JSON.stringify(id==='cat'||id==='musubi'?'purring':'dogPetting')});
      const ctx=new AudioContext();
      const decode=async audio=>{const bytes=await (await fetch(audio.src)).arrayBuffer();return (await ctx.decodeAudioData(bytes)).duration;};
      const voiceDuration=await decode(voice),pettingDuration=await decode(petting);await ctx.close();
      return {voice:voice.src,petting:petting.src,voiceDuration,pettingDuration,loop:petting.loop};
    })()`,true);
    assert(result.voice.endsWith('/'+profile.voice),id+' voice mapping');
    assert(result.petting.endsWith('/'+profile.petting),id+' petting mapping');
    assert(result.voiceDuration>0&&result.voiceDuration<3&&result.pettingDuration>0&&result.loop,id+' real audio decoding');
    console.log('PASS:',id,'shared voice + petting decode');
  }
  app.exit(0);
}).catch(error=>{console.error(error);app.exit(1)});
