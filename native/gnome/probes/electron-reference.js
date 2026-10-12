'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=process.env.CATJANG_GNOME_PROJECT;
const output=process.env.CATJANG_PROTOTYPE_OUTPUT;
const profile=path.join(process.env.XDG_RUNTIME_DIR,'electron-reference');
app.setPath('userData',profile);fs.mkdirSync(profile,{recursive:true});
const endpoint=require(path.join(root,'prototype-license/endpoint.js'));
endpoint.saveLicenseFile(path.join(profile,'license.json'),endpoint.activate('CATJANG-PROTO-DEMO-1234-5678-9ABC-DEF0',{platform:'linux'}).record);
fs.writeFileSync(path.join(profile,'settings.json'),JSON.stringify({mascot:'cat',petSize:200,catName:'Referencia Electron',catNamePromptShown:true,agentOnboardingShown:true,agentIntegrationsEnabled:false,stretchIntervalMin:0,petPosition:{x:200,y:50}}));
process.env.CATJANG_LINUX_BACKEND='classic';process.env.CATJANG_ENABLE_GLOBAL_INPUT='0';process.env.CATJANG_ENABLE_AGENT_INTEGRATIONS='0';
require(path.join(root,'main.js'));
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
app.whenReady().then(async()=>{
 let win;
 for(let i=0;i<150;i++){
  win=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().includes('/renderer/index.html'));
  if(win&&!win.webContents.isLoading()&&await win.webContents.executeJavaScript('Boolean(endData && startYsByIdx.length)',true))break;
  await sleep(100);
 }
 if(!win)throw Error('Classic Electron renderer did not open');
 win.webContents.setBackgroundThrottling(false);win.showInactive();
 win.setBounds({x:200,y:40,width:420,height:660});await sleep(500);
 await win.webContents.executeJavaScript('cancelDragStretchState()',true);await sleep(500);
 const phases=[];
 async function capture(name){
  fs.writeFileSync(path.join(output,name+'.png'),(await win.webContents.capturePage()).toPNG());
  const state=await win.webContents.executeJavaScript('({stretch:stretchT,segments:endData?.wrappers.length,press:document.body.dataset.press??null,heat:currentHeat,dragging,releasing,classes:document.body.className,dragDisplay:getComputedStyle(stretchEndObj).display,idleDisplay:getComputedStyle(obj).display})',true);
  phases.push({name,...state});
 }
 await capture('electron-idle');
 await win.webContents.executeJavaScript('for(let i=0;i<5;i++)handleKeyPress()',true);await capture('electron-press');
 await win.webContents.executeJavaScript('handleKeyPress()',true);await capture('electron-other-paw');
 await sleep(400);
 await win.webContents.executeJavaScript('beginDragStretch({screenX:300,screenY:200,clientX:100,clientY:100})',true);
 await sleep(50);await capture('electron-compressed');
 await sleep(350);await capture('electron-extended');
 await win.webContents.executeJavaScript('pendulumVelAngle=12;lastWiggleDx=35;lastDragMoveAt=Date.now()',true);
 await sleep(120);await capture('electron-body-sway');
 await win.webContents.executeJavaScript('finishDragStretch()',true);await sleep(60);await capture('electron-spring-release');
 await sleep(450);await capture('electron-restored');
 fs.writeFileSync(path.join(output,'electron-reference.json'),JSON.stringify({timestampUtc:new Date().toISOString(),phases,
  source:'Actual main.js + renderer/renderer.js in Electron 43.1.0; original animation functions, private demo profile',
  limitations:['Renderer capture is an animation reference, not a desktop acceptance test','Linux Electron branch; Windows/macOS runtime was not exercised']},null,2));
 app.quit();
}).catch(error=>{fs.writeFileSync(path.join(output,'reference-error.json'),JSON.stringify({error:error.stack}));console.error(error);app.exit(1);});
