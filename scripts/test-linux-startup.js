"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const afterPack = require("./after-pack-linux");
const root = path.resolve(__dirname, "..");

async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "catjang launcher "));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const fake = '#!/usr/bin/env bash\nprintf "%s\\0" "$@"\nexit "${CATJANG_TEST_EXIT:-0}"\n';
  await fs.mkdir(path.join(dir, "resources"));
  await fs.copyFile(path.join(__dirname, "linux-backend.sh"), path.join(dir, "resources", "linux-backend.sh"));
  await fs.writeFile(path.join(dir, "catjang"), fake, { mode: 0o755 });
  await afterPack({ electronPlatformName: "linux", appOutDir: dir, packager: { executableName: "catjang" } });
  await fs.mkdir(path.join(dir, "scripts"));
  await fs.copyFile(path.join(root, "run-linux.sh"), path.join(dir, "run-linux.sh"));
  await fs.copyFile(path.join(__dirname, "linux-backend.sh"), path.join(dir, "scripts", "linux-backend.sh"));
  await fs.mkdir(path.join(dir, "node_modules", "electron", "dist"), { recursive: true });
  await fs.writeFile(path.join(dir, "node_modules", "electron", "dist", "electron"), fake, { mode: 0o755 });
  return dir;
}

function launch(binary, args = [], env = {}) {
  const result = spawnSync("bash", [binary, ...args], { encoding: "utf8",
    env: { ...process.env, XDG_SESSION_TYPE: "wayland", CATJANG_NATIVE_WAYLAND: "0", CATJANG_USE_APPIMAGE: "0", ...env } });
  if (result.error) throw result.error;
  return { status: result.status, args: result.stdout.split("\0").slice(0, -1) };
}

test("source and package select XWayland before exec and preserve arguments", async (t) => {
  const dir = await fixture(t);
  for (const script of ["catjang", "run-linux.sh"]) {
    const result = launch(path.join(dir, script), ["--user-data-dir=/tmp/a b", "literal $(value)"]);
    assert.equal(result.status, 0);
    assert.equal(result.args.filter((arg) => arg === "--ozone-platform=x11").length, 1);
    assert.deepEqual(result.args.slice(-2), ["--user-data-dir=/tmp/a b", "literal $(value)"]);
    if (script === "run-linux.sh") assert.equal(result.args[0], dir);
  }
});

test("native Wayland is opt-in; both explicit switch forms win", async (t) => {
  const dir = await fixture(t);
  for (const script of ["catjang", "run-linux.sh"]) {
    const binary = path.join(dir, script);
    assert.ok(launch(binary, [], { CATJANG_NATIVE_WAYLAND: "1" }).args.includes("--ozone-platform=wayland"));
    for (const [args, native] of [[['--ozone-platform=x11'], "1"], [['--ozone-platform=wayland'], "0"], [['--ozone-platform', 'x11'], "1"]]) {
      const result = launch(binary, args, { CATJANG_NATIVE_WAYLAND: native });
      assert.equal(result.args.filter((arg) => arg.startsWith("--ozone-platform")).length, 1);
      assert.deepEqual(result.args.slice(-args.length), args);
    }
    for (const session of ["x11", ""]) {
      assert.ok(!launch(binary, ["test"], { XDG_SESSION_TYPE: session }).args.some((arg) => arg.startsWith("--ozone-platform")));
    }
  }
});

test("package wrapper handles symlinks and preserves exit codes", async (t) => {
  const dir = await fixture(t);
  const link = path.join(dir, "custom alias");
  await fs.symlink(path.join(dir, "catjang"), link);
  assert.equal(launch(link, [], { CATJANG_TEST_EXIT: "7" }).status, 7);
});

test("packaging hook leaves Windows and macOS untouched", async () => {
  for (const platform of ["win32", "darwin"]) {
    await afterPack({ electronPlatformName: platform, get appOutDir() { throw new Error("must not access output"); } });
  }
});

test("npm start preserves the Electron invocation on Windows and macOS", async () => {
  const source = await fs.readFile(path.join(__dirname, "start.js"), "utf8");
  for (const platform of ["win32", "darwin", "linux"]) {
    let invocation;
    let delegated = false;
    const child = { on() {}, kill() {} };
    const processStub = { platform, argv: ["node", "start.js", "--test"], on() {} };
    vm.runInNewContext(source, { __dirname, console, process: processStub,
      require: (name) => {
        if (name === "node:path") return path;
        if (name === "electron/cli.js") { delegated = true; return; }
        if (name === "node:child_process") return { spawn: (...args) => { invocation = args; return child; } };
        throw new Error(`unexpected require: ${name}`);
      } });
    if (platform === "linux") {
      assert.deepEqual(Array.from(invocation[1]), [path.join(root, "run-linux.sh"), "--test"]);
      assert.equal(invocation[0], "bash");
      assert.equal(delegated, false);
    } else {
      assert.equal(invocation, undefined);
      assert.equal(delegated, true);
      assert.deepEqual(processStub.argv.slice(2), [".", "--test"]);
    }
  }
});
