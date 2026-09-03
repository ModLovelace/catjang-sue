"use strict";

/**
 * Catjang Mascot Registry
 * Defines all available mascots and their animated pose equivalents based on the original Cat.
 * Each mascot has its own default name and complete set of animation SVG elements.
 */
const MASCOTS = {
  cat: {
    id: "cat",
    defaultName: "Catjang",
    label: "Gatito (Catjang) 🐱",
    sound: "meow",
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
      idle: "svg/cat-idle-follow-v2.svg",
      pressLeft: "svg/press-left.svg",
      pressRight: "svg/press-right.svg",
      scroll: "svg/scroll-unroll.svg",
      jumpStart: "svg/jump-start.svg",
      jumpIng: "svg/jump-ing.svg",
      drag: "svg/stretch-end.svg",
      stretch: "svg/stretch-pose-default.svg",
    },
  },
  schnauzer: {
    id: "schnauzer",
    defaultName: "Otto",
    label: "Perrito (Schnauzer) 🐶",
    sound: "bark",
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
      idle: "svg/schnauzer-idle.svg",
      pressLeft: "svg/schnauzer-press-left.svg",
      pressRight: "svg/schnauzer-press-right.svg",
      scroll: "svg/schnauzer-scroll-unroll.svg",
      jumpStart: "svg/schnauzer-jump-start.svg",
      jumpIng: "svg/schnauzer-jump-ing.svg",
      drag: "svg/schnauzer-drag.svg",
      stretch: "svg/schnauzer-stretch.svg",
    },
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = MASCOTS;
}
