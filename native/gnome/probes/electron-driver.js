"use strict";
// Test driver loads the real project main.js; no mocked Electron or license bypass.
const {app, BrowserWindow} = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const root = process.env.CATJANG_GNOME_PROJECT;
const output = process.env.CATJANG_GNOME_DRIVER_DIR;
const profile = process.env.CATJANG_GNOME_QA_PROFILE;
app.setPath("userData", profile);
fs.mkdirSync(profile, {recursive: true});
const endpoint = require(path.join(root, "prototype-license/endpoint.js"));
if (!fs.existsSync(path.join(profile, "license.json"))) {
  endpoint.saveLicenseFile(path.join(profile, "license.json"),
    endpoint.activate("CATJANG-PROTO-DEMO-1234-5678-9ABC-DEF0", {platform: "linux"}).record);
  fs.writeFileSync(path.join(profile, "settings.json"), JSON.stringify({mascot: "cat", petSize: 200,
    catName: "Linux QA", catNamePromptShown: true, agentOnboardingShown: true,
    agentIntegrationsEnabled: false, stretchIntervalMin: 0, petPosition: {x: 800, y: 400}}));
}
require(path.join(root, "main.js"));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function write(name, data) {
  const file = path.join(output, name);
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(data));
  fs.renameSync(`${file}.tmp`, file);
}
let win;
let lastId = 0;
let busy = false;
app.whenReady().then(async () => {
  for (let attempt = 0; attempt < 100; attempt++) {
    win = BrowserWindow.getAllWindows().find(item => item.getTitle() === "Catjang — Configuración");
    if (win && !win.webContents.isLoading()) {
      const state = await win.webContents.executeJavaScript("window.catjangNative?.get()", true);
      if (state?.connected) {
        await win.webContents.executeJavaScript("window.qaPurr=[];window.catjangNative.onPetting(active=>{window.qaPurr.push({active,time:performance.now()});window.qaPurr=window.qaPurr.slice(-32)});true",true);
        write("ready.json", state); break;
      }
    }
    await sleep(100);
  }
  if (!win) throw new Error("Real application did not create its configuration window");
  setInterval(async () => {
    if (busy || !fs.existsSync(path.join(output, "command.json"))) return;
    const command = JSON.parse(fs.readFileSync(path.join(output, "command.json"), "utf8"));
    if (command.id === lastId) return;
    lastId = command.id; busy = true;
    try {
      if(command.action==='inspect-agent-setup'){
        const setup=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/agents-setup/'));
        if(!setup || setup.webContents.isLoading())throw new Error('Agent setup was not opened by the context menu');
        const state=await setup.webContents.executeJavaScript('window.electronAPI.agentStatusGet()',true);
        if(state.enabled||state.serverActive)throw new Error('Opening setup enabled agents without consent');
        setup.close();
      } else if(command.action==='agent-consent'){
        await win.webContents.executeJavaScript("window.catjangNative.feature('agents-setup')",true);
        let setup;
        for(let i=0;i<50;i++){
          setup=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/agents-setup/'));
          if(setup&&!setup.webContents.isLoading())break;await sleep(100);
        }
        if(!setup)throw new Error('Agent onboarding did not open');
        const before=await setup.webContents.executeJavaScript('window.electronAPI.agentStatusGet()',true);
        if(before.enabled||before.serverActive)throw new Error('Agents started without consent');
        await setup.webContents.executeJavaScript("document.getElementById('btn-sync').click()",true);
        let after;
        for(let i=0;i<50;i++){after=await setup.webContents.executeJavaScript('window.electronAPI.agentStatusGet()',true);if(after.enabled&&after.serverActive)break;await sleep(100);}
        if(!after.enabled||!after.serverActive)throw new Error('Agent consent did not start the server');
        setup.close();await sleep(150);
      } else if(command.action==='agent-http'){
        const body=JSON.stringify(command.settings);
        await new Promise((resolve,reject)=>{
          const req=require('node:http').request({hostname:'127.0.0.1',port:23456,path:'/agent-state',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{res.resume();res.on('end',()=>res.statusCode===200?resolve():reject(new Error('HTTP status '+res.statusCode)));});
          req.on('error',reject);req.end(body);
        });await sleep(120);
      } else if(command.action==='agent-hook'){
        const script=path.join(profile,'hooks',command.settings.agent==='cursor'?'catjang-cursor-hook.js':'catjang-antigravity-hook.js');
        const result=cp.spawnSync(process.execPath,[script,command.settings.event],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},input:JSON.stringify(command.settings.payload),encoding:'utf8',timeout:5000});
        if(result.status!==0)throw new Error(result.stderr||'Hook failed');await sleep(180);
      } else if (command.action === "submit-form") {
        await win.webContents.executeJavaScript(`(() => {
          const patch=${JSON.stringify(command.settings)};
          document.getElementById('name').value=patch.name;
          document.getElementById('nameVisible').checked=patch.nameVisible;
          document.getElementById('size').value=patch.size;
          document.getElementById('settings').requestSubmit();
        })()`, true);
        await sleep(350);
      } else if (command.action === "reconnect-burst") {
        await win.webContents.executeJavaScript("Promise.all([window.catjangNative.reconnect(),window.catjangNative.reconnect(),window.catjangNative.reconnect()])", true);
        await sleep(900);
      } else if (command.action === 'feature') {
        await win.webContents.executeJavaScript(`window.catjangNative.feature(${JSON.stringify(command.settings.action)},${JSON.stringify(command.settings.payload)})`, true);
      } else if (command.action === 'ui') {
        await win.webContents.executeJavaScript(command.settings, true);
        await sleep(200);
      } else if (command.action === 'capture-window') {
        win.show(); await sleep(150);
        fs.writeFileSync(path.join(output,command.settings),(await win.webContents.capturePage()).toPNG());
      } else if (command.action === "configure") {
        await win.webContents.executeJavaScript(`window.catjangNative.set(${JSON.stringify(command.settings)})`, true);
      } else if (command.action === "animate") {
        await win.webContents.executeJavaScript(`document.querySelector('[data-animation="jump"]').click()`, true);
        await sleep(150);
      } else if (command.action === "reconnect") {
        await win.webContents.executeJavaScript("window.catjangNative.reconnect()", true);
        await sleep(700);
      } else if (command.action === "kill-helper") {
        const children = cp.execFileSync('ps', ['--ppid', String(process.pid), '-o', 'pid=,args='], {encoding: 'utf8'});
        const line = children.split('\n').find(item => item.includes('/client.py'));
        if (!line) throw new Error('No live native helper found');
        process.kill(Number(line.trim().split(/\s+/)[0]), 'SIGKILL');
        await sleep(300);
      } else if (command.action === "typing-burst") {
        win.show(); win.focus();
        await sleep(100);
        for (let index = 0; index < command.settings.count; index++) {
          win.webContents.sendInputEvent({type: 'keyDown', keyCode: 'A'});
          win.webContents.sendInputEvent({type: 'keyUp', keyCode: 'A'});
          await sleep(command.settings.delay);
        }
      } else if (command.action === "pose") {
        await win.webContents.executeJavaScript(`window.catjangNative.animate(${JSON.stringify(command.settings)})`, true);
      } else if (command.action === "hide") win.close();
      else if (command.action === "quit") {
        write("reply.json", {id: command.id, ok: true});
        await win.webContents.executeJavaScript("window.catjangNative.quit()", true);
        return;
      }
      const state = await win.webContents.executeJavaScript("window.catjangNative.get()", true);
      write("reply.json", {id: command.id, ok: true, state,
        features: await win.webContents.executeJavaScript('window.catjangNative.getFeatures()', true),
        windowVisible: win.isVisible(),
        audio: await win.webContents.executeJavaScript("({paused:purringAudio.paused,time:purringAudio.currentTime,ready:purringAudio.readyState,network:purringAudio.networkState,transitions:window.qaPurr,error:purringAudio.error?.message??null})", true),
        saved: JSON.parse(fs.readFileSync(path.join(profile, "settings.json"), "utf8"))});
    } catch (error) { write("reply.json", {id: command.id, ok: false, error: error.message}); }
    finally { busy = false; }
  }, 50);
}).catch(error => { write("driver-error.json", {error: error.stack}); app.exit(1); });
