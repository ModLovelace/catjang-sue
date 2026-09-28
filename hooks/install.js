"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const CLAUDE_HOOK_MARKER = "catjang-claude-hook.js";
const ANTIGRAVITY_HOOK_MARKER = "catjang-antigravity-hook.js";
const CURSOR_HOOK_MARKER = "catjang-cursor-hook.js";
const CLAUDE_HOOK_EVENTS = [
  "SessionStart",
  "SessionEnd",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PostToolUseFailure",
  "Stop",
  "StopFailure",
  "Notification",
  "Elicitation",
];
const ANTIGRAVITY_HOOK_EVENTS = [
  "PreInvocation",
  "PostInvocation",
  "PostToolUse",
  "Stop",
];
const CURSOR_HOOK_EVENTS = [
  "beforeShellExecution",
  "beforeMCPExecution",
];

function resolveNodeBin() {
  const candidates = [
    process.env.NODE || "",
    "/opt/homebrew/bin/node",
    "/usr/local/bin/node",
    "/usr/bin/node",
    "node",
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore", timeout: 1000 });
      return candidate;
    } catch {}
  }
  return "node";
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    if (error && error.code !== "ENOENT") throw error;
    return {};
  }
}

function writeJsonAtomic(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(tmp, filePath);
}

function forEachCommandHook(entries, visitor) {
  if (!Array.isArray(entries)) return;
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    if (typeof entry.command === "string") {
      visitor(entry.command, (next) => { entry.command = next; });
    }
    if (Array.isArray(entry.hooks)) {
      for (const hook of entry.hooks) {
        if (hook && typeof hook.command === "string") {
          visitor(hook.command, (next) => { hook.command = next; });
        }
      }
    }
  }
}

function syncCommandHook(entries, expectedCommand, marker) {
  let found = false;
  let changed = false;
  forEachCommandHook(entries, (command, update) => {
    if (!command.includes(marker)) return;
    found = true;
    if (command !== expectedCommand) {
      update(expectedCommand);
      changed = true;
    }
  });
  return { found, changed };
}

function removeCommandHooksByMarker(entries, marker) {
  if (!Array.isArray(entries)) return { removed: 0, entries };
  let removed = 0;
  const nextEntries = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      nextEntries.push(entry);
      continue;
    }
    if (typeof entry.command === "string" && entry.command.includes(marker)) {
      removed++;
      continue;
    }
    if (Array.isArray(entry.hooks)) {
      const before = entry.hooks.length;
      entry.hooks = entry.hooks.filter((hook) => {
        return !(hook && typeof hook.command === "string" && hook.command.includes(marker));
      });
      removed += before - entry.hooks.length;
      if (entry.hooks.length === 0) continue;
    }
    nextEntries.push(entry);
  }
  return { removed, entries: nextEntries };
}

function registerClaudeHooks(options = {}) {
  const settingsPath = options.settingsPath || path.join(os.homedir(), ".claude", "settings.json");
  const hookScript = options.hookScript || path.join(__dirname, "catjang-claude-hook.js");
  const nodeBin = options.nodeBin || resolveNodeBin();
  const settings = readJson(settingsPath);
  if (!settings.hooks || typeof settings.hooks !== "object") settings.hooks = {};

  let added = 0;
  let updated = 0;
  let changed = false;

  for (const event of CLAUDE_HOOK_EVENTS) {
    if (!Array.isArray(settings.hooks[event])) {
      const existing = settings.hooks[event];
      settings.hooks[event] = existing && typeof existing === "object" ? [existing] : [];
      changed = true;
    }
    const expectedCommand = process.platform === "win32"
      ? `node "${hookScript}" ${event}`
      : `"${nodeBin}" "${hookScript}" ${event}`;
    const sync = syncCommandHook(settings.hooks[event], expectedCommand, CLAUDE_HOOK_MARKER);
    if (sync.found) {
      if (sync.changed) {
        updated++;
        changed = true;
      }
      continue;
    }
    settings.hooks[event].push({
      matcher: "",
      hooks: [{ type: "command", command: expectedCommand }],
    });
    added++;
    changed = true;
  }

  if (changed) writeJsonAtomic(settingsPath, settings);
  return { added, updated, settingsPath };
}

function ensureCommandHandlerList(list) {
  if (Array.isArray(list)) return list;
  return list && typeof list === "object" ? [list] : [];
}

function registerAntigravityHooks(options = {}) {
  const settingsPath = options.settingsPath || path.join(os.homedir(), ".gemini", "config", "hooks.json");
  const hookScript = options.hookScript || path.join(__dirname, "catjang-antigravity-hook.js");
  const nodeBin = options.nodeBin || resolveNodeBin();
  const settings = readJson(settingsPath);
  const hookName = options.hookName || "catjang";
  const hookConfig = settings[hookName] && typeof settings[hookName] === "object" ? settings[hookName] : {};
  settings[hookName] = hookConfig;
  hookConfig.enabled = hookConfig.enabled !== false;

  let added = 0;
  let updated = 0;
  let removed = 0;
  let changed = false;

  const stalePreToolUse = removeCommandHooksByMarker(hookConfig.PreToolUse, ANTIGRAVITY_HOOK_MARKER);
  if (stalePreToolUse.removed > 0) {
    if (stalePreToolUse.entries.length > 0) hookConfig.PreToolUse = stalePreToolUse.entries;
    else delete hookConfig.PreToolUse;
    removed += stalePreToolUse.removed;
    changed = true;
  }

  for (const event of ANTIGRAVITY_HOOK_EVENTS) {
    const expectedCommand = process.platform === "win32"
      ? `node "${hookScript}" ${event}`
      : `"${nodeBin}" "${hookScript}" ${event}`;
    if (event === "PreToolUse" || event === "PostToolUse") {
      hookConfig[event] = ensureCommandHandlerList(hookConfig[event]);
      const sync = syncCommandHook(hookConfig[event], expectedCommand, ANTIGRAVITY_HOOK_MARKER);
      if (sync.found) {
        if (sync.changed) {
          updated++;
          changed = true;
        }
        continue;
      }
      hookConfig[event].push({
        matcher: "",
        hooks: [{ type: "command", command: expectedCommand, timeout: 5 }],
      });
      added++;
      changed = true;
      continue;
    }

    hookConfig[event] = ensureCommandHandlerList(hookConfig[event]);
    const sync = syncCommandHook(hookConfig[event], expectedCommand, ANTIGRAVITY_HOOK_MARKER);
    if (sync.found) {
      if (sync.changed) {
        updated++;
        changed = true;
      }
      continue;
    }
    hookConfig[event].push({ type: "command", command: expectedCommand, timeout: 5 });
    added++;
    changed = true;
  }

  if (changed) writeJsonAtomic(settingsPath, settings);
  return { added, updated, removed, settingsPath };
}

function registerCursorHooks(options = {}) {
  const settingsPath = options.settingsPath || path.join(os.homedir(), ".cursor", "hooks.json");
  const hookScript = options.hookScript || path.join(__dirname, "catjang-cursor-hook.js");
  const nodeBin = options.nodeBin || resolveNodeBin();
  const settings = readJson(settingsPath);
  if (!settings.hooks || typeof settings.hooks !== "object") settings.hooks = {};
  if (!settings.version) settings.version = 1;

  let added = 0;
  let updated = 0;
  let changed = false;

  for (const event of CURSOR_HOOK_EVENTS) {
    if (!Array.isArray(settings.hooks[event])) {
      const existing = settings.hooks[event];
      settings.hooks[event] = existing && typeof existing === "object" ? [existing] : [];
      changed = true;
    }
    const expectedCommand = process.platform === "win32"
      ? `node "${hookScript}" ${event}`
      : `"${nodeBin}" "${hookScript}" ${event}`;
    const sync = syncCommandHook(settings.hooks[event], expectedCommand, CURSOR_HOOK_MARKER);
    if (sync.found) {
      if (sync.changed) {
        updated++;
        changed = true;
      }
      continue;
    }
    settings.hooks[event].push({
      command: expectedCommand,
    });
    added++;
    changed = true;
  }

  if (changed) writeJsonAtomic(settingsPath, settings);
  return { added, updated, settingsPath };
}

module.exports = {
  CLAUDE_HOOK_EVENTS,
  ANTIGRAVITY_HOOK_EVENTS,
  CURSOR_HOOK_EVENTS,
  registerAntigravityHooks,
  registerClaudeHooks,
  registerCursorHooks,
};
