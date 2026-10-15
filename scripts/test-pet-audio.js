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
  const pettingFiles=new Set(), pettingRecordings=new Set();
  for(const [id,profile]of Object.entries(profiles)){
    const result=await win.webContents.executeJavaScript(`(async()=>{
      applyMascot(${JSON.stringify(id)});
      const voice=getAudio(${JSON.stringify(id==='cat'||id==='musubi'?'completion':'dogBark')});
      const petting=getAudio(${JSON.stringify(id==='cat'||id==='musubi'?'purring':'dogPetting')});
      const ctx=new AudioContext();
      const decode=async audio=>{const bytes=await (await fetch(audio.src)).arrayBuffer();return await ctx.decodeAudioData(bytes);};
      const voiceBuffer=await decode(voice),pettingBuffer=await decode(petting);
      const samples=pettingBuffer.getChannelData(0);
      const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',samples))).map(x=>x.toString(16).padStart(2,'0')).join('');
      let peak=0;for(const sample of samples)peak=Math.max(peak,Math.abs(sample));
      await ctx.close();
      return {voice:voice.src,petting:petting.src,voiceDuration:voiceBuffer.duration,pettingDuration:pettingBuffer.duration,loop:petting.loop,fingerprint,peak};
    })()`,true);
    assert(result.voice.endsWith('/'+profile.voice),id+' voice mapping');
    assert(result.petting.endsWith('/'+profile.petting),id+' petting mapping');
    assert(result.voiceDuration>0&&result.voiceDuration<3&&result.pettingDuration>0&&result.loop,id+' real audio decoding');
    assert(result.peak>.001&&result.peak<1,id+' petting contains real audio without clipping');
    assert(!pettingFiles.has(profile.petting),id+' must not reuse another petting file');
    assert(!pettingRecordings.has(result.fingerprint),id+' must not copy another petting recording under a different name');
    pettingFiles.add(profile.petting);pettingRecordings.add(result.fingerprint);
    console.log('PASS:',id,'shared voice + petting decode');
  }
  assert(pettingFiles.size===6&&pettingRecordings.size===6,'All six pets have distinct decoded petting audio');
  console.log('PASS: six different petting recordings, verified from decoded audio');
  app.exit(0);
}).catch(error=>{console.error(error);app.exit(1)});
