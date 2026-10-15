import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as Scripting from 'resource:///org/gnome/shell/ui/scripting.js';
import {read,waitFor,command,startDriver} from './integration.js';
export const METRICS={};
const output=GLib.getenv('CATJANG_PROTOTYPE_OUTPUT'),observations=[];
function assert(value,message){if(!value)throw new Error(message);observations.push(message);console.log(`[Catjang autoconnect] ${message}`);}
export async function run(){
 await Scripting.waitTestWindows();await Scripting.sleep(1000);Main.overview.hide();await Scripting.sleep(350);
 const home=`${GLib.getenv('XDG_RUNTIME_DIR')}/ide-home`,dir=`${output}/driver`;
 GLib.mkdir_with_parents(`${home}/.claude`,0o700);GLib.mkdir_with_parents(`${home}/.gemini/config`,0o700);
 GLib.file_set_contents(`${home}/.claude/settings.json`,JSON.stringify({theme:'dark',permissions:{allow:['Read']},hooks:{UserPromptSubmit:[{hooks:[{type:'command',command:'echo existing-user-hook'}]}]}}));
 GLib.file_set_contents(`${home}/.gemini/config/hooks.json`,JSON.stringify({'existing-user-hook':{enabled:true,Stop:[{command:'echo existing-user-hook'}]}}));
 let app=startDriver(dir,{agents:true,autoAgents:true});
 const pet=Main.extensionManager.lookup('catjang-native@modlovelace.github.io').stateObj;
 try{
  await waitFor(()=>read(`${dir}/ready.json`),'Automatic startup did not attach');
  const state=await command(dir,'query');
  assert(state.features.agentsEnabled&&state.saved.linuxAgentTargets.join(',')==='antigravity,codex,claude','Saved authorization starts the three selected integrations without clicking Sync');
  const status=await command(dir,'agent-status');
  assert(status.status.serverActive&&status.status.codexActive,'Local server and real Codex monitor start automatically');
  assert(status.badges.gemini==='Conectado'&&status.badges.claude==='Conectado','Ubuntu badges confirm this profile owns complete Antigravity and Claude hooks');
  assert(status.badges.cursor==='No seleccionado'&&!GLib.file_test(`${home}/.cursor/hooks.json`,GLib.FileTest.EXISTS),'Unselected Cursor is neither configured nor shown as an uninstalled IDE');
  const claude=read(`${home}/.claude/settings.json`),antigravity=read(`${home}/.gemini/config/hooks.json`);
  assert(claude.theme==='dark'&&claude.permissions.allow[0]==='Read'&&claude.hooks.UserPromptSubmit.some(e=>e.hooks.some(h=>h.command==='echo existing-user-hook')),'Automatic merge preserves Claude preferences, permissions and existing hooks');
  assert(antigravity['existing-user-hook'].Stop[0].command==='echo existing-user-hook','Automatic merge preserves other Antigravity hooks');
  for(const agent of ['antigravity','claude']){
   const payload=agent==='claude'?{session_id:'claude-autoconnect',prompt:'Prueba de conexión automática',conversation_title:'Ubuntu QA'}:{conversationId:'antigravity-autoconnect',task:'Prueba de conexión automática',conversationName:'Ubuntu QA'};
   await command(dir,'agent-hook',{agent,event:agent==='claude'?'UserPromptSubmit':'PreInvocation',payload});
   assert(pet._activity?.state==='thinking',`${agent}: installed hook reaches the native pet without manual synchronization`);
   await command(dir,'agent-hook',{agent,event:'Stop',payload});
   assert(pet._activity?.state==='complete'&&pet._messageLabel.text.includes('Prueba de conexión automática'),`${agent}: completion names the task`);
  }
  await command(dir,'codex-fixture',[
   {type:'session_meta',payload:{cwd:'/tmp/Ubuntu QA'}},
   {type:'event_msg',payload:{type:'user_message',message:'Comprobar monitoreo automático de Codex'}},
   {type:'event_msg',payload:{type:'task_complete'}},
  ]);
  await waitFor(()=>pet._activity?.state==='complete'&&pet._messageLabel.text.includes('Comprobar monitoreo automático de Codex'),'Codex log did not reach the pet');
  assert(true,'Real Codex parser tails a newly written session and reports its task automatically');
  const afterCodex=await command(dir,'agent-status');assert(afterCodex.badges.codex==='Monitoreo activo','Codex badge reflects its running monitor and available sessions');
  await command(dir,'quit');await waitFor(()=>!pet._owner,'Quit did not detach');app=null;
  const beforeClaude=JSON.stringify(read(`${home}/.claude/settings.json`));
  antigravity.catjang.Stop=[];GLib.file_set_contents(`${home}/.gemini/config/hooks.json`,JSON.stringify(antigravity));
  app=startDriver(dir,{agents:true,autoAgents:true});await waitFor(()=>read(`${dir}/ready.json`),'Automatic restart did not attach');
  const restarted=await command(dir,'agent-status');
  assert(restarted.status.serverActive&&restarted.status.antigravityInstalled&&restarted.status.claudeInstalled,'Restart restores a missing Antigravity hook automatically');
  assert(JSON.stringify(read(`${home}/.claude/settings.json`))===beforeClaude,'Repeated startup does not duplicate or rewrite valid Claude hooks');
  assert(read(`${home}/.gemini/config/hooks.json`).catjang.Stop.length===1,'Repair creates exactly one missing Stop handler');
  await command(dir,'quit');await waitFor(()=>!pet._owner,'Final quit did not detach');app=null;
  const settingsFile=`${GLib.getenv('XDG_RUNTIME_DIR')}/catjang-qa-profile/settings.json`,settings=read(settingsFile);
  settings.agentIntegrationsEnabled=false;GLib.file_set_contents(settingsFile,JSON.stringify(settings));
  app=startDriver(dir,{agents:true,autoAgents:true});await waitFor(()=>read(`${dir}/ready.json`),'Opted-out restart did not attach');
  const disabled=await command(dir,'agent-status');
  assert(!disabled.status.enabled&&!disabled.status.serverActive&&!disabled.status.codexActive,'An opted-out profile stays disconnected on subsequent starts');
  assert(disabled.badges.gemini==='Desactivado'&&disabled.badges.claude==='Desactivado'&&disabled.badges.codex==='Desactivado','Ubuntu panel describes the disabled connection without calling installed IDEs missing');
  await command(dir,'quit');await waitFor(()=>!pet._owner,'Opted-out quit did not detach');app=null;
  GLib.file_set_contents(`${output}/autoconnect-observations.json`,JSON.stringify({observations,limitations:['Private HOME and GNOME compositor; real hooks and Codex parser with synthetic tasks, not autonomous work inside the IDEs','Authorization is preserved per profile; fresh installs still require consent']},null,2));
 }finally{app?.force_exit();await Scripting.sleep(350);}
}
