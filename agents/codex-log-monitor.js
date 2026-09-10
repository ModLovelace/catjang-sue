"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const MAX_TRACKED_FILES = 50;
const MAX_PARTIAL_BYTES = 65536;
const MAX_READ_BYTES = 256 * 1024;

class CodexLogMonitor {
  constructor(onStateChange) {
    this._onStateChange = onStateChange;
    this._interval = null;
    this._tracked = new Map();
    this._baseDir = path.join(os.homedir(), ".codex", "sessions");
    this._startedAtMs = Date.now();
  }

  start() {
    if (this._interval) return;
    this._startedAtMs = Date.now();
    this._poll();
    this._interval = setInterval(() => this._poll(), 1500);
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this._tracked.clear();
  }

  _poll() {
    for (const dir of this._getSessionDirs()) {
      let files;
      try { files = fs.readdirSync(dir); }
      catch { continue; }
      const now = Date.now();
      for (const file of files) {
        if (!file.startsWith("rollout-") || !file.endsWith(".jsonl")) continue;
        const filePath = path.join(dir, file);
        if (!this._tracked.has(filePath)) {
          try {
            if (now - fs.statSync(filePath).mtimeMs > 120000) continue;
          } catch { continue; }
        }
        this._pollFile(filePath, file);
      }
    }
    this._cleanStaleFiles();
  }

  _getSessionDirs() {
    const dirs = [];
    const seen = new Set();
    const add = (dir) => {
      if (!seen.has(dir)) {
        seen.add(dir);
        dirs.push(dir);
      }
    };
    const now = new Date();
    for (let daysAgo = 0; daysAgo <= 2; daysAgo++) {
      const d = new Date(now);
      d.setDate(d.getDate() - daysAgo);
      add(path.join(
        this._baseDir,
        String(d.getFullYear()),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0")
      ));
    }
    return dirs;
  }

  _pollFile(filePath, fileName) {
    let stat;
    try { stat = fs.statSync(filePath); }
    catch { return; }

    let tracked = this._tracked.get(filePath);
    if (!tracked) {
      const sessionId = this._extractSessionId(fileName);
      if (!sessionId) return;
      if (this._tracked.size >= MAX_TRACKED_FILES) this._cleanStaleFiles(true);
      tracked = {
        // A recently touched session can already be very large when Catjang
        // starts. Tail it instead of allocating and parsing the whole file.
        offset: Math.max(0, stat.size - MAX_READ_BYTES),
        partial: "",
        sessionId: `codex:${sessionId}`,
        cwd: "",
        lastEventTime: Date.now(),
        lastState: null,
        lastNotificationEvent: "",
        activeTurn: false,
        hadToolUse: false,
      };
      this._tracked.set(filePath, tracked);
    }
    if (stat.size <= tracked.offset) return;

    let buf;
    let fd = null;
    try {
      const readOffset = Math.max(tracked.offset, stat.size - MAX_READ_BYTES);
      fd = fs.openSync(filePath, "r");
      buf = Buffer.alloc(stat.size - readOffset);
      fs.readSync(fd, buf, 0, buf.length, readOffset);
    } catch {
      return;
    } finally {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch {}
      }
    }
    tracked.offset = stat.size;

    const lines = (tracked.partial + buf.toString("utf8")).split("\n");
    const remainder = lines.pop() || "";
    tracked.partial = remainder.length > MAX_PARTIAL_BYTES ? "" : remainder;
    for (const line of lines) {
      if (line.trim()) this._processLine(line, tracked);
    }
  }

  _processLine(line, tracked) {
    let obj;
    try { obj = JSON.parse(line); }
    catch { return; }
    if (typeof obj.timestamp === "string") {
      const ts = Date.parse(obj.timestamp);
      if (Number.isFinite(ts) && ts < this._startedAtMs - 1500) return;
    }
    const type = obj.type;
    const payload = obj.payload;
    const subtype = payload && typeof payload === "object" ? payload.type || "" : "";
    const key = subtype ? `${type}:${subtype}` : type;

    if (type === "session_meta" && payload) {
      tracked.cwd = payload.cwd || "";
      this._emit(tracked, "idle", key);
      return;
    }
    if (key === "event_msg:task_started" || key === "event_msg:user_message") {
      tracked.activeTurn = true;
      tracked.hadToolUse = false;
      const msg = (payload && (payload.message || payload.content || payload.text || payload.prompt)) || "";
      if (typeof msg === "string" && msg.trim()) {
        let clean = msg.trim().replace(/\s+/g, " ");
        if (clean.length > 55) clean = clean.slice(0, 52) + "...";
        tracked.currentTask = clean;
      }
      this._emit(tracked, "thinking", key);
      return;
    }
    if (this._isUserInterventionRequest(obj)) {
      this._emitNotification(tracked, key);
      return;
    }
    if (
      key === "response_item:function_call" ||
      key === "response_item:custom_tool_call" ||
      key === "response_item:web_search_call"
    ) {
      tracked.hadToolUse = true;
      this._emit(tracked, "working", key);
      return;
    }
    if (
      key === "event_msg:exec_command_end" ||
      key === "event_msg:patch_apply_end" ||
      key === "event_msg:custom_tool_call_output"
    ) {
      this._emit(tracked, "working", key);
      return;
    }
    if (key === "event_msg:task_complete") {
      if (!tracked.activeTurn) return;
      this._emit(tracked, "complete", key, { task: tracked.currentTask || "" });
      tracked.activeTurn = false;
      tracked.hadToolUse = false;
      return;
    }
    if (key === "event_msg:turn_aborted") {
      tracked.activeTurn = false;
      this._emit(tracked, "idle", key);
    }
  }

  _isUserInterventionRequest(obj) {
    const payload = obj && obj.payload;
    if (!payload || typeof payload !== "object") return false;
    if (payload.type !== "function_call") return false;
    if (payload.name === "request_user_input" || payload.name === "request_plugin_install") return true;
    if (payload.name !== "exec_command") return false;
    let args;
    try { args = JSON.parse(payload.arguments || "{}"); }
    catch { return false; }
    return args && args.sandbox_permissions === "require_escalated";
  }

  _emitNotification(tracked, event) {
    const now = Date.now();
    if (tracked.lastNotificationEvent === event && now - tracked.lastEventTime < 5000) return;
    tracked.lastNotificationEvent = event;
    this._emit(tracked, "notification", event);
  }

  _emit(tracked, state, event, extra = {}) {
    if (state === tracked.lastState && state === "working") return;
    tracked.lastState = state;
    tracked.lastEventTime = Date.now();
    this._onStateChange({
      agentId: "codex",
      agentName: "Codex",
      sessionId: tracked.sessionId,
      state,
      event,
      task: extra.task || tracked.currentTask || "",
      cwd: tracked.cwd,
    });
  }

  _extractSessionId(fileName) {
    const base = fileName.replace(".jsonl", "");
    const parts = base.split("-");
    return parts.length >= 10 ? parts.slice(-5).join("-") : null;
  }

  _cleanStaleFiles(force = false) {
    const now = Date.now();
    for (const [filePath, tracked] of this._tracked) {
      if (force || now - tracked.lastEventTime > 300000) {
        this._tracked.delete(filePath);
      }
      if (!force && this._tracked.size <= MAX_TRACKED_FILES) break;
    }
  }
}

module.exports = CodexLogMonitor;
