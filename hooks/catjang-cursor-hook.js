#!/usr/bin/env node
"use strict";

const path = require("path");
const fs = require("fs");
const { postAgentState } = require("./server-config");

function readStdinJson() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); }
      catch { resolve({}); }
    });
    process.stdin.resume();
    setTimeout(() => resolve({}), 80).unref();
  });
}

function cwdFromPayload(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.cwd === "string") return payload.cwd;
  if (Array.isArray(payload.workspace_roots) && typeof payload.workspace_roots[0] === "string") return payload.workspace_roots[0];
  return "";
}

function hookResponse(event) {
  if (event === "beforeShellExecution") {
    return {
      permission: "ask",
      user_message: "Catjang noticed a Cursor shell command needs your approval.",
      agent_message: "Wait for the user to approve or deny this shell command.",
    };
  }
  if (event === "beforeMCPExecution") {
    return {
      permission: "ask",
      user_message: "Catjang noticed a Cursor MCP tool needs your approval.",
      agent_message: "Wait for the user to approve or deny this MCP tool call.",
    };
  }
  return {};
}

async function main() {
  const payload = await readStdinJson();
  const event = process.argv[2] || payload.hook_event_name || "";
  const lifecycle = {beforeSubmitPrompt:'thinking',afterShellExecution:'working',afterMCPExecution:'working',stop:'complete'};
  if(process.platform==='linux' && lifecycle[event]){
    const id=String(payload.conversation_id||payload.session_id||'cursor').slice(0,100);
    const file=path.join(__dirname,'cursor-task-context.json');
    let cache={};try{cache=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
    const now=Date.now();
    const task=String(payload.task||payload.prompt||cache[id]?.task||'').replace(/\s+/g,' ').trim().slice(0,180);
    const title=String(payload.conversation_title||payload.chat_title||payload.title||cache[id]?.title||'');
    const topic=String(title||cache[id]?.topic||path.basename(cwdFromPayload(payload))).slice(0,80);
    if(event==='beforeSubmitPrompt'){
      cache[id]={task,topic,title,at:now};
      cache=Object.fromEntries(Object.entries(cache).filter(([,v])=>now-v.at<86400000).sort((a,b)=>b[1].at-a[1].at).slice(0,32));
      try{fs.writeFileSync(`${file}.${process.pid}.tmp`,JSON.stringify(cache),{mode:0o600});fs.renameSync(`${file}.${process.pid}.tmp`,file);}catch{}
    }
    await postAgentState({agentId:'cursor',agentName:'Cursor',sessionId:id,event,
      state:event==='stop'&&payload.status==='aborted'?'idle':event==='stop'&&payload.status==='error'?'error':lifecycle[event],task,conversationName:topic,
      conversationTitle:title,conversationNameIsFallback:!title});
    process.stdout.write('{}\n');return;
  }
  if (event === "beforeShellExecution" || event === "beforeMCPExecution") {
    const task = (payload.command || payload.tool_name || payload.prompt || "").slice(0, 55);
    const cwd = cwdFromPayload(payload);
    const conversationName = payload.conversation_title || payload.chat_title || payload.title || payload.topic || (cwd ? path.basename(cwd) : "");
    postAgentState({
      agentId: "cursor",
      agentName: "Cursor",
      event,
      state: "notification",
      task,
      conversationName,
      ...(process.platform==='linux'?{conversationTitle:payload.conversation_title||payload.chat_title||payload.title||payload.topic||'',
        conversationNameIsFallback:!(payload.conversation_title||payload.chat_title||payload.title||payload.topic)}:{}),
      sessionId: payload.conversation_id || payload.session_id || "cursor",
      cwd: cwd,
    }, () => {
      process.stdout.write(`${JSON.stringify(hookResponse(event))}\n`);
      process.exit(0);
    });
    return;
  }
  process.stdout.write(`${JSON.stringify(hookResponse(event))}\n`);
}

main().catch(() => {
  process.stdout.write("{}\n");
});
