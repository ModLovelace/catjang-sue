#!/usr/bin/env node
"use strict";

const { postAgentState } = require("./server-config");

const EVENT_TO_STATE = {
  SessionStart: "idle",
  SessionEnd: "idle",
  UserPromptSubmit: "thinking",
  PreToolUse: "working",
  PermissionRequest: "notification",
  PostToolUse: "working",
  PostToolUseFailure: "error",
  Stop: "complete",
  StopFailure: "error",
  Notification: "notification",
  Elicitation: "notification",
};

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

async function main() {
  const payload = await readStdinJson();
  const event = process.argv[2] || payload.hook_event_name;
  const state = EVENT_TO_STATE[event];
  if (!state) process.exit(0);
  const task = (payload.prompt || payload.user_prompt || payload.message || payload.task || "").slice(0, 55);
  postAgentState({
    agentId: "claude-code",
    agentName: "Claude Code",
    event,
    state,
    task,
    sessionId: payload.session_id || "claude-code",
    cwd: payload.cwd || "",
  }, () => process.exit(0));
}

main().catch(() => process.exit(0));
