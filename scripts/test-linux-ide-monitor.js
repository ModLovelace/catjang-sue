"use strict";
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {linuxMonitor}=require('../native/gnome/ide-monitors');
test('Linux adapters read XDG fixtures and retain the existing parsers',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'catjang-ide-fixture-'));
  try{
    const events=[];
    const kiro=linuxMonitor(require('../agents/kiro-log-monitor'),event=>events.push(event),{configHome:root,product:'Kiro'});
    const cursor=linuxMonitor(require('../agents/cursor-log-monitor'),event=>events.push(event),{configHome:root,product:'Cursor'});
    for(const [product,name,data]of [
      ['Kiro','Kiro Logs.log','[agent-controller] Triggered new agent\n[AgentIterator] Detecting intent\n[Execution] Completed\n'],
      ['Cursor','agent.log','Agent waiting for approval: confirm command\n'],
    ]){
      const dir=path.join(root,product,'logs','window1');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,name),data);
    }
    kiro._poll();cursor._poll();
    assert.deepEqual(events.map(e=>[e.agentId,e.state]),[['kiro','thinking'],['kiro','working'],['kiro','complete'],['cursor','notification']]);
    kiro.stop();cursor.stop();assert.equal(kiro._interval,null);assert.equal(cursor._interval,null);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
