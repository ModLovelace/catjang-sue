#!/usr/bin/env node
"use strict";

const { postAgentState } = require("./server-config");

const EVENT_TO_STATE = {
  PreInvocation: "thinking",
  PostToolUse: "working",
  PostInvocation: "complete",
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

function stateForEvent(event, payload) {
  if (event === "Stop") {
    if (payload && (payload.error || payload.terminationReason === "error")) return "error";
    return "complete";
  }
  if (event === "PostToolUse" && payload && payload.error) return "error";
  return EVENT_TO_STATE[event] || "";
}

function cwdFromPayload(payload) {
  const paths = payload && Array.isArray(payload.workspacePaths) ? payload.workspacePaths : [];
  return typeof paths[0] === "string" ? paths[0] : "";
}

function hookResponse(event) {
  if (event === "PreToolUse") return { decision: "ask", reason: "Catjang does not approve Antigravity tool calls automatically." };
  if (event === "Stop") return { decision: "allow" };
  if (event === "PostInvocation") return { injectSteps: [], terminationBehavior: "" };
  return {};
}

async function main() {
  const event = process.argv[2];
  const payload = await readStdinJson();
  const state = stateForEvent(event, payload);
  if (state) {
    try {
      await postAgentState({
        agentId: "antigravity",
        event,
        state,
        sessionId: payload.conversationId || "antigravity",
        cwd: cwdFromPayload(payload),
      });
    } catch {}
  }
  process.stdout.write(`${JSON.stringify(hookResponse(event))}\n`);
}

main().catch(() => {
  process.stdout.write("{}\n");
});
