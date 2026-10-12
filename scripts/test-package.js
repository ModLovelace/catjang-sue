"use strict";

// Check the current platform's directory build with temporary user settings.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const asar = require("@electron/asar");
const root = path.resolve(__dirname, "..");
const isWindows = process.platform === "win32";
const isLinux = process.platform === "linux";
assert.ok(isWindows || isLinux, "This package check currently supports Windows and Linux");
const build = path.join(root, "dist", isWindows ? "win-unpacked" : "linux-unpacked");
const archive = path.join(build, "resources", "app.asar");
for (const file of ["main.js", "preload.js", "renderer/renderer.js", "renderer/mascots.js", "renderer/stretch-overlay.html", "agents/linux-cursor-tracker.js"]) {
  assert.ok(asar.extractFile(archive, path.normalize(file)).equals(fs.readFileSync(path.join(root, file))), `${file}: packaged source must match working tree`);
}
for (const mascot of ["cat", "schnauzer", "chisi", "milo", "musubi", "peruperro"]) {
  for (const pose of ["idle", "press-left", "press-right", "scroll", "jump-start", "jump-ing", "drag", "stretch"]) {
    const file = path.join("svg", mascot, `${pose}.svg`);
    assert.ok(asar.extractFile(archive, file).equals(fs.readFileSync(path.join(root, file))), file);
  }
}
assert.ok(fs.statSync(path.join(build, "resources", "ffmpeg", isWindows ? "ffmpeg.exe" : "ffmpeg")).size > 0);
if (isLinux) {
  assert.ok(fs.readFileSync(path.join(build, "resources", "linux-backend.sh"))
    .equals(fs.readFileSync(path.join(root, "scripts", "linux-backend.sh"))));
  assert.ok(fs.readFileSync(path.join(build, "catjang"), "utf8").startsWith("#!/usr/bin/env bash"));
  assert.equal(fs.readFileSync(path.join(build, "catjang-bin")).subarray(0, 4).toString(), "\x7fELF");
  assert.ok(fs.readFileSync(path.join(build, "resources", "linux-cursor-tracker.py"))
    .equals(fs.readFileSync(path.join(root, "scripts", "linux-cursor-tracker.py"))),
  "Python tracker must be shipped outside app.asar for python3 to read it");
}
assert.ok(!asar.listPackage(archive).some((file) => /scripts[\\/]test-|scripts[\\/]qa-/.test(file)), "Test harnesses must not ship");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "catjang-package-"));
const smoke = spawnSync(path.join(build, isWindows ? "Catjang.exe" : "catjang"), ["--catjang-smoke-test", `--user-data-dir=${profile}`, ...process.argv.slice(2)], {
  cwd: root, encoding: "utf8", timeout: 20000, windowsHide: true,
  env: { ...process.env, XDG_CONFIG_HOME: profile, XDG_CACHE_HOME: path.join(profile, "cache"), XDG_DATA_HOME: path.join(profile, "data") },
});
if (smoke.error) throw smoke.error;
assert.equal(smoke.status, 0, smoke.stderr || smoke.stdout);
assert.ok(smoke.stdout.includes("smoke test passed"), smoke.stdout + smoke.stderr);
assert.ok(!/XGetWindowAttributes failed/.test(smoke.stderr), smoke.stderr);
if (isLinux && process.env.XDG_SESSION_TYPE === "wayland" &&
    process.env.CATJANG_NATIVE_WAYLAND !== "1" &&
    !process.argv.slice(2).some((arg) => arg.startsWith("--ozone-platform"))) {
  assert.ok(smoke.stdout.includes("windowBackend: 'x11'"), smoke.stdout);
}
console.log(`PACKAGE PASSED: current sources, 48 SVGs, external FFmpeg, no test harnesses; smoke exit 0; app.asar ${fs.statSync(archive).size} bytes`);
