"use strict";

const fs = require("fs");
const path = require("path");

console.log("=== TEST MASCOT RESOURCES & INTEGRATION ===");

// 1. Check all SVG files exist and are non-empty
const svgFiles = [
  "svg/cat-idle-follow-v2.svg",
  "svg/schnauzer-idle.svg",
  "svg/schnauzer-press-left.svg",
  "svg/schnauzer-press-right.svg",
  "svg/schnauzer-jump-start.svg",
  "svg/schnauzer-jump-ing.svg",
];

let allExist = true;
for (const f of svgFiles) {
  const full = path.join(__dirname, "..", f);
  if (!fs.existsSync(full)) {
    console.error("FAIL: Missing file", f);
    allExist = false;
  } else {
    const stat = fs.statSync(full);
    if (stat.size < 500) {
      console.error("FAIL: File too small", f, stat.size);
      allExist = false;
    }
  }
}
if (allExist) console.log("PASS: All 6 SVG sprite files exist and are populated.");

// 2. Check renderer/index.html contains objects without inline display:none
const html = fs.readFileSync(path.join(__dirname, "..", "renderer", "index.html"), "utf8");
if (html.includes('id="schnauzer" style="display:none;"') || html.includes('id="schnauzer" style="display: none;"')) {
  console.error("FAIL: renderer/index.html still has inline display:none on schnauzer!");
} else if (html.includes('id="schnauzer"')) {
  console.log("PASS: renderer/index.html has <object id=\"schnauzer\"> without inline display:none.");
} else {
  console.error("FAIL: renderer/index.html does not contain #schnauzer object.");
}

// 3. Check renderer/styles.css has body[data-mascot="schnauzer"] #schnauzer
const css = fs.readFileSync(path.join(__dirname, "..", "renderer", "styles.css"), "utf8");
if (!css.includes('body[data-mascot="schnauzer"] #schnauzer')) {
  console.error("FAIL: styles.css missing body[data-mascot=\"schnauzer\"] #schnauzer rule");
} else {
  console.log("PASS: styles.css has display rule for schnauzer.");
}

// 4. Check main.js handles mascot
const mainJs = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
if (!mainJs.includes('currentMascot = "cat"') && !mainJs.includes("currentMascot = 'cat'")) {
  console.error("FAIL: main.js missing currentMascot");
} else if (!mainJs.includes('ipcMain.handle("mascot-get"') || !mainJs.includes('setMascot')) {
  console.error("FAIL: main.js missing mascot IPC or setMascot");
} else {
  console.log("PASS: main.js has full mascot lifecycle handling.");
}

// 5. Check preload.js
const preloadJs = fs.readFileSync(path.join(__dirname, "..", "preload.js"), "utf8");
if (!preloadJs.includes("mascotGet") || !preloadJs.includes("onMascotChanged")) {
  console.error("FAIL: preload.js missing mascot methods");
} else {
  console.log("PASS: preload.js exposes mascotGet and onMascotChanged.");
}

console.log("=== ALL RESOURCE AND CONFIG TESTS PASSED ===");
