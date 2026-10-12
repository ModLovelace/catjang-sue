"use strict";

const path = require("node:path");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "..");
if (process.platform !== "linux") {
  // Use Electron's original CLI, including its signal and exit handling.
  process.argv.splice(2, 0, ".");
  require("electron/cli.js");
} else {
  const child = spawn("bash", [path.join(root, "run-linux.sh"), ...process.argv.slice(2)], { stdio: "inherit" });
  let closed = false;
  child.on("error", (error) => { console.error(error); process.exitCode = 1; });
  child.on("close", (code) => { closed = true; process.exitCode = code === null ? 1 : code; });
  for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
    process.on(signal, () => { if (!closed) child.kill(signal); });
  }
}
