#!/usr/bin/env node
"use strict";

const fs = require("fs");
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

function extractTaskFromPayload(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.task === "string" && payload.task.trim()) {
    return payload.task.trim();
  }
  if (typeof payload.prompt === "string" && payload.prompt.trim()) {
    return payload.prompt.trim();
  }
  const transcriptPath = payload.transcriptPath;
  if (!transcriptPath || typeof transcriptPath !== "string") return "";
  try {
    if (!fs.existsSync(transcriptPath)) return "";
    const stat = fs.statSync(transcriptPath);
    if (stat.size <= 0) return "";
    const readBytes = Math.min(stat.size, 32768);
    const buffer = Buffer.alloc(readBytes);
    const fd = fs.openSync(transcriptPath, "r");
    fs.readSync(fd, buffer, 0, readBytes, stat.size - readBytes);
    fs.closeSync(fd);
    const content = buffer.toString("utf8");
    const lines = content.split(/\r?\n/).filter(Boolean).reverse();
    for (const line of lines) {
      if (!line.includes('"USER_INPUT"')) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === "USER_INPUT" && parsed.content) {
          let str = parsed.content;
          const match = str.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i);
          if (match) str = match[1];
          str = str.replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
          if (str.length > 55) {
            str = str.slice(0, 52) + "...";
          }
          return str;
        }
      } catch {}
    }
  } catch {}
  return "";
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
    const task = extractTaskFromPayload(payload);
    try {
      await postAgentState({
        agentId: "antigravity",
        agentName: "Gemini",
        event,
        state,
        task,
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
