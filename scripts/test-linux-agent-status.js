"use strict";
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const events=require('../hooks/install'),{inspect}=require('../native/gnome/agent-status');
test('Ubuntu status distinguishes an IDE file from usable Catjang hooks',()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'catjang-status-'));
 try{
  const hookDir=path.join(home,'profile/hooks');fs.mkdirSync(hookDir,{recursive:true});
  for(const script of ['catjang-claude-hook.js','catjang-antigravity-hook.js','catjang-cursor-hook.js'])fs.writeFileSync(path.join(hookDir,script),'');
  fs.mkdirSync(path.join(home,'.claude'));fs.writeFileSync(path.join(home,'.claude/settings.json'),JSON.stringify({theme:'dark',hooks:{Stop:[{hooks:[{command:'echo other-app'}]}]}}));
  const options={home,hookDir,enabled:true,targets:['antigravity','codex','claude'],serverActive:true,codexActive:true,events};
  assert.equal(inspect(options).claudeInstalled,false);
  assert.equal(inspect(options).states.claude,'Pendiente de configurar');
  events.registerClaudeHooks({settingsPath:path.join(home,'.claude/settings.json'),hookScript:path.join(hookDir,'catjang-claude-hook.js'),nodeBin:process.execPath});
  assert.equal(inspect(options).states.claude,'Conectado');
  assert.equal(inspect({...options,enabled:false}).states.claude,'Desactivado');
  assert.equal(inspect({...options,serverActive:false}).states.claude,'Servidor no disponible');
  assert.equal(inspect(options).states.cursor,'No seleccionado');
  assert.equal(inspect(options).states.codex,'Esperando una sesión');
  const settings=JSON.parse(fs.readFileSync(path.join(home,'.claude/settings.json')));settings.disableAllHooks=true;
  fs.writeFileSync(path.join(home,'.claude/settings.json'),JSON.stringify(settings));
  assert.equal(inspect(options).states.claude,'Hooks deshabilitados');
  fs.unlinkSync(path.join(hookDir,'catjang-claude-hook.js'));
  assert.equal(inspect(options).claudeInstalled,false);
  fs.writeFileSync(path.join(home,'.claude/settings.json'),'{invalid');
  assert.equal(inspect(options).claudeInstalled,false);
 }finally{fs.rmSync(home,{recursive:true,force:true});}
});
test('Target selection is limited to GNOME and retains existing Windows/macOS startup',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../main.js'),'utf8');
 const fn=source.slice(source.indexOf('function startAgentIntegrations()'),source.indexOf('function stopAgentIntegrations()'));
 for(const [USE_GNOME_NATIVE,IS_MAC,enabled,expected] of [
  [true,false,true,['server','claude','antigravity','codex']],
  [false,false,true,['server','claude','antigravity','cursor','codex']],
  [false,true,true,['server','claude','antigravity','cursor','codex','kiro','cursor-monitor']],
  [true,false,false,[]],
 ]){
  const calls=[],context={USE_GNOME_NATIVE,IS_MAC,agentIntegrationsEnabled:enabled,linuxAgentTargets:['antigravity','codex','claude']};
  for(const [name,id]of Object.entries({startAgentStateServer:'server',installClaudeCodeHooks:'claude',installAntigravityHooks:'antigravity',installCursorHooks:'cursor',startCodexMonitor:'codex',startKiroMonitor:'kiro',startCursorAgentMonitor:'cursor-monitor'}))context[name]=()=>calls.push(id);
  vm.runInNewContext(fn+';startAgentIntegrations();',context);assert.deepEqual(calls,expected);
 }
});
