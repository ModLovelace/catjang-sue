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
    defaultName: "Toto",
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
  chisi: {
    id: "chisi",
    defaultName: "Chisi",
    label: "Caniche Toy (Chisi) 🐩",
    soundType: "bark",
    folder: "svg/chisi",
    petting: { cx: 0.50, cy: 0.35, rx: 0.28, ry: 0.26 },
    elements: {
      idle: "chisi",
      pressLeft: "chisi-press-left",
      pressRight: "chisi-press-right",
      scroll: "chisi-scroll-unroll",
      jumpStart: "chisi-jump-start",
      jumpIng: "chisi-jump-ing",
      drag: "chisi-drag",
      stretch: "chisi-stretch",
    },
    svgFiles: {
      idle: "svg/chisi/idle.svg",
      pressLeft: "svg/chisi/press-left.svg",
      pressRight: "svg/chisi/press-right.svg",
      scroll: "svg/chisi/scroll.svg",
      jumpStart: "svg/chisi/jump-start.svg",
      jumpIng: "svg/chisi/jump-ing.svg",
      drag: "svg/chisi/drag.svg",
      stretch: "svg/chisi/stretch.svg",
    },
  },
  milo: {
    id: "milo",
    defaultName: "Milo",
    label: "Milo (Milongas) 🐕",
    soundType: "bark",
    folder: "svg/milo",
    petting: { cx: 0.50, cy: 0.34, rx: 0.28, ry: 0.26 },
    elements: {
      idle: "milo",
      pressLeft: "milo-press-left",
      pressRight: "milo-press-right",
      scroll: "milo-scroll-unroll",
      jumpStart: "milo-jump-start",
      jumpIng: "milo-jump-ing",
      drag: "milo-drag",
      stretch: "milo-stretch",
    },
    svgFiles: {
      idle: "svg/milo/idle.svg",
      pressLeft: "svg/milo/press-left.svg",
      pressRight: "svg/milo/press-right.svg",
      scroll: "svg/milo/scroll.svg",
      jumpStart: "svg/milo/jump-start.svg",
      jumpIng: "svg/milo/jump-ing.svg",
      drag: "svg/milo/drag.svg",
      stretch: "svg/milo/stretch.svg",
    },
  },
  musubi: {
    id: "musubi",
    defaultName: "Musubi",
    label: "Gato Atigrado (Musubi) 🐱",
    soundType: "meow",
    folder: "svg/musubi",
    petting: { cx: 0.48, cy: 0.33, rx: 0.26, ry: 0.24 },
    elements: {
      idle: "musubi",
      pressLeft: "musubi-press-left",
      pressRight: "musubi-press-right",
      scroll: "musubi-scroll-unroll",
      jumpStart: "musubi-jump-start",
      jumpIng: "musubi-jump-ing",
      drag: "musubi-drag",
      stretch: "musubi-stretch",
    },
    svgFiles: {
      idle: "svg/musubi/idle.svg",
      pressLeft: "svg/musubi/press-left.svg",
      pressRight: "svg/musubi/press-right.svg",
      scroll: "svg/musubi/scroll.svg",
      jumpStart: "svg/musubi/jump-start.svg",
      jumpIng: "svg/musubi/jump-ing.svg",
      drag: "svg/musubi/drag.svg",
      stretch: "svg/musubi/stretch.svg",
    },
  },
  peruperro: {
    id: "peruperro",
    defaultName: "Inca",
    label: "Perro Peruano Calado (Inca) 🐕",
    soundType: "bark",
    folder: "svg/peruperro",
    petting: { cx: 0.50, cy: 0.33, rx: 0.26, ry: 0.24 },
    elements: {
      idle: "peruperro",
      pressLeft: "peruperro-press-left",
      pressRight: "peruperro-press-right",
      scroll: "peruperro-scroll-unroll",
      jumpStart: "peruperro-jump-start",
      jumpIng: "peruperro-jump-ing",
      drag: "peruperro-drag",
      stretch: "peruperro-stretch",
    },
    svgFiles: {
      idle: "svg/peruperro/idle.svg",
      pressLeft: "svg/peruperro/press-left.svg",
      pressRight: "svg/peruperro/press-right.svg",
      scroll: "svg/peruperro/scroll.svg",
      jumpStart: "svg/peruperro/jump-start.svg",
      jumpIng: "svg/peruperro/jump-ing.svg",
      drag: "svg/peruperro/drag.svg",
      stretch: "svg/peruperro/stretch.svg",
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
