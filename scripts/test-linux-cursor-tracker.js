"use strict";

const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const { createLinuxCursorTracker } = require("../agents/linux-cursor-tracker");

function fixture() {
  let time = 100;
  const children = [];
  const warnings = [];
  const tracker = createLinuxCursorTracker({
    scriptPath: "/test/linux-cursor-tracker.py",
    now: () => time,
    onWarning: (error) => warnings.push(error),
    spawnProcess: () => {
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.kill = () => { child.killed = true; };
      children.push(child);
      return child;
    },
  });
  return { tracker, children, warnings, advance: (ms) => { time += ms; } };
}

test("partial output, negative monitor coordinates and malformed data", () => {
  const { tracker, children } = fixture();
  tracker.start();
  const output = children[0].stdout;
  output.write("-1920 ");
  assert.equal(tracker.getPosition(), null);
  output.write("1080\n");
  assert.deepEqual(tracker.getPosition(), { x: -1920, y: 1080 });
  output.write("1oops 2\n1 2 extra\nNaN 2\n9007199254740992 0\n");
  assert.deepEqual(tracker.getPosition(), { x: -1920, y: 1080 });
  tracker.stop();
});

test("stationary heartbeat keeps data fresh; stalled output expires", () => {
  const { tracker, children, advance } = fixture();
  tracker.start();
  children[0].stdout.write("10 20\n");
  advance(800);
  children[0].stdout.write("10 20\n");
  advance(800);
  assert.deepEqual(tracker.getPosition(), { x: 10, y: 20 });
  advance(200);
  assert.equal(tracker.getPosition(), null);
  tracker.stop();
});

test("unavailable Python and DBus exit clear coordinates without uncaught errors", () => {
  const { tracker, children, warnings } = fixture();
  tracker.start();
  children[0].emit("error", new Error("spawn python3 ENOENT"));
  assert.equal(warnings.length, 1);
  assert.equal(tracker.getPosition(), null);
  tracker.start();
  children[1].stdout.write("10 20\n");
  children[1].emit("exit", 0);
  assert.equal(tracker.getPosition(), null);
  tracker.stop();
});

test("start and stop are idempotent; an old process cannot clear a new tracker", () => {
  const { tracker, children } = fixture();
  tracker.start();
  tracker.start();
  assert.equal(children.length, 1);
  children[0].stdout.write("10 20\n");
  tracker.stop();
  tracker.stop();
  assert.equal(children[0].killed, true);
  assert.equal(tracker.getPosition(), null);
  tracker.start();
  children[1].stdout.write("30 40\n");
  children[0].emit("exit", 0);
  children[0].stdout.write("99 99\n");
  assert.deepEqual(tracker.getPosition(), { x: 30, y: 40 });
  tracker.stop();
});

test("Python helper emits stationary heartbeats and exits when DBus disappears", () => {
  const helper = path.join(__dirname, "linux-cursor-tracker.py");
  const result = spawnSync("python3", ["-c", `
import runpy, sys, time, types
calls = 0
def get_info():
    global calls
    calls += 1
    if calls > 8:
        raise RuntimeError('extension disabled')
    return ['', '', -100, 200]
clock = 0
def monotonic():
    global clock
    clock += 0.1
    return clock
time.monotonic = monotonic
time.sleep = lambda seconds: None
iface = types.SimpleNamespace(GetWMInfo=get_info)
bus = types.SimpleNamespace(get_object=lambda *args: object())
sys.modules['dbus'] = types.SimpleNamespace(SessionBus=lambda: bus, Interface=lambda *args: iface)
runpy.run_path(sys.argv[1], run_name='__main__')
`, helper], { encoding: "utf8", timeout: 3000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split("\n"), ["-100 200", "-100 200", "-100 200"]);
});
