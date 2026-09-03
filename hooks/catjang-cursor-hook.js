#!/usr/bin/env node
"use strict";

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
  if (event === "beforeShellExecution" || event === "beforeMCPExecution") {
    const task = (payload.command || payload.tool_name || payload.prompt || "").slice(0, 55);
    postAgentState({
      agentId: "cursor",
      agentName: "Cursor",
      event,
      state: "notification",
      task,
      sessionId: payload.conversation_id || payload.session_id || "cursor",
      cwd: cwdFromPayload(payload),
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
