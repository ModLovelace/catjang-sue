"use strict";

/**
 * Catjang Mascot Registry & Architecture
 * Defines all available mascots, their folder locations, animation equivalents,
 * default names, sound profiles, and petting hitbox geometry.
 */
const MASCOTS = {
  cat: {
    id: "cat",
    defaultName: "Catjang",
    label: "Gatito (Catjang) 🐱",
    soundType: "meow",
    folder: "svg/cat",
    petting: { cx: 0.40, cy: 0.33, rx: 0.25, ry: 0.23 },
    elements: {
      idle: "cat",
      pressLeft: "press-left",
      pressRight: "press-right",
      scroll: "scroll-unroll",
      jumpStart: "jump-start",
      jumpIng: "jump-ing",
      drag: "stretch-svg-end",
      stretch: "stretch-pose-default",
    },
    svgFiles: {
      idle: "svg/cat/idle.svg",
      pressLeft: "svg/cat/press-left.svg",
      pressRight: "svg/cat/press-right.svg",
      scroll: "svg/cat/scroll.svg",
      jumpStart: "svg/cat/jump-start.svg",
      jumpIng: "svg/cat/jump-ing.svg",
      drag: "svg/cat/drag.svg",
      stretch: "svg/cat/stretch.svg",
    },
  },
  schnauzer: {
    id: "schnauzer",
    defaultName: "Otto",
    label: "Perrito (Schnauzer) 🐶",
    soundType: "bark",
    folder: "svg/schnauzer",
    petting: { cx: 0.50, cy: 0.34, rx: 0.28, ry: 0.26 },
    elements: {
      idle: "schnauzer",
      pressLeft: "schnauzer-press-left",
      pressRight: "schnauzer-press-right",
      scroll: "schnauzer-scroll-unroll",
      jumpStart: "schnauzer-jump-start",
      jumpIng: "schnauzer-jump-ing",
      drag: "schnauzer-drag",
      stretch: "schnauzer-stretch",
    },
    svgFiles: {
      idle: "svg/schnauzer/idle.svg",
      pressLeft: "svg/schnauzer/press-left.svg",
      pressRight: "svg/schnauzer/press-right.svg",
      scroll: "svg/schnauzer/scroll.svg",
      jumpStart: "svg/schnauzer/jump-start.svg",
      jumpIng: "svg/schnauzer/jump-ing.svg",
      drag: "svg/schnauzer/drag.svg",
      stretch: "svg/schnauzer/stretch.svg",
    },
  },
};

function getMascot(id) {
  return MASCOTS[id] || MASCOTS.cat;
}

function getMascotPoseElementId(mascotId, pose) {
  const m = getMascot(mascotId);
  return m && m.elements && m.elements[pose] ? m.elements[pose] : null;
}

function listMascotIds() {
  return Object.keys(MASCOTS);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MASCOTS,
    getMascot,
    getMascotPoseElementId,
    listMascotIds,
  };
}
