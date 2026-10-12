"use strict";
module.exports = async function beforePack(context) {
  if (context.electronPlatformName !== "linux") return;
  // No imports, child processes or resource changes on Windows/macOS builds.
  const {execFile} = require("node:child_process");
  const {promisify} = require("node:util");
  const path = require("node:path");
  const {stdout} = await promisify(execFile)("python3", [path.join(__dirname, "build.py"), "--application"],
    {cwd: context.packager.info.projectDir});
  if (stdout.trim()) console.log(stdout.trim());
};
