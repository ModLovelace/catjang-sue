import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {read,waitFor,command,startDriver,capture} from './integration.js';
export const METRICS={};
const output=GLib.getenv('CATJANG_PROTOTYPE_OUTPUT'),observations=[];
function assert(value,message){if(!value)throw new Error(message);observations.push(message);console.log(`[Catjang titles] ${message}`);}
export async function run(){
 await Scripting.waitTestWindows();await Scripting.sleep(1000);Main.overview.hide();await Scripting.sleep(350);
 const dir=`${output}/driver`,pet=Main.extensionManager.lookup('catjang-native@modlovelace.github.io').stateObj;
 const original=pet._control,notices=[];
 pet._control=function(method,parameters,invocation){if(method==='Notify')notices.push(parameters[0]);return original.call(this,method,parameters,invocation);};
 const app=startDriver(dir,{agents:true,autoAgents:true});
 const ids={a:'11111111-1111-4111-8111-111111111111',b:'22222222-2222-4222-8222-222222222222',c:'33333333-3333-4333-8333-333333333333',d:'44444444-4444-4444-8444-444444444444'};
 try{
  await waitFor(()=>read(`${dir}/ready.json`),'Application failed to attach');
  assert((await command(dir,'agent-status')).status.serverActive,'Isolated application owns the notification port before sending any hook events');
  const fixtures=await command(dir,'title-fixtures',{codex:[{id:ids.a,title:'Pagos: corregir autenticación'},{id:ids.b,title:'Pagos: completar documentación'}],antigravity:{id:ids.c,title:'Estabilizar Ubuntu Wayland'},claude:{id:ids.d,title:'Revisar permisos del calendario'}});
  await command(dir,'ui',"window.qaAlerts=[];window.catjangNative.onAlert(data=>window.qaAlerts.push(data.text));true");
  await command(dir,'hide');
  await command(dir,'agent-hook',{agent:'antigravity',event:'PreInvocation',payload:{conversationId:ids.c,workspacePaths:['/tmp/same-workspace']}});
  assert(pet._messageLabel.text.includes('Estabilizar Ubuntu Wayland'),'Antigravity resolves its real summary title before completion');
  await command(dir,'agent-hook',{agent:'antigravity',event:'Stop',payload:{conversationId:ids.c,workspacePaths:['/tmp/same-workspace']}});
  assert(pet._messageLabel.text.startsWith('Antigravity · «Estabilizar Ubuntu Wayland» — tarea completada.'),'Antigravity completion includes its platform and exact chat title');
  await capture('antigravity-complete-title.png');
  await command(dir,'agent-hook',{agent:'claude',event:'UserPromptSubmit',payload:{session_id:ids.d,cwd:'/tmp/same-workspace',transcript_path:fixtures.transcriptPath,prompt:'Actualizar dos permisos'}});
  await command(dir,'agent-hook',{agent:'claude',event:'Stop',payload:{session_id:ids.d,cwd:'/tmp/same-workspace'}});
  assert(pet._messageLabel.text.startsWith('Claude Code · «Revisar permisos del calendario» — tarea completada.'),'Claude retains the renamed chat title even when Stop omits it and its transcript path');
  assert(pet._messageLabel.text.includes('Actualizar dos permisos'),'Completion also retains the task detail from the start event');
  for(const sessionId of [ids.a,ids.b])await command(dir,'codex-fixture',{sessionId,events:[
   {type:'session_meta',payload:{cwd:'/tmp/same-workspace'}},
   {type:'event_msg',payload:{type:'user_message',message:'same initial prompt'}},
   {type:'event_msg',payload:{type:'task_complete'}},
  ]});
  for(const title of ['Pagos: corregir autenticación','Pagos: completar documentación']){
   await waitFor(()=>notices.some(text=>text.startsWith(`Codex · «${title}» — tarea completada.`)),`Codex notification lost ${title}`);
   assert(true,`Codex independently identifies the completed chat «${title}» from its stored name`);
  }
  await command(dir,'ui',"if(!window.qaAlerts.some(text=>text.startsWith('Codex · «Pagos: corregir autenticación»'))||!window.qaAlerts.some(text=>text.startsWith('Claude Code · «Revisar permisos del calendario»')))throw new Error('Notification text lost in preferences');true");
  assert(notices.some(text=>text.startsWith('Antigravity · «Estabilizar Ubuntu Wayland»'))&&notices.some(text=>text.startsWith('Claude Code · «Revisar permisos del calendario»')),'Real D-Bus Notify receives platform and chat titles, matching native speech and preferences alerts');
  await capture('codex-complete-titles.png');
  await command(dir,'quit');await waitFor(()=>!pet._owner,'Quit failed to detach');
  assert(!pet._activity&&!pet._grab,'Controller exit clears title activity and native ownership');
  GLib.file_set_contents(`${output}/title-observations.json`,JSON.stringify({observations,notificationTexts:notices,limitations:['Actual hook scripts, log parser, SQLite and transcript fixtures on private GNOME/HOME; not autonomous work inside personal IDEs']},null,2));
 }finally{pet._control=original;app.force_exit();await Scripting.sleep(350);}
}
