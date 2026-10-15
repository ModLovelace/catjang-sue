import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {read,waitFor,command,startDriver,capture} from './integration.js';
export const METRICS={};
const output=GLib.getenv('CATJANG_PROTOTYPE_OUTPUT'),observations=[];
function assert(value,message){if(!value)throw new Error(message);observations.push(message);console.log(`[Catjang agents] ${message}`);}
export async function run(){
 await Scripting.waitTestWindows();await Scripting.sleep(1000);Main.overview.hide();await Scripting.sleep(350);
 const dir=`${output}/driver`,app=startDriver(dir,{agents:true});
 try{
  const initial=await waitFor(()=>read(`${dir}/ready.json`),'Application failed to attach');
  const pet=Main.extensionManager.lookup('catjang-native@modlovelace.github.io').stateObj;
  const state=await command(dir,'query');
  assert(!state.features.agentsEnabled&&state.features.agentsAvailable,'Linux preferences offer the IDE onboarding while monitoring remains opted out');
  await command(dir,'agent-consent');
  assert((await command(dir,'query')).features.agentsEnabled,'Clicking Sync in the actual consent window starts the real localhost integration');
  const hookHome=`${GLib.getenv('XDG_RUNTIME_DIR')}/ide-home`;
  for(const file of ['.claude/settings.json','.gemini/config/hooks.json','.cursor/hooks.json'])assert(Gio.File.new_for_path(`${hookHome}/${file}`).query_exists(null),`Consent installs ${file} only in the disposable IDE home`);
  for(const [mascot,info]of Object.entries(pet._catalog)){
   await command(dir,'configure',{mascot,name:info.defaultName,nameVisible:true,size:200});
   for(const agent of ['antigravity','codex','claude','cursor','kiro']){
    const payload={agentId:agent,sessionId:`${agent}-${mascot}`,conversationName:'Laboratorio',task:`Validar ${info.defaultName}`,state:'thinking'};
    await command(dir,'agent-http',payload);
    assert(pet._activity?.state==='thinking'&&pet._messageLabel.text.includes('Laboratorio'),`${mascot}/${agent}: real HTTP, main IPC, preload, helper and native speech show thinking`);
    await command(dir,'agent-http',{...payload,state:'working'});
    assert(pet._activity?.state==='working'&&pet._statusLabel.visible,`${mascot}/${agent}: working retains animated status dots`);
    await command(dir,'agent-http',{...payload,state:'complete'});
    assert(pet._activity?.state==='complete'&&pet._messageLabel.text.includes(`Validar ${info.defaultName}`)&&pet._frame.startsWith('jump')&&pet._confetti.some(p=>p.visible),`${mascot}/${agent}: completion names the task and celebrates with this mascot`);
   }
   await capture(`${mascot}-agent-complete.png`);
  }
  const payload={conversationId:'antigravity-real-hook',task:'Revisar animaciones',conversationName:'Catjang Lab',workspacePaths:['/tmp/laboratorio']};
  await command(dir,'agent-hook',{agent:'antigravity',event:'PreInvocation',payload});
  assert(pet._activity?.state==='thinking'&&pet._messageLabel.text.startsWith('Antigravity'),'The real Antigravity hook identifies its IDE rather than renaming it Gemini');
  await command(dir,'agent-hook',{agent:'antigravity',event:'PostInvocation',payload});
  assert(pet._activity?.state==='working','Antigravity model intermediate responses do not falsely announce task completion');
  await command(dir,'agent-hook',{agent:'antigravity',event:'Stop',payload});
  assert(pet._activity?.state==='complete'&&pet._messageLabel.text.includes('Revisar animaciones'),'Antigravity Stop reports the actual task through the installed hook and HTTP chain');
  await command(dir,'agent-hook',{agent:'cursor',event:'beforeSubmitPrompt',payload:{conversation_id:'cursor-real-hook',prompt:'Comprobar Toto',conversation_title:'Prueba Cursor'}});
  assert(pet._activity?.state==='thinking','Cursor submit hook starts the visible task');
  await command(dir,'agent-hook',{agent:'cursor',event:'stop',payload:{conversation_id:'cursor-real-hook',status:'completed'}});
  assert(pet._activity?.state==='complete'&&pet._messageLabel.text.includes('Comprobar Toto'),'Cursor stop hook retains its prompt title when the completion payload omits it');
  await command(dir,'agent-http',{agentId:'cursor',state:'notification',text:'Permiso para ejecutar una prueba',conversationName:'Laboratorio'});
  assert(pet._statusLabel.text==='!'&&pet._messageLabel.text.includes('Permiso para ejecutar una prueba'),'Attention preserves its IDE, speech and animated exclamation mark');
  pet._activity.until=GLib.get_monotonic_time()-1;await Scripting.sleep(80);
  assert(!pet._activity&&!pet._statusLabel.visible,'Expired agent messages clear their dots/attention instead of getting stuck');
  await command(dir,'quit');await waitFor(()=>!pet._owner,'Quit did not detach');
  assert(!pet._activity&&!pet._grab,'Closing the controller clears agent activity and native ownership');
  GLib.file_set_contents(`${output}/agent-observations.json`,JSON.stringify({observations,limitations:['Synthetic task payloads and actual hook scripts, isolated HOME and compositor; live tasks in each installed IDE still need acceptance','Kiro/Codex native log formats retain their existing parsers; this probe exercises the common HTTP pipeline']},null,2));
 }finally{app.force_exit();await Scripting.sleep(350);}
}
