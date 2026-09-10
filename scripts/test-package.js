"use strict";

// Check the Windows directory build without opening or changing user settings.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const asar = require("@electron/asar");
const root = path.resolve(__dirname, "..");
const build = path.join(root, "dist", "win-unpacked");
const archive = path.join(build, "resources", "app.asar");
for (const file of ["main.js", "preload.js", "renderer/renderer.js", "renderer/mascots.js"]) {
  assert.ok(asar.extractFile(archive, path.normalize(file)).equals(fs.readFileSync(path.join(root, file))), `${file}: packaged source must match working tree`);
}
for (const mascot of ["cat", "schnauzer", "chisi", "milo", "musubi", "peruperro"]) {
  for (const pose of ["idle", "press-left", "press-right", "scroll", "jump-start", "jump-ing", "drag", "stretch"]) {
    const file = path.join("svg", mascot, `${pose}.svg`);
    assert.ok(asar.extractFile(archive, file).equals(fs.readFileSync(path.join(root, file))), file);
  }
}
assert.ok(fs.statSync(path.join(build, "resources", "ffmpeg", "ffmpeg.exe")).size > 0);
assert.ok(!asar.listPackage(archive).some((file) => /scripts[\\/]test-|scripts[\\/]qa-/.test(file)), "Test harnesses must not ship");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "catjang-package-"));
const smoke = spawnSync(path.join(build, "Catjang.exe"), ["--catjang-smoke-test", `--user-data-dir=${profile}`], {
  cwd: root, encoding: "utf8", timeout: 20000, windowsHide: true,
});
if (smoke.error) throw smoke.error;
assert.equal(smoke.status, 0, smoke.stderr || smoke.stdout);
assert.ok(smoke.stdout.includes("smoke test passed"), smoke.stdout + smoke.stderr);
console.log(`PACKAGE PASSED: current sources, 48 SVGs, external FFmpeg, no test harnesses; smoke exit 0; app.asar ${fs.statSync(archive).size} bytes`);
