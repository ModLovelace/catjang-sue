"use strict";

const { spawn } = require("node:child_process");
const readline = require("node:readline");

// The Python helper sends a heartbeat even when the pointer is stationary.
// Expire coordinates if DBus stalls so Electron can supply the fallback.
function createLinuxCursorTracker({ scriptPath, spawnProcess = spawn, now = Date.now, onWarning = () => {} }) {
  let child = null;
  let reader = null;
  let position = null;
  let receivedAt = 0;

  function stop() {
    const previous = child;
    child = null;
    position = null;
    receivedAt = 0;
    if (reader) reader.close();
    reader = null;
    if (previous) previous.kill();
  }

  function start() {
    if (child) return;
    try {
      const process = spawnProcess("python3", [scriptPath], { stdio: ["ignore", "pipe", "ignore"] });
      child = process;
      const lines = readline.createInterface({ input: process.stdout });
      reader = lines;
      lines.on("line", (line) => {
        if (child !== process || !/^-?\d+\s+-?\d+$/.test(line.trim())) return;
        const [x, y] = line.trim().split(/\s+/).map(Number);
        if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) return;
        position = { x, y };
        receivedAt = now();
      });
      const clear = () => {
        lines.close();
        if (child !== process) return;
        child = null;
        reader = null;
        position = null;
        receivedAt = 0;
      };
      process.once("error", (error) => {
        clear();
        onWarning(error);
      });
      process.once("exit", clear);
    } catch (error) {
      stop();
      onWarning(error);
    }
  }

  return {
    start,
    stop,
    getPosition: () => position && now() - receivedAt < 1000 ? position : null,
  };
}

module.exports = { createLinuxCursorTracker };
