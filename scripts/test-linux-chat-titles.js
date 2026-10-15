"use strict";
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {createConversationContext}=require('../native/gnome/conversation-context');
const {formatAgentEvent}=require('../native/gnome/agent-messages');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222';
function fixture(run){const home=fs.mkdtempSync(path.join(os.tmpdir(),'catjang-titles-'));try{return run(home);}finally{fs.rmSync(home,{recursive:true,force:true});}}
function database(file,sql){fs.mkdirSync(path.dirname(file),{recursive:true});const db=new DatabaseSync(file);try{db.exec(sql);}finally{db.close();}}
test('Codex uses its visible name, keeps concurrent chats separate and refreshes a rename at completion',()=>fixture(home=>{
 const file=path.join(home,'.codex/state_5.sqlite');database(file,`CREATE TABLE threads(id TEXT PRIMARY KEY,title TEXT,name TEXT);INSERT INTO threads VALUES('${A}','same initial prompt','Pagos: corregir validación'),('${B}','same initial prompt','Pagos: actualizar documentación');`);
 const before=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
 const context=createConversationContext({home});
 assert.equal(context.enrich({agentId:'codex',sessionId:'codex:'+A,state:'thinking',task:'Tarea A',cwd:'/same'}).conversationName,'Pagos: corregir validación');
 assert.equal(context.enrich({agentId:'codex',sessionId:'codex:'+B,state:'thinking',task:'Tarea B',cwd:'/same'}).conversationName,'Pagos: actualizar documentación');
 assert.equal(context.enrich({agentId:'codex',sessionId:'codex:'+A,state:'complete'}).task,'Tarea A');
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),before,'Resolver must not modify the source database');
 const db=new DatabaseSync(file);db.prepare('UPDATE threads SET name=? WHERE id=?').run('Pagos: título renombrado',A);db.close();
 const done=context.enrich({agentId:'codex',sessionId:'codex:'+A,state:'complete'});
 assert.equal(done.conversationName,'Pagos: título renombrado');
 assert.match(formatAgentEvent(done),/^Codex · «Pagos: título renombrado» — tarea completada\./);
 assert.equal(context.enrich({agentId:'codex',sessionId:'codex:'+B,state:'complete'}).conversationName,'Pagos: actualizar documentación');
}));
test('Codex CLI uses the latest index title before an original prompt, including an older database schema',()=>fixture(home=>{
 database(path.join(home,'.codex/state_1.sqlite'),`CREATE TABLE threads(id TEXT,title TEXT);INSERT INTO threads VALUES('${A}','initial prompt');`);
 fs.writeFileSync(path.join(home,'.codex/session_index.jsonl'),[{id:A,thread_name:'Old title'},{id:B,thread_name:'Other chat'},{id:A,thread_name:'Latest renamed chat'}].map(JSON.stringify).join('\n'));
 const context=createConversationContext({home});assert.equal(context.enrich({agentId:'codex',sessionId:A,state:'complete'}).conversationName,'Latest renamed chat');
}));
test('Antigravity resolves the exact session title instead of its workspace or first prompt',()=>fixture(home=>{
 const file=path.join(home,'.gemini/antigravity/conversation_summaries.db');
 database(file,`CREATE TABLE conversation_summaries(conversation_id TEXT,title TEXT);INSERT INTO conversation_summaries VALUES('${A}','Estabilizar sesiones Ubuntu');`);
 const result=createConversationContext({home}).enrich({agentId:'antigravity',agentName:'Gemini',sessionId:A,state:'complete',conversationName:'workspace',conversationNameIsFallback:true});
 assert.equal(result.conversationName,'Estabilizar sesiones Ubuntu');assert.match(formatAgentEvent(result),/^Antigravity · «Estabilizar sesiones Ubuntu»/);
}));
test('Claude reads the latest matching custom-title record and retains the transcript across hook events',()=>fixture(home=>{
 const file=path.join(home,'.claude/projects/workspace',A+'.jsonl');fs.mkdirSync(path.dirname(file),{recursive:true});
 fs.writeFileSync(file,JSON.stringify({type:'custom-title',sessionId:A,customTitle:'Original title'})+'\n'+JSON.stringify({type:'assistant',unused:'x'.repeat(3*1024*1024)})+'\n'+JSON.stringify({type:'custom-title',sessionId:A,customTitle:'Refactorizar el calendario'})+'\n'+JSON.stringify({type:'custom-title',sessionId:B,customTitle:'Wrong session'})+'\n');
 const context=createConversationContext({home});
 assert.equal(context.enrich({agentId:'claude-code',sessionId:A,state:'thinking',transcriptPath:file}).conversationName,'Refactorizar el calendario');
 const result=context.enrich({agentId:'claude-code',sessionId:A,state:'complete'});
 assert.equal(result.conversationName,'Refactorizar el calendario');assert.match(formatAgentEvent(result),/^Claude Code · «Refactorizar el calendario»/);
}));
test('Claude rejects paths and symlinks outside its configured transcript directory',()=>fixture(home=>{
 const file=path.join(home,A+'.jsonl'),projects=path.join(home,'.claude/projects');fs.mkdirSync(projects,{recursive:true});
 fs.writeFileSync(file,JSON.stringify({type:'custom-title',customTitle:'Do not read'}));
 const linked=path.join(projects,A+'.jsonl');fs.symlinkSync(file,linked);
 for(const transcriptPath of [file,linked])assert.equal(createConversationContext({home}).enrich({agentId:'claude-code',sessionId:A,transcriptPath,state:'complete'}).conversationName,'');
}));
test('Missing metadata retains genuine event titles, never substitutes a folder, and tolerates invalid databases',()=>fixture(home=>{
 fs.mkdirSync(path.join(home,'.codex'),{recursive:true});fs.writeFileSync(path.join(home,'.codex/state_5.sqlite'),'invalid sqlite');
 const context=createConversationContext({home});
 context.enrich({agentId:'claude',sessionId:A,state:'thinking',conversationName:'API de pagos',task:'Revisar permisos'});
 assert.equal(context.enrich({agentId:'claude',sessionId:A,state:'complete'}).conversationName,'API de pagos');
 const unknown=context.enrich({agentId:'codex',sessionId:A,state:'complete',conversationName:'workspace',conversationNameIsFallback:true});
 assert.equal(unknown.conversationName,'');assert.match(formatAgentEvent(unknown),/^Codex · «Chat sin título · 11111111»/);
 context.clear();assert.equal(context.enrich({agentId:'claude',sessionId:A,state:'complete'}).conversationName,'');
}));
test('Completion always names the platform and chat, preserves long Unicode titles, and fits D-Bus limits',()=>{
 const title='Corregir autenticación de usuarios y permisos de sesión en Ubuntu';
 assert.match(formatAgentEvent({agentId:'codex',conversationName:title,text:'Other platform: done',state:'complete'}),new RegExp('^Codex · «'+title+'» — tarea completada\\.'));
 assert(formatAgentEvent({agentId:'codex',conversationName:title,text:'Se completaron tres subtareas',state:'complete'}).includes('\nDetalle: Se completaron tres subtareas'));
 for(const state of ['complete','thinking','working','notification','error']){
  const result=formatAgentEvent({agentId:'codex',conversationName:'🐈'.repeat(500),task:'task'.repeat(100),text:'text'.repeat(100),state});
  assert(result.length<=512);assert(result.isWellFormed());
 }
});
test('Windows/macOS main event payloads retain their existing formatting contract',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../main.js'),'utf8');
 const fn=source.slice(source.indexOf('function handleAgentStateEvent(event)'),source.indexOf('function startAgentStateServer()'));
 const sent=[],context={USE_GNOME_NATIVE:false,linuxConversationContext:null,activeAgentSessions:new Map(),AGENT_ACTIVE_TTL_MS:600000,
  petWin:{isDestroyed:()=>false,webContents:{send:(channel,event)=>sent.push({channel,event})}},Date};
 vm.runInNewContext(fn+';handleAgentStateEvent({agentId:"codex",sessionId:"same",conversationTitle:"Existing chat",state:"complete",task:"Original task"});',context);
 assert.equal(sent[1].channel,'ai-task-complete');assert.equal(sent[1].event.conversationName,'Existing chat');assert(!('conversationTitleSource' in sent[1].event));
});
