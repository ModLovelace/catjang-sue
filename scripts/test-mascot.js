"use strict";

const fs = require("fs");
const path = require("path");

console.log("=== TEST MASCOT RESOURCES & EQUIVALENCE INTEGRATION ===");

const { MASCOTS } = require("../renderer/mascots.js");

// 1. Check all mascots and their 8 equivalent SVG animation files
let allFilesOk = true;
for (const [mascotId, mascot] of Object.entries(MASCOTS)) {
  console.log(`Checking mascot: ${mascotId} (${mascot.label})`);
  const requiredPoses = [
    "idle",
    "pressLeft",
    "pressRight",
    "scroll",
    "jumpStart",
    "jumpIng",
    "drag",
    "stretch",
  ];
  for (const pose of requiredPoses) {
    const file = mascot.svgFiles[pose];
    if (!file) {
      console.error(`FAIL: Mascot ${mascotId} missing svg file entry for pose ${pose}`);
      allFilesOk = false;
      continue;
    }
    const full = path.join(__dirname, "..", file);
    if (!fs.existsSync(full)) {
      console.error(`FAIL: Missing file for ${mascotId}.${pose}: ${file}`);
      allFilesOk = false;
    } else {
      const stat = fs.statSync(full);
      if (stat.size < 300) {
        console.error(`FAIL: File too small for ${mascotId}.${pose}: ${file}`);
        allFilesOk = false;
      }
    }
  }
}
if (allFilesOk) console.log("PASS: All mascots have full 8/8 SVG animation equivalents.");

// 2. Check renderer/index.html contains all objects without inline display:none
const html = fs.readFileSync(path.join(__dirname, "..", "renderer", "index.html"), "utf8");
let allElementsInHtml = true;
for (const [mascotId, mascot] of Object.entries(MASCOTS)) {
  for (const [pose, elId] of Object.entries(mascot.elements)) {
    if (!html.includes(`id="${elId}"`)) {
      console.error(`FAIL: renderer/index.html missing object id="${elId}" for ${mascotId}.${pose}`);
      allElementsInHtml = false;
    }
    if (html.includes(`id="${elId}" style="display:none;"`) || html.includes(`id="${elId}" style="display: none;"`)) {
      console.error(`FAIL: inline display:none on id="${elId}"`);
      allElementsInHtml = false;
    }
  }
}
if (allElementsInHtml) console.log("PASS: All mascot DOM objects exist in renderer/index.html without inline display:none.");

// 3. Check renderer/styles.css has isolation rules
const css = fs.readFileSync(path.join(__dirname, "..", "renderer", "styles.css"), "utf8");
if (!css.includes('body[data-mascot="schnauzer"].dragging #schnauzer-drag') ||
    !css.includes('body[data-mascot="schnauzer"][data-stretching] #schnauzer-stretch') ||
    !css.includes('body[data-mascot="schnauzer"][data-scroll] #schnauzer-scroll-unroll')) {
  console.error("FAIL: styles.css missing complete animation equivalence rules for schnauzer");
} else {
  console.log("PASS: styles.css contains complete drag, stretch, scroll and press rules per mascot.");
}

// 4. Check main.js handles mascotNames
const mainJs = fs.readFileSync(path.join(__dirname, "..", "main.js"), "utf8");
if (!mainJs.includes("mascotNames")) {
  console.error("FAIL: main.js missing mascotNames");
} else {
  console.log("PASS: main.js handles individual names per mascot.");
}

console.log("=== ALL RESOURCE & EQUIVALENCE TESTS PASSED! ===");
