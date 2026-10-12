"use strict";

// Extract, never install, the Linux distribution packages. Check their real
// first window under XWayland; the smoke alone exits before creating a window.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const version = require("../package.json").version;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "catjang-bundles-"));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 60000, ...options });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

async function checkWindow(name, executable) {
  const profile = path.join(temp, `${name}-profile`);
  const child = spawn(executable, ["--no-sandbox", `--user-data-dir=${profile}`], {
    env: { ...process.env, XDG_SESSION_TYPE: "wayland", CATJANG_NATIVE_WAYLAND: "0",
      CATJANG_ENABLE_AGENT_INTEGRATIONS: "0", CATJANG_ENABLE_GLOBAL_INPUT: "0",
      XDG_CONFIG_HOME: profile, XDG_CACHE_HOME: path.join(profile, "cache"), XDG_DATA_HOME: path.join(profile, "data") },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  const exited = new Promise((resolve, reject) => { child.once("exit", resolve); child.once("error", reject); });
  try {
    let visible = false;
    for (let i = 0; i < 60 && !visible; i++) {
      assert.equal(child.exitCode, null, output);
      const clients = run("xprop", ["-root", "_NET_CLIENT_LIST"]);
      for (const id of clients.match(/0x[0-9a-f]+/gi) || []) {
        const pid = spawnSync("xprop", ["-id", id, "_NET_WM_PID"], { encoding: "utf8" }).stdout;
        if (!new RegExp(`= ${child.pid}\\s*$`).test(pid)) continue;
        const window = run("xwininfo", ["-id", id]);
        if (/Map State: IsViewable/.test(window)) { visible = true; break; }
      }
      if (!visible) await wait(100);
    }
    assert.ok(visible, `${name}: no visible native X11 window\n${output}`);
    assert.ok(output.includes("windowBackend: 'x11'"), output);
    console.log(`PASS ${name}: default launch creates a visible native X11 window`);
  } finally {
    child.kill("SIGTERM");
    const killTimer = setTimeout(() => child.kill("SIGKILL"), 3000);
    await exited;
    clearTimeout(killTimer);
  }
}

(async () => {
  assert.equal(process.platform, "linux");
  const appImageDir = path.join(temp, "appimage");
  const debDir = path.join(temp, "deb");
  fs.mkdirSync(appImageDir);
  run(path.join(root, "dist", `Catjang-${version}.AppImage`), ["--appimage-extract"], { cwd: appImageDir });
  run("dpkg-deb", ["-x", path.join(root, "dist", `catjang_${version}_amd64.deb`), debDir]);
  const bundles = [["directory", path.join(root, "dist", "linux-unpacked")],
    ["AppImage", path.join(appImageDir, "squashfs-root")], ["deb", path.join(debDir, "opt", "Catjang")]];
  for (const [name, dir] of bundles) {
    for (const file of ["catjang", "catjang-bin", "resources/app.asar", "resources/linux-backend.sh", "resources/linux-cursor-tracker.py"]) {
      assert.ok(fs.readFileSync(path.join(dir, file)).equals(fs.readFileSync(path.join(root, "dist", "linux-unpacked", file))), `${name}: ${file}`);
    }
    await checkWindow(name, path.join(dir, name === "AppImage" ? "AppRun" : "catjang"));
  }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => {
  fs.rmSync(temp, { recursive: true, force: true });
});
