#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { postAgentState } = require("./server-config");

const EVENT_TO_STATE = {
  PreInvocation: "thinking",
  PostToolUse: "working",
  PostInvocation: "complete",
};

function readStdinJson() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      return resolve({});
    }
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => {
      try { process.stdin.pause(); } catch {}
      try { resolve(JSON.parse(data || "{}")); }
      catch { resolve({}); }
    });
    process.stdin.on("error", () => {
      try { process.stdin.pause(); } catch {}
      resolve({});
    });
    process.stdin.resume();
    const timer = setTimeout(() => {
      try { process.stdin.pause(); } catch {}
      try { resolve(JSON.parse(data || "{}")); }
      catch { resolve({}); }
    }, 200);
    if (timer.unref) timer.unref();
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

function extractConversationName(payload) {
  if (!payload || typeof payload !== "object") return "";
  if (typeof payload.conversationTitle === "string" && payload.conversationTitle.trim()) {
    return payload.conversationTitle.trim();
  }
  if (typeof payload.conversationName === "string" && payload.conversationName.trim()) {
    return payload.conversationName.trim();
  }
  if (typeof payload.title === "string" && payload.title.trim()) {
    return payload.title.trim();
  }
  if (typeof payload.topic === "string" && payload.topic.trim()) {
    return payload.topic.trim();
  }

  // Check the initial user prompt from transcriptPath (the opening topic of the conversation)
  const transcriptPath = payload.transcriptPath;
  if (transcriptPath && typeof transcriptPath === "string") {
    try {
      if (fs.existsSync(transcriptPath)) {
        const fd = fs.openSync(transcriptPath, "r");
        const buffer = Buffer.alloc(16384);
        const bytesRead = fs.readSync(fd, buffer, 0, 16384, 0);
        fs.closeSync(fd);
        const content = buffer.toString("utf8", 0, bytesRead);
        const lines = content.split(/\r?\n/).filter(Boolean);
        for (const line of lines) {
          if (!line.includes('"USER_INPUT"')) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "USER_INPUT" && parsed.content) {
              let str = parsed.content;
              const match = str.match(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/i);
              if (match) str = match[1];
              str = str.replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
              if (str.length > 32) {
                str = str.slice(0, 29) + "...";
              }
              if (str) return str;
            }
          } catch {}
        }
      }
    } catch {}
  }

  // Fallback to workspace/project folder name
  const cwd = cwdFromPayload(payload);
  if (cwd) {
    const base = path.basename(cwd);
    if (base) return base;
  }
  return "";
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
          if (str.length > 45) {
            str = str.slice(0, 42) + "...";
          }
          return str;
        }
      } catch {}
    }
  } catch {}
  return "";
}

function hookResponse(event) {
  if (event === "Stop") return { decision: "allow" };
  if (event === "PreInvocation" || event === "PostInvocation") return { injectSteps: [] };
  return {};
}

async function main() {
  const event = process.argv[2] || "";
  let payload = {};
  try {
    payload = await readStdinJson();
  } catch {}

  const state = stateForEvent(event, payload);
  if (state) {
    const task = extractTaskFromPayload(payload);
    const conversationName = extractConversationName(payload);
    try {
      await postAgentState({
        agentId: "antigravity",
        agentName: "Gemini",
        event,
        state,
        task,
        conversationName,
        sessionId: payload.conversationId || "antigravity",
        cwd: cwdFromPayload(payload),
      });
    } catch {}
  }
  try {
    process.stdout.write(`${JSON.stringify(hookResponse(event))}\n`);
  } catch {}
  process.exit(0);
}

main().catch(() => {
  try {
    process.stdout.write("{}\n");
  } catch {}
  process.exit(0);
});
