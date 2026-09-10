"use strict";

const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_BASE_COLOR = "#1A1A1A";
const CELL_PX = 10;

const PARTS = {
  head: {
    labels: { es: "Cabeza", en: "Head", ko: "머리", ja: "頭" },
    icon: "🐱",
    cells: { x: 22, y: 18 },
    silhouettePath: "M4 3H2V5H1V7H0V12H1V16H3V17H4V18H6V19H16V18H18V17H19V16H20V15H21V12H22V8H21V5H20V4H19V3H17V2H15V1H7V2H4V3Z",
    silhouetteTransform: "translate(0 -1)",
  },
  body: {
    labels: { es: "Cuerpo", en: "Body", ko: "몸통", ja: "胴体" },
    icon: "🟫",
    cells: { x: 22, y: 15 },
    silhouettePath: "M15 0V1H18V2H20V3H21V6H22V11H21V14H19V15H3V14H1V11H0V6H1V3H2V2H4V1H7V0H15Z",
    silhouetteTransform: "translate(0 0)",
  },
  tail: {
    labels: { es: "Cola", en: "Tail", ko: "꼬리", ja: "しっぽ" },
    icon: "〰️",
    cells: { x: 13, y: 10 },
    silhouettePath: "M0 8V7H6V6H8V5H9V4H8V1H9V0H11V1H12V2H13V7H12V8H11V9H9V10H4V9H1V8H0Z",
    silhouetteTransform: "translate(0 0)",
  },
  legFl: {
    labels: { es: "Pata delantera izquierda", en: "Left arm", ko: "왼팔", ja: "左腕" },
    icon: "🦶",
    cells: { x: 8, y: 11 },
    silhouettePath: "M6 29V26H7V25H10V26H11V28H12V31H13V32H14V35H13V36H9V35H8V31H7V29H6Z",
    silhouetteTransform: "translate(-6 -25)",
  },
  legFr: {
    labels: { es: "Pata delantera derecha", en: "Right arm", ko: "오른팔", ja: "右腕" },
    icon: "🦶",
    cells: { x: 8, y: 11 },
    silhouettePath: "M23 29V26H22V25H19V26H18V28H17V31H16V32H15V35H16V36H20V35H21V31H22V29H23Z",
    silhouetteTransform: "translate(-15 -25)",
  },
  legRl: {
    labels: { es: "Pata trasera izquierda", en: "Left foot", ko: "왼발", ja: "左足" },
    icon: "🦶",
    cells: { x: 8, y: 8 },
    silhouettePath: "M10 138V134H18V138H17V140H16V142H12V140H11V138H10Z",
    silhouetteTransform: "translate(-10 -134)",
  },
  legRr: {
    labels: { es: "Pata trasera derecha", en: "Right foot", ko: "오른발", ja: "右足" },
    icon: "🦶",
    cells: { x: 8, y: 8 },
    silhouettePath: "M22 138V134H30V138H29V140H28V142H24V140H23V138H22Z",
    silhouetteTransform: "translate(-22 -134)",
  },
  earL: {
    labels: { es: "Oreja izquierda", en: "Left ear", ko: "왼쪽 귀", ja: "左耳" },
    icon: "👂",
    cells: { x: 6, y: 8 },
    silhouettePath: "M0 7V4H1V2H2V1H3V0H4V2H5V3H6V7H5V8H1V7H0Z",
    silhouetteTransform: "translate(0 0)",
  },
  earR: {
    labels: { es: "Oreja derecha", en: "Right ear", ko: "오른쪽 귀", ja: "右耳" },
    icon: "👂",
    cells: { x: 5, y: 8 },
    silhouettePath: "M1 3H0V7H1V8H4V7H5V2H4V1H3V0H2V1H1V3Z",
    silhouetteTransform: "translate(0 0)",
  },
};

const SWATCH_COLORS = [
  "#FFFFFF", "#CFCFCF", "#8F8F8F", "#4A4A4A", "#000000",
  "#FFF0CF", "#FFD28A", "#E8953D", "#B85F1F", "#6F3513",
  "#E7D0A8", "#B9925B", "#886943", "#5B3E25", "#2B1A0F",
  "#FFE6EF", "#FFB8CF", "#F06C99", "#C93668", "#7A1638",
];

const I18N = {
  en: {
    title: "Catjang Pattern Editor",
    help: "Help",
    hint: "Paint every part from one workspace. Changes apply to the pet immediately.",
    caveat: "Brush size paints a square area. Some markings appear only in certain poses.",
    baseColor: "Base body color",
    reset: "Reset",
    eyeColor: "Eye color",
    eyeBgColor: "Eye background",
    oddEye: "Odd eyes",
    bodyColor: "Body color",
    left: "Left",
    right: "Right",
    spotColor: "Spot color",
    custom: "Custom",
    brush: "Brush",
    tools: "Tools",
    presets: "Presets",
    currentPreset: "Selected preset",
    changePreset: "Change",
    backToEdit: "Back",
    builtinPresets: "Default presets",
    customPresets: "My presets",
    customPresetEmpty: "No custom presets yet.",
    exportCustomPresets: "Export",
    importCustomPresets: "Import",
    renameCustomPreset: "Rename",
    renameCustomPresetPrompt: "Preset name",
    morePresetActions: "More",
    customPresetsExported: (count) => `Exported ${count} custom preset${count === 1 ? "" : "s"}.`,
    customPresetsImported: (count) => `Imported ${count} custom preset${count === 1 ? "" : "s"}.`,
    customPresetsImportFailed: "Could not import custom presets.",
    saveCustomPreset: "New Preset",
    updateCustomPreset: "Save Changes",
    discardChanges: "Discard",
    deleteCustomPreset: "Delete preset",
    customPresetNamePrompt: "Preset name",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    deleteCustomPresetConfirm: "Delete this preset?",
    discardChangesConfirm: "Discard unsaved changes?",
    totalSpots: "Total spots",
    paint: "Paint",
    erase: "Eraser",
    spots: "spots",
  },
  es: {
    title: "Editor de patrones de Catjang",
    help: "Ayuda",
    hint: "Pinta todas las partes desde un solo espacio. Los cambios se aplican inmediatamente al gato.",
    caveat: "El pincel pinta un área cuadrada. Algunas manchas solo aparecen en determinadas poses.",
    baseColor: "Color base del cuerpo",
    reset: "Restablecer",
    eyeColor: "Color de ojos",
    eyeBgColor: "Fondo de los ojos",
    oddEye: "Heterocromía",
    bodyColor: "Color del cuerpo",
    left: "Izquierdo",
    right: "Derecho",
    spotColor: "Color de la mancha",
    custom: "Personalizado",
    brush: "Pincel",
    tools: "Herramientas",
    presets: "Preajustes",
    currentPreset: "Preajuste seleccionado",
    changePreset: "Cambiar",
    backToEdit: "Volver",
    builtinPresets: "Preajustes incluidos",
    customPresets: "Mis preajustes",
    customPresetEmpty: "Todavía no hay preajustes personalizados.",
    exportCustomPresets: "Exportar",
    importCustomPresets: "Importar",
    renameCustomPreset: "Cambiar nombre",
    renameCustomPresetPrompt: "Nombre del preajuste",
    morePresetActions: "Más",
    customPresetsExported: (count) => `Se exportaron ${count} preajuste${count === 1 ? "" : "s"}.`,
    customPresetsImported: (count) => `Se importaron ${count} preajuste${count === 1 ? "" : "s"}.`,
    customPresetsImportFailed: "No se pudieron importar los preajustes.",
    saveCustomPreset: "Nuevo preajuste",
    updateCustomPreset: "Guardar cambios",
    discardChanges: "Descartar",
    deleteCustomPreset: "Eliminar preajuste",
    customPresetNamePrompt: "Nombre del preajuste",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    deleteCustomPresetConfirm: "¿Eliminar este preajuste?",
    discardChangesConfirm: "¿Descartar los cambios no guardados?",
    totalSpots: "Manchas totales",
    paint: "Pintar",
    erase: "Borrador",
    spots: "manchas",
  },
  ko: {
    title: "캣짱 패턴 편집기",
    help: "도움말",
    hint: "모든 부위를 한 화면에서 칠합니다. 변경 사항은 펫에 즉시 반영됩니다.",
    caveat: "브러시 크기는 정사각형 영역으로 칠합니다. 일부 무늬는 특정 포즈에서만 보입니다.",
    baseColor: "기본 몸통 색",
    reset: "초기화",
    eyeColor: "눈동자 색",
    eyeBgColor: "눈 배경색",
    oddEye: "오드아이",
    bodyColor: "몸통색",
    left: "왼쪽",
    right: "오른쪽",
    spotColor: "점 색상",
    custom: "커스텀",
    brush: "브러시",
    tools: "도구",
    presets: "프리셋",
    currentPreset: "선택된 프리셋",
    changePreset: "변경",
    backToEdit: "돌아가기",
    builtinPresets: "기본 프리셋",
    customPresets: "커스텀 프리셋",
    customPresetEmpty: "아직 저장된 커스텀 프리셋이 없어요.",
    exportCustomPresets: "내보내기",
    importCustomPresets: "가져오기",
    renameCustomPreset: "이름 변경",
    renameCustomPresetPrompt: "프리셋 이름",
    morePresetActions: "더보기",
    customPresetsExported: (count) => `커스텀 프리셋 ${count}개를 내보냈어요.`,
    customPresetsImported: (count) => `커스텀 프리셋 ${count}개를 가져왔어요.`,
    customPresetsImportFailed: "커스텀 프리셋을 가져오지 못했어요.",
    saveCustomPreset: "새 프리셋 저장",
    updateCustomPreset: "변경 저장",
    discardChanges: "변경 폐기",
    deleteCustomPreset: "프리셋 삭제",
    customPresetNamePrompt: "프리셋 이름",
    save: "저장",
    cancel: "취소",
    delete: "삭제",
    deleteCustomPresetConfirm: "이 프리셋을 삭제할까요?",
    discardChangesConfirm: "저장하지 않은 변경사항을 폐기할까요?",
    totalSpots: "전체 spot",
    paint: "칠하기",
    erase: "지우개",
    spots: "spot",
  },
  ja: {
    title: "Catjang パターンエディター",
    help: "ヘルプ",
    hint: "すべての部位をひとつの画面で塗れます。変更はペットにすぐ反映されます。",
    caveat: "ブラシサイズは正方形の範囲を塗ります。一部の模様は特定のポーズでのみ表示されます。",
    baseColor: "基本の体色",
    reset: "リセット",
    eyeColor: "瞳の色",
    eyeBgColor: "目の背景色",
    oddEye: "オッドアイ",
    bodyColor: "体色",
    left: "左",
    right: "右",
    spotColor: "模様の色",
    custom: "カスタム",
    brush: "ブラシ",
    tools: "ツール",
    presets: "プリセット",
    currentPreset: "選択中のプリセット",
    changePreset: "変更",
    backToEdit: "戻る",
    builtinPresets: "標準プリセット",
    customPresets: "マイプリセット",
    customPresetEmpty: "保存済みのカスタムプリセットはまだありません。",
    exportCustomPresets: "書き出し",
    importCustomPresets: "読み込み",
    renameCustomPreset: "名前を変更",
    renameCustomPresetPrompt: "プリセット名",
    morePresetActions: "その他",
    customPresetsExported: (count) => `${count}件のカスタムプリセットを書き出しました。`,
    customPresetsImported: (count) => `${count}件のカスタムプリセットを読み込みました。`,
    customPresetsImportFailed: "カスタムプリセットを読み込めませんでした。",
    saveCustomPreset: "新規プリセット",
    updateCustomPreset: "変更を保存",
    discardChanges: "破棄",
    deleteCustomPreset: "プリセットを削除",
    customPresetNamePrompt: "プリセット名",
    save: "保存",
    cancel: "キャンセル",
    delete: "削除",
    deleteCustomPresetConfirm: "このプリセットを削除しますか？",
    discardChangesConfirm: "保存していない変更を破棄しますか？",
    totalSpots: "模様の合計",
    paint: "塗る",
    erase: "消しゴム",
    spots: "模様",
  },
};

const partsGrid = document.getElementById("parts-grid");
const spotColorSection = document.getElementById("spot-color-section");
const palette = document.getElementById("palette");
const customColorInput = document.getElementById("custom-color");
const patternEditPanel = document.getElementById("pattern-edit-panel");
const presetSelectPanel = document.getElementById("preset-select-panel");
const currentPresetCard = document.getElementById("current-preset-card");
const changePresetBtn = document.getElementById("change-preset");
const backToEditBtn = document.getElementById("back-to-edit");
const presetList = document.getElementById("pattern-preset-list");
const presetFileStatus = document.getElementById("preset-file-status");
const presetActions = document.querySelector(".preset-actions");
const saveCustomPresetBtn = document.getElementById("save-custom-preset");
const updateCustomPresetBtn = document.getElementById("update-custom-preset");
const discardPatternChangesBtn = document.getElementById("discard-pattern-changes");
const presetChangeActions = document.getElementById("preset-change-actions");
const customPresetNameForm = document.getElementById("custom-preset-name-form");
const customPresetNameInput = document.getElementById("custom-preset-name");
const confirmCustomPresetBtn = document.getElementById("confirm-custom-preset");
const cancelCustomPresetBtn = document.getElementById("cancel-custom-preset");
const modeBtns = document.querySelectorAll("button.mode");
const brushBtns = document.querySelectorAll("button.brush");
const baseColorInput = document.getElementById("base-color");
const baseColorHex = document.getElementById("base-color-hex");
const eyeColorInput = document.getElementById("eye-color");
const eyeColorHex = document.getElementById("eye-color-hex");
const eyeColorRow = document.getElementById("eye-color-row");
const eyeBgColorInput = document.getElementById("eye-bg-color");
const eyeBgColorHex = document.getElementById("eye-bg-color-hex");
const oddEyeCheckbox = document.getElementById("odd-eye");
const eyeColorLeftInput = document.getElementById("eye-color-left");
const eyeColorLeftHex = document.getElementById("eye-color-left-hex");
const eyeColorLeftRow = document.getElementById("eye-color-left-row");
const eyeColorRightInput = document.getElementById("eye-color-right");
const eyeColorRightHex = document.getElementById("eye-color-right-hex");
const eyeColorRightRow = document.getElementById("eye-color-right-row");

const partSpots = {};
const partViews = {};
for (const partName of Object.keys(PARTS)) partSpots[partName] = new Map();

let currentLanguage = "es";
let activeColor = SWATCH_COLORS[0];
let mode = "paint";
let brushSize = 1;
let baseColor = DEFAULT_BASE_COLOR;
let eyeColor = DEFAULT_BASE_COLOR;
let eyeBgColor = "#FFFFFF";
let oddEye = false;
let eyeColorLeft = DEFAULT_BASE_COLOR;
let eyeColorRight = DEFAULT_BASE_COLOR;
let isPainting = false;
let lastPaintKey = null;
let sendTimer = null;
let patternPresets = [];
let selectedPresetId = null;
let panelMode = "edit";
let customPresetSaveInFlight = false;
let renamingPresetId = null;

function t(key, ...args) {
  const table = I18N[currentLanguage] || I18N.en;
  const value = table[key] || I18N.en[key] || key;
  return typeof value === "function" ? value(...args) : value;
}

function partLabel(partName) {
  const part = PARTS[partName];
  return (part.labels && (part.labels[currentLanguage] || part.labels.en)) || partName;
}

function applyLanguage(language) {
  currentLanguage = I18N[language] ? language : "es";
  document.documentElement.lang = currentLanguage;
  document.title = t("title");
  for (const el of document.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll("[data-i18n-placeholder]")) el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder));
  for (const b of modeBtns) b.textContent = t(b.dataset.mode);
  updatePartLabels();
  if (patternPresets.length > 0) {
    renderPresetOptions();
    renderCurrentPreset();
  }
}

function createSvgEl(tagName) {
  return document.createElementNS(SVG_NS, tagName);
}

function buildPartCards() {
  partsGrid.textContent = "";
  for (const [partName, part] of Object.entries(PARTS)) {
    const card = document.createElement("section");
    card.className = "part-card";
    card.dataset.part = partName;

    const header = document.createElement("div");
    header.className = "part-header";
    const title = document.createElement("span");
    title.className = "part-title";
    header.append(title);

    const wrap = document.createElement("div");
    wrap.className = "part-canvas-wrap";
    const svg = createSvgEl("svg");
    svg.classList.add("part-canvas");
    svg.dataset.part = partName;
    svg.setAttribute("viewBox", `0 0 ${part.cells.x} ${part.cells.y}`);
    svg.setAttribute("width", part.cells.x * CELL_PX);
    svg.setAttribute("height", part.cells.y * CELL_PX);

    const grid = createSvgEl("g");
    grid.classList.add("grid-lines");
    grid.setAttribute("stroke-width", "0.05");
    const spots = createSvgEl("g");
    const hover = createSvgEl("rect");
    hover.setAttribute("fill", "none");
    hover.setAttribute("stroke", "#fff");
    hover.setAttribute("stroke-width", "0.1");
    hover.setAttribute("pointer-events", "none");
    hover.setAttribute("visibility", "hidden");

    renderSilhouette(svg, part);
    renderGrid(grid, part.cells.x, part.cells.y);
    svg.append(grid, spots, hover);
    wrap.appendChild(svg);
    card.append(header, wrap);
    partsGrid.appendChild(card);

    partViews[partName] = { card, title, svg, grid, spots, hover };
    attachPaintEvents(svg, partName);
  }
  updatePartLabels();
  updateCanvasTheme();
}

function renderSilhouette(svg, part) {
  if (part.silhouettePath) {
    const path = createSvgEl("path");
    path.classList.add("silhouette");
    path.setAttribute("d", part.silhouettePath);
    path.setAttribute("transform", part.silhouetteTransform);
    path.setAttribute("fill", baseColor);
    svg.appendChild(path);
    return;
  }
  if (!part.silhouetteRects) return;
  for (const rd of part.silhouetteRects) {
    const rect = createSvgEl("rect");
    rect.classList.add("silhouette");
    rect.setAttribute("x", rd.x - part.silhouetteOrigin.x);
    rect.setAttribute("y", rd.y - part.silhouetteOrigin.y);
    rect.setAttribute("width", rd.w);
    rect.setAttribute("height", rd.h);
    rect.setAttribute("fill", baseColor);
    svg.appendChild(rect);
  }
}

function renderGrid(grid, cellsX, cellsY) {
  grid.textContent = "";
  for (let x = 0; x <= cellsX; x++) {
    const line = createSvgEl("line");
    line.setAttribute("x1", x);
    line.setAttribute("y1", 0);
    line.setAttribute("x2", x);
    line.setAttribute("y2", cellsY);
    grid.appendChild(line);
  }
  for (let y = 0; y <= cellsY; y++) {
    const line = createSvgEl("line");
    line.setAttribute("x1", 0);
    line.setAttribute("y1", y);
    line.setAttribute("x2", cellsX);
    line.setAttribute("y2", y);
    grid.appendChild(line);
  }
}

function updatePartLabels() {
  for (const [partName, view] of Object.entries(partViews)) {
    const part = PARTS[partName];
    view.title.textContent = `${part.icon} ${partLabel(partName)}`;
  }
}

function brightness(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return 0.1;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function updateCanvasTheme() {
  const isDark = brightness(baseColor) < 0.5;
  document.documentElement.style.setProperty("--canvas-bg", isDark ? "#f0f0f0" : "#1a1a1a");
  document.documentElement.style.setProperty("--grid-line-color", isDark ? "#bbb" : "#444");
}

function applyBaseColor(hex) {
  baseColor = hex;
  baseColorInput.value = hex;
  baseColorHex.textContent = hex.toUpperCase();
  for (const el of document.querySelectorAll(".silhouette")) el.setAttribute("fill", hex);
  updateCanvasTheme();
}

baseColorInput.addEventListener("input", (e) => {
  applyBaseColor(e.target.value);
  broadcastChange();
});
function applyEyeColor(hex) {
  eyeColor = hex;
  eyeColorInput.value = hex;
  eyeColorHex.textContent = hex.toUpperCase();
}
function applyEyeBgColor(hex) {
  eyeBgColor = hex;
  eyeBgColorInput.value = hex;
  eyeBgColorHex.textContent = hex.toUpperCase();
}
function applyEyeColorLeft(hex) {
  eyeColorLeft = hex;
  eyeColorLeftInput.value = hex;
  eyeColorLeftHex.textContent = hex.toUpperCase();
}
function applyEyeColorRight(hex) {
  eyeColorRight = hex;
  eyeColorRightInput.value = hex;
  eyeColorRightHex.textContent = hex.toUpperCase();
}
function setOddEyeMode(enabled) {
  oddEye = enabled;
  oddEyeCheckbox.checked = enabled;
  eyeColorRow.style.display = enabled ? "none" : "";
  eyeColorLeftRow.style.display = enabled ? "" : "none";
  eyeColorRightRow.style.display = enabled ? "" : "none";
  if (enabled) {
    if (eyeColorLeft === DEFAULT_BASE_COLOR && eyeColor) applyEyeColorLeft(eyeColor);
    if (eyeColorRight === DEFAULT_BASE_COLOR && eyeColor) applyEyeColorRight(eyeColor);
  }
}

eyeColorInput.addEventListener("input", (e) => {
  applyEyeColor(e.target.value);
  broadcastChange();
});
eyeBgColorInput.addEventListener("input", (e) => {
  applyEyeBgColor(e.target.value);
  broadcastChange();
});
oddEyeCheckbox.addEventListener("change", (e) => {
  setOddEyeMode(e.target.checked);
  broadcastChange();
});
eyeColorLeftInput.addEventListener("input", (e) => {
  applyEyeColorLeft(e.target.value);
  broadcastChange();
});
eyeColorRightInput.addEventListener("input", (e) => {
  applyEyeColorRight(e.target.value);
  broadcastChange();
});

function buildPalette() {
  palette.textContent = "";
  for (const color of SWATCH_COLORS) {
    const btn = document.createElement("button");
    btn.className = "swatch";
    btn.style.background = color;
    btn.dataset.color = color;
    if (color === activeColor) btn.classList.add("active");
    btn.addEventListener("click", () => selectColor(color));
    palette.appendChild(btn);
  }
}

function selectColor(color) {
  activeColor = color;
  for (const sw of palette.querySelectorAll(".swatch")) {
    sw.classList.toggle("active", sw.dataset.color === color);
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) customColorInput.value = color;
  setMode("paint");
}

customColorInput.addEventListener("input", (e) => {
  for (const sw of palette.querySelectorAll(".swatch")) sw.classList.remove("active");
  activeColor = e.target.value;
  setMode("paint");
});

function setMode(nextMode) {
  mode = nextMode;
  for (const b of modeBtns) b.classList.toggle("active", b.dataset.mode === nextMode);
  if (spotColorSection) spotColorSection.style.display = nextMode === "erase" ? "none" : "";
}
for (const b of modeBtns) b.addEventListener("click", () => setMode(b.dataset.mode));

function setBrushSize(size) {
  brushSize = Math.max(1, Math.min(5, Number(size) || 1));
  for (const b of brushBtns) b.classList.toggle("active", Number(b.dataset.size) === brushSize);
}
for (const b of brushBtns) b.addEventListener("click", () => setBrushSize(b.dataset.size));

function cellFromEvent(evt, partName) {
  const part = PARTS[partName];
  const rect = partViews[partName].svg.getBoundingClientRect();
  const x = Math.floor((evt.clientX - rect.left) / rect.width * part.cells.x);
  const y = Math.floor((evt.clientY - rect.top) / rect.height * part.cells.y);
  if (x < 0 || y < 0 || x >= part.cells.x || y >= part.cells.y) return null;
  return { x, y };
}

function cellIsInSilhouette(partName, x, y) {
  const view = partViews[partName];
  const shape = view && view.svg && view.svg.querySelector(".silhouette");
  if (!shape || typeof shape.isPointInFill !== "function") return true;
  const svg = shape.ownerSVGElement;
  if (!svg || typeof svg.createSVGPoint !== "function") return true;
  try {
    const transform = shape.getAttribute("transform") || "";
    const translateMatch = transform.match(/translate\(\s*([-\d.]+)(?:[\s,]+([-\d.]+))?\s*\)/);
    const tx = translateMatch ? Number(translateMatch[1] || 0) : 0;
    const ty = translateMatch ? Number(translateMatch[2] || 0) : 0;
    const samples = [
      [0.5, 0.5],
      [0.12, 0.12],
      [0.88, 0.12],
      [0.12, 0.88],
      [0.88, 0.88],
      [0.5, 0.12],
      [0.88, 0.5],
      [0.5, 0.88],
      [0.12, 0.5],
    ];
    for (const [ox, oy] of samples) {
      const svgPoint = svg.createSVGPoint();
      svgPoint.x = x + ox;
      svgPoint.y = y + oy;
      if (shape.isPointInFill(svgPoint)) return true;

      const localPoint = svg.createSVGPoint();
      localPoint.x = svgPoint.x - tx;
      localPoint.y = svgPoint.y - ty;
      if (shape.isPointInFill(localPoint)) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function cellsForBrush(partName, x, y) {
  const part = PARTS[partName];
  const radiusBefore = Math.floor((brushSize - 1) / 2);
  const cells = [];
  for (let yy = y - radiusBefore; yy < y - radiusBefore + brushSize; yy++) {
    for (let xx = x - radiusBefore; xx < x - radiusBefore + brushSize; xx++) {
      if (xx < 0 || yy < 0 || xx >= part.cells.x || yy >= part.cells.y) continue;
      if (!cellIsInSilhouette(partName, xx, yy)) continue;
      cells.push([xx, yy]);
    }
  }
  return cells;
}

function applyBrush(partName, x, y) {
  const spots = partSpots[partName];
  let changed = false;
  for (const [xx, yy] of cellsForBrush(partName, x, y)) {
    const key = `${xx},${yy}`;
    if (mode === "erase") {
      if (!spots.has(key)) continue;
      spots.delete(key);
      changed = true;
    } else if (spots.get(key) !== activeColor) {
      spots.set(key, activeColor);
      changed = true;
    }
  }
  if (!changed) return;
  renderSpots(partName);
  broadcastChange();
}

function renderSpots(partName) {
  const view = partViews[partName];
  view.spots.textContent = "";
  for (const [key, color] of partSpots[partName]) {
    const [x, y] = key.split(",").map(Number);
    if (!cellIsInSilhouette(partName, x, y)) continue;
    const rect = createSvgEl("rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", 1);
    rect.setAttribute("height", 1);
    rect.setAttribute("fill", color);
    view.spots.appendChild(rect);
  }
  updatePartLabels();
}

function renderAllSpots() {
  for (const partName of Object.keys(PARTS)) renderSpots(partName);
}

function setHover(partName, cell) {
  const view = partViews[partName];
  if (!cell || !cellIsInSilhouette(partName, cell.x, cell.y)) {
    view.hover.setAttribute("visibility", "hidden");
    return;
  }
  const part = PARTS[partName];
  const radiusBefore = Math.floor((brushSize - 1) / 2);
  const x = Math.max(0, cell.x - radiusBefore);
  const y = Math.max(0, cell.y - radiusBefore);
  const w = Math.min(brushSize, part.cells.x - x);
  const h = Math.min(brushSize, part.cells.y - y);
  view.hover.setAttribute("visibility", "visible");
  view.hover.setAttribute("x", x);
  view.hover.setAttribute("y", y);
  view.hover.setAttribute("width", w);
  view.hover.setAttribute("height", h);
}

function attachPaintEvents(svg, partName) {
  svg.addEventListener("mousedown", (event) => {
    const cell = cellFromEvent(event, partName);
    if (!cell || !cellIsInSilhouette(partName, cell.x, cell.y)) return;
    isPainting = true;
    lastPaintKey = `${partName}:${cell.x},${cell.y}:${brushSize}:${mode}:${activeColor}`;
    applyBrush(partName, cell.x, cell.y);
  });

  svg.addEventListener("mousemove", (event) => {
    const cell = cellFromEvent(event, partName);
    setHover(partName, cell);
    if (!isPainting || !cell || !cellIsInSilhouette(partName, cell.x, cell.y)) return;
    const key = `${partName}:${cell.x},${cell.y}:${brushSize}:${mode}:${activeColor}`;
    if (key === lastPaintKey) return;
    lastPaintKey = key;
    applyBrush(partName, cell.x, cell.y);
  });

  svg.addEventListener("mouseleave", () => setHover(partName, null));
}

window.addEventListener("mouseup", () => {
  isPainting = false;
  lastPaintKey = null;
});

function spotsToPattern() {
  const result = { baseColor, eyeColor, eyeBgColor, oddEye, eyeColorLeft, eyeColorRight };
  for (const [partName, spots] of Object.entries(partSpots)) {
    const arr = [];
    for (const [key, color] of spots) {
      const [x, y] = key.split(",").map(Number);
      arr.push({ x, y, color });
    }
    result[partName] = arr;
  }
  return result;
}

function normalizedPattern(pattern) {
  const source = pattern && typeof pattern === "object" ? pattern : {};
  const result = {
    baseColor: typeof source.baseColor === "string" ? source.baseColor : DEFAULT_BASE_COLOR,
    eyeColor: typeof source.eyeColor === "string" ? source.eyeColor : DEFAULT_BASE_COLOR,
    eyeBgColor: typeof source.eyeBgColor === "string" ? source.eyeBgColor : "#FFFFFF",
    oddEye: !!source.oddEye,
    eyeColorLeft: typeof source.eyeColorLeft === "string" ? source.eyeColorLeft : DEFAULT_BASE_COLOR,
    eyeColorRight: typeof source.eyeColorRight === "string" ? source.eyeColorRight : DEFAULT_BASE_COLOR,
  };
  for (const partName of Object.keys(PARTS)) {
    const arr = Array.isArray(source[partName]) ? source[partName] : [];
    result[partName] = arr
      .map((spot) => ({
        x: Number(spot && spot.x),
        y: Number(spot && spot.y),
        color: spot && typeof spot.color === "string" ? spot.color : "",
      }))
      .filter((spot) => Number.isInteger(spot.x) && Number.isInteger(spot.y) && spot.color && cellIsInSilhouette(partName, spot.x, spot.y))
      .sort((a, b) => a.y - b.y || a.x - b.x || a.color.localeCompare(b.color));
  }
  return result;
}

function patternSignature(pattern) {
  return JSON.stringify(normalizedPattern(pattern));
}

function matchingPresetIdForPattern(pattern) {
  const signature = patternSignature(pattern);
  const match = patternPresets.find((preset) => patternSignature(preset.pattern) === signature);
  return match ? match.id : null;
}

function selectedPresetHasChanges() {
  const preset = selectedPreset();
  if (!preset) return false;
  return patternSignature(spotsToPattern()) !== patternSignature(preset.pattern);
}

function applyPatternData(pattern) {
  if (!pattern || typeof pattern !== "object") return;
  applyBaseColor(typeof pattern.baseColor === "string" ? pattern.baseColor : DEFAULT_BASE_COLOR);
  applyEyeColor(typeof pattern.eyeColor === "string" ? pattern.eyeColor : DEFAULT_BASE_COLOR);
  applyEyeBgColor(typeof pattern.eyeBgColor === "string" ? pattern.eyeBgColor : "#FFFFFF");
  applyEyeColorLeft(typeof pattern.eyeColorLeft === "string" ? pattern.eyeColorLeft : eyeColor);
  applyEyeColorRight(typeof pattern.eyeColorRight === "string" ? pattern.eyeColorRight : eyeColor);
  setOddEyeMode(!!pattern.oddEye);

  for (const partName of Object.keys(partSpots)) {
    partSpots[partName].clear();
    const arr = pattern[partName];
    if (!Array.isArray(arr)) continue;
    for (const spot of arr) {
      if (!spot || typeof spot.color !== "string") continue;
      const x = Number(spot.x);
      const y = Number(spot.y);
      if (!Number.isInteger(x) || !Number.isInteger(y)) continue;
      if (!cellIsInSilhouette(partName, x, y)) continue;
      partSpots[partName].set(`${x},${y}`, spot.color);
    }
  }
  renderAllSpots();
  updatePresetActionButtons();
}

function broadcastChange() {
  updatePresetActionButtons();
  if (sendTimer) return;
  sendTimer = setTimeout(() => {
    sendTimer = null;
    window.electronAPI.patternSet({ ...spotsToPattern(), selectedPresetId });
  }, 16);
}

function setPanelMode(nextMode) {
  panelMode = nextMode === "presets" ? "presets" : "edit";
  if (patternEditPanel) patternEditPanel.classList.toggle("active", panelMode === "edit");
  if (presetSelectPanel) presetSelectPanel.classList.toggle("active", panelMode === "presets");
  closeCustomPresetNameForm();
}

function createPresetCard(preset, { compact = false, active = true, onSelect } = {}) {
  const button = document.createElement("button");
  const label = (preset.label && (preset.label[currentLanguage] || preset.label.en)) || preset.id;
  button.type = "button";
  button.className = "preset-card";
  button.classList.toggle("custom-preset", preset.source === "custom");
  button.classList.toggle("active", active && preset.id === selectedPresetId);
  button.classList.toggle("compact", compact);
  button.dataset.presetId = preset.id;
  button.setAttribute("aria-label", label);

  if (preset.image) {
    const image = document.createElement("img");
    image.src = preset.image;
    image.alt = "";
    image.loading = "lazy";
    button.appendChild(image);
  } else {
    button.appendChild(createPresetPreview(preset.pattern));
  }
  const text = document.createElement("span");
  text.textContent = label;
  button.appendChild(text);
  if (onSelect) button.addEventListener("click", () => onSelect(preset));
  return button;
}

function renderCurrentPreset() {
  if (!currentPresetCard) return;
  currentPresetCard.textContent = "";
  const preset = selectedPreset();
  if (!preset) return;
  currentPresetCard.appendChild(createPresetCard(preset, {
    compact: true,
    active: false,
  }));
}

function renderPresetOptions() {
  if (!presetList) return;
  if (!selectedPresetId && patternPresets.length > 0) selectedPresetId = patternPresets[0].id;
  presetList.textContent = "";

  const renderSection = (sectionKey, presets) => {
    const section = document.createElement("section");
    section.className = "preset-section";
    const header = document.createElement("div");
    header.className = "preset-section-header";
    const title = document.createElement("h3");
    title.textContent = t(sectionKey);
    header.appendChild(title);
    if (sectionKey === "customPresets") {
      const importButton = document.createElement("button");
      importButton.type = "button";
      importButton.className = "preset-section-import";
      importButton.textContent = t("importCustomPresets");
      importButton.addEventListener("click", () => importCustomPresets().catch(console.error));
      header.appendChild(importButton);
    }
    section.appendChild(header);
    const list = document.createElement("div");
    list.className = "preset-section-list";
    section.appendChild(list);
    presetList.appendChild(section);

    if (presets.length === 0 && sectionKey === "customPresets") {
      const empty = document.createElement("div");
      empty.className = "preset-empty";
      empty.textContent = t("customPresetEmpty");
      list.appendChild(empty);
      return;
    }

    for (const preset of presets) {
      const row = document.createElement("div");
      row.className = "preset-list-row";
      row.classList.toggle("has-delete", preset.source === "custom");
      const button = createPresetCard(preset, {
        onSelect: () => {
          selectedPresetId = preset.id;
          applyPatternData(preset.pattern);
          renderPresetOptions();
          renderCurrentPreset();
          broadcastChange();
        },
      });
      row.appendChild(button);
      if (preset.source === "custom") {
        const menuWrap = document.createElement("div");
        menuWrap.className = "preset-row-menu-wrap";
        const moreButton = document.createElement("button");
        moreButton.type = "button";
        moreButton.className = "preset-row-more";
        moreButton.setAttribute("aria-label", t("morePresetActions"));
        moreButton.textContent = "...";
        const menu = document.createElement("div");
        menu.className = "preset-row-menu";
        const renameButton = document.createElement("button");
        renameButton.type = "button";
        renameButton.textContent = t("renameCustomPreset");
        renameButton.addEventListener("click", (event) => {
          event.stopPropagation();
          menuWrap.classList.remove("is-open");
          renameCustomPresetById(preset.id).catch(console.error);
        });
        const exportButton = document.createElement("button");
        exportButton.type = "button";
        exportButton.textContent = t("exportCustomPresets");
        exportButton.addEventListener("click", (event) => {
          event.stopPropagation();
          menuWrap.classList.remove("is-open");
          exportCustomPresets(preset.id).catch(console.error);
        });
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "danger";
        deleteButton.textContent = t("delete");
        deleteButton.addEventListener("click", (event) => {
          event.stopPropagation();
          menuWrap.classList.remove("is-open");
          deleteCustomPresetById(preset.id).catch(console.error);
        });
        menu.appendChild(renameButton);
        menu.appendChild(exportButton);
        menu.appendChild(deleteButton);
        moreButton.addEventListener("click", (event) => {
          event.stopPropagation();
          document.querySelectorAll(".preset-row-menu-wrap.is-open").forEach((el) => {
            if (el !== menuWrap) el.classList.remove("is-open");
          });
          menuWrap.classList.toggle("is-open");
        });
        menuWrap.appendChild(moreButton);
        menuWrap.appendChild(menu);
        row.appendChild(menuWrap);
        if (renamingPresetId === preset.id) {
          const form = document.createElement("div");
          form.className = "preset-rename-form";
          const input = document.createElement("input");
          input.type = "text";
          input.maxLength = 60;
          input.value = (preset.label && (preset.label[currentLanguage] || preset.label.en)) || "";
          const cancelButton = document.createElement("button");
          cancelButton.type = "button";
          cancelButton.textContent = t("cancel");
          cancelButton.addEventListener("click", () => {
            renamingPresetId = null;
            renderPresetOptions();
          });
          const saveButton = document.createElement("button");
          saveButton.type = "button";
          saveButton.textContent = t("save");
          const submitRename = () => renameCustomPresetById(preset.id, input.value).catch(console.error);
          saveButton.addEventListener("click", submitRename);
          input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") submitRename();
            else if (event.key === "Escape") {
              renamingPresetId = null;
              renderPresetOptions();
            }
          });
          form.appendChild(input);
          form.appendChild(cancelButton);
          form.appendChild(saveButton);
          row.appendChild(form);
          requestAnimationFrame(() => input.focus());
        }
      }
      list.appendChild(row);
    }
  };

  renderSection("builtinPresets", patternPresets.filter((preset) => preset.source !== "custom"));
  renderSection("customPresets", patternPresets.filter((preset) => preset.source === "custom"));
  renderCurrentPreset();
  updatePresetActionButtons();
}

function createPresetPreview(pattern) {
  const preview = createSvgEl("svg");
  preview.classList.add("preset-preview");
  preview.setAttribute("viewBox", "0 0 44 44");
  preview.setAttribute("aria-hidden", "true");
  preview.setAttribute("focusable", "false");
  const defs = createSvgEl("defs");
  const outlineFilter = createSvgEl("filter");
  const outlineFilterId = `preset-outline-${Math.random().toString(36).slice(2)}`;
  outlineFilter.setAttribute("id", outlineFilterId);
  outlineFilter.setAttribute("x", "-20%");
  outlineFilter.setAttribute("y", "-20%");
  outlineFilter.setAttribute("width", "140%");
  outlineFilter.setAttribute("height", "140%");
  const dilate = createSvgEl("feMorphology");
  dilate.setAttribute("in", "SourceAlpha");
  dilate.setAttribute("operator", "dilate");
  dilate.setAttribute("radius", "0.8");
  dilate.setAttribute("result", "expanded");
  const flood = createSvgEl("feFlood");
  flood.setAttribute("flood-color", "#000");
  flood.setAttribute("result", "outlineColor");
  const composite = createSvgEl("feComposite");
  composite.setAttribute("in", "outlineColor");
  composite.setAttribute("in2", "expanded");
  composite.setAttribute("operator", "in");
  outlineFilter.append(dilate, flood, composite);
  defs.appendChild(outlineFilter);
  preview.appendChild(defs);
  const placements = {
    earL: { x: 14, y: 5, scale: 0.68 },
    earR: { x: 25, y: 5, scale: 0.68 },
    tail: { x: 31, y: 25, scale: 0.8 },
    legRl: { x: 16, y: 32, scale: 0.65 },
    legRr: { x: 24, y: 32, scale: 0.65 },
    body: { x: 11, y: 21, scale: 1 },
    legFl: { x: 16, y: 27, scale: 0.72 },
    legFr: { x: 24, y: 27, scale: 0.72 },
    head: { x: 11, y: 7, scale: 1 },
  };
  const partNames = ["earL", "earR", "tail", "legRl", "legRr", "body", "legFl", "legFr", "head"];
  const outlineGroup = createSvgEl("g");
  outlineGroup.setAttribute("filter", `url(#${outlineFilterId})`);
  for (const partName of partNames) {
    const part = PARTS[partName];
    const placement = placements[partName];
    if (!part || !placement) continue;
    const group = createSvgEl("g");
    group.setAttribute("transform", `translate(${placement.x} ${placement.y}) scale(${placement.scale})`);
    const shape = createSvgEl("path");
    shape.setAttribute("d", part.silhouettePath);
    shape.setAttribute("transform", part.silhouetteTransform);
    shape.setAttribute("fill", "#000");
    group.appendChild(shape);
    outlineGroup.appendChild(group);
  }
  preview.appendChild(outlineGroup);

  for (const partName of partNames) {
    const part = PARTS[partName];
    const placement = placements[partName];
    if (!part || !placement) continue;
    const group = createSvgEl("g");
    group.setAttribute("transform", `translate(${placement.x} ${placement.y}) scale(${placement.scale})`);
    const base = createSvgEl("path");
    base.setAttribute("d", part.silhouettePath);
    base.setAttribute("transform", part.silhouetteTransform);
    base.setAttribute("fill", typeof pattern?.baseColor === "string" ? pattern.baseColor : DEFAULT_BASE_COLOR);
    group.appendChild(base);
    const spots = Array.isArray(pattern?.[partName]) ? pattern[partName] : [];
    for (const spot of spots) {
      const x = Number(spot && spot.x);
      const y = Number(spot && spot.y);
      if (!Number.isInteger(x) || !Number.isInteger(y) || typeof spot.color !== "string") continue;
      if (!cellIsInSilhouette(partName, x, y)) continue;
      const rect = createSvgEl("rect");
      rect.setAttribute("x", x);
      rect.setAttribute("y", y);
      rect.setAttribute("width", 1);
      rect.setAttribute("height", 1);
      rect.setAttribute("fill", spot.color);
      group.appendChild(rect);
    }
    preview.appendChild(group);
  }
  const eyeBgColor = typeof pattern?.eyeBgColor === "string" ? pattern.eyeBgColor : "#FFFFFF";
  const eyeColor = typeof pattern?.eyeColor === "string" ? pattern.eyeColor : DEFAULT_BASE_COLOR;
  const eyeColorLeft = pattern?.oddEye && typeof pattern.eyeColorLeft === "string" ? pattern.eyeColorLeft : eyeColor;
  const eyeColorRight = pattern?.oddEye && typeof pattern.eyeColorRight === "string" ? pattern.eyeColorRight : eyeColor;
  const headPlacement = placements.head;
  const eyeY = headPlacement.y + 7;
  for (const eye of [
    { x: headPlacement.x + 6, y: eyeY, color: eyeColorLeft },
    { x: headPlacement.x + 13, y: eyeY, color: eyeColorRight },
  ]) {
    const bg = createSvgEl("rect");
    bg.setAttribute("x", eye.x - 1);
    bg.setAttribute("y", eye.y - 1);
    bg.setAttribute("width", 4);
    bg.setAttribute("height", 4);
    bg.setAttribute("fill", eyeBgColor);
    preview.appendChild(bg);
    const pupil = createSvgEl("rect");
    pupil.setAttribute("x", eye.x);
    pupil.setAttribute("y", eye.y);
    pupil.setAttribute("width", 2);
    pupil.setAttribute("height", 2);
    pupil.setAttribute("fill", eye.color);
    preview.appendChild(pupil);
  }
  return preview;
}

function selectedPreset() {
  return patternPresets.find((item) => item.id === selectedPresetId) || null;
}

function updatePresetActionButtons() {
  const preset = selectedPreset();
  const isCustom = preset && preset.source === "custom";
  const hasChanges = !!preset && selectedPresetHasChanges();
  const isNameFormOpen = !!customPresetNameForm && customPresetNameForm.classList.contains("is-open");
  if (presetActions) presetActions.classList.toggle("is-visible", !!hasChanges);
  if (saveCustomPresetBtn) saveCustomPresetBtn.style.display = hasChanges && !isNameFormOpen ? "block" : "none";
  if (presetChangeActions) presetChangeActions.classList.toggle("is-visible", !!hasChanges && !isNameFormOpen);
  if (updateCustomPresetBtn) updateCustomPresetBtn.style.display = isCustom ? "block" : "none";
  if (presetChangeActions) presetChangeActions.classList.toggle("single-action", !!hasChanges && !isCustom && !isNameFormOpen);
  if (presetActions) presetActions.classList.toggle("inline-new-preset", !!hasChanges && !isCustom && !isNameFormOpen);
}

async function reloadPatternPresets(selectId = selectedPresetId) {
  try {
    patternPresets = await window.electronAPI.patternPresetsGet();
    if (!Array.isArray(patternPresets)) patternPresets = [];
  } catch {
    patternPresets = [];
  }
  selectedPresetId = patternPresets.some((preset) => preset.id === selectId) ? selectId : (patternPresets[0] && patternPresets[0].id);
  renderPresetOptions();
}

function openCustomPresetNameForm() {
  const current = selectedPreset();
  const existingName = current && current.source === "custom" ? ((current.label && (current.label[currentLanguage] || current.label.en)) || "") : "";
  if (customPresetNameInput) customPresetNameInput.value = existingName;
  if (customPresetNameForm) customPresetNameForm.classList.add("is-open");
  if (presetActions) presetActions.classList.add("name-form-open");
  updatePresetActionButtons();
  if (customPresetNameInput) customPresetNameInput.focus();
}

function closeCustomPresetNameForm() {
  if (customPresetNameForm) customPresetNameForm.classList.remove("is-open");
  if (presetActions) presetActions.classList.remove("name-form-open");
  updatePresetActionButtons();
}

async function saveCustomPresetWithName(name, { overwrite = false } = {}) {
  if (customPresetSaveInFlight) return;
  const current = selectedPreset();
  const existingName = current && current.source === "custom" ? ((current.label && (current.label[currentLanguage] || current.label.en)) || current.id) : "";
  const presetName = (overwrite ? existingName : name).trim();
  if (!presetName) {
    if (customPresetNameInput) customPresetNameInput.focus();
    return;
  }
  customPresetSaveInFlight = true;
  if (confirmCustomPresetBtn) confirmCustomPresetBtn.disabled = true;
  if (updateCustomPresetBtn) updateCustomPresetBtn.disabled = true;
  if (saveCustomPresetBtn) saveCustomPresetBtn.disabled = true;
  try {
    const saved = await window.electronAPI.patternCustomPresetSave({
      id: overwrite && current && current.source === "custom" ? current.id : null,
      name: presetName,
      pattern: spotsToPattern(),
    });
    if (!saved || !saved.id) return;
    closeCustomPresetNameForm();
    await reloadPatternPresets(saved.id);
  } finally {
    customPresetSaveInFlight = false;
    if (confirmCustomPresetBtn) confirmCustomPresetBtn.disabled = false;
    if (updateCustomPresetBtn) updateCustomPresetBtn.disabled = false;
    if (saveCustomPresetBtn) saveCustomPresetBtn.disabled = false;
  }
}

async function deleteCustomPresetById(id) {
  if (typeof id !== "string") return;
  const confirmed = await window.electronAPI.patternConfirmDeletePreset(t("deleteCustomPresetConfirm"));
  if (!confirmed) return;
  await window.electronAPI.patternCustomPresetDelete(id);
  const nextSelectedId = selectedPresetId === id ? (patternPresets.find((preset) => preset.id !== id) || {}).id : selectedPresetId;
  await reloadPatternPresets(nextSelectedId);
}

async function renameCustomPresetById(id, name = null) {
  const preset = patternPresets.find((item) => item.id === id && item.source === "custom");
  if (!preset) return;
  const currentName = (preset.label && (preset.label[currentLanguage] || preset.label.en)) || preset.id;
  if (name === null) {
    renamingPresetId = id;
    renderPresetOptions();
    return;
  }
  const nextName = name.trim();
  if (!nextName || nextName === currentName) {
    renamingPresetId = null;
    renderPresetOptions();
    return;
  }
  const result = await window.electronAPI.patternCustomPresetRename({ id, name: nextName });
  if (!result || !result.ok) return;
  renamingPresetId = null;
  await reloadPatternPresets(selectedPresetId);
}

function setPresetFileStatus(message) {
  if (!presetFileStatus) return;
  presetFileStatus.textContent = message || "";
}

async function exportCustomPresets(id = null) {
  setPresetFileStatus("");
  const result = await window.electronAPI.patternCustomPresetsExport(id);
  if (!result || !result.ok || result.canceled) return;
}

async function importCustomPresets() {
  setPresetFileStatus("");
  const result = await window.electronAPI.patternCustomPresetsImport();
  if (!result || result.canceled) return;
  if (!result.ok) {
    setPresetFileStatus(t("customPresetsImportFailed"));
    return;
  }
  await reloadPatternPresets(result.selectedId || selectedPresetId);
}

async function discardPatternChanges() {
  const preset = selectedPreset();
  if (!preset) return;
  const confirmed = await window.electronAPI.patternConfirmDiscardChanges(t("discardChangesConfirm"));
  if (!confirmed) return;
  applyPatternData(preset.pattern);
  renderCurrentPreset();
  renderPresetOptions();
  broadcastChange();
}

if (saveCustomPresetBtn) saveCustomPresetBtn.addEventListener("click", openCustomPresetNameForm);
if (changePresetBtn) changePresetBtn.addEventListener("click", () => setPanelMode("presets"));
if (backToEditBtn) backToEditBtn.addEventListener("click", () => setPanelMode("edit"));
document.addEventListener("click", () => {
  document.querySelectorAll(".preset-row-menu-wrap.is-open").forEach((el) => el.classList.remove("is-open"));
});
if (confirmCustomPresetBtn) confirmCustomPresetBtn.addEventListener("click", () => saveCustomPresetWithName(customPresetNameInput ? customPresetNameInput.value : "").catch(console.error));
if (cancelCustomPresetBtn) cancelCustomPresetBtn.addEventListener("click", closeCustomPresetNameForm);
if (customPresetNameInput) {
  customPresetNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveCustomPresetWithName(customPresetNameInput.value).catch(console.error);
    else if (event.key === "Escape") closeCustomPresetNameForm();
  });
}
if (updateCustomPresetBtn) updateCustomPresetBtn.addEventListener("click", () => saveCustomPresetWithName("", { overwrite: true }).catch(console.error));
if (discardPatternChangesBtn) discardPatternChangesBtn.addEventListener("click", () => discardPatternChanges().catch(console.error));

async function init() {
  applyLanguage(await window.electronAPI.languageGet());
  buildPartCards();
  buildPalette();
  await reloadPatternPresets();

  try {
    const saved = await window.electronAPI.patternGet();
    if (saved && typeof saved === "object") {
      applyPatternData(saved);
      if (typeof saved.selectedPresetId === "string" && patternPresets.some((preset) => preset.id === saved.selectedPresetId)) {
        selectedPresetId = saved.selectedPresetId;
      } else {
        selectedPresetId = matchingPresetIdForPattern(saved) || selectedPresetId;
      }
      renderPresetOptions();
      renderCurrentPreset();
    }
  } catch (error) {
    console.error("Failed to load pattern:", error);
  }
}

init();

window.electronAPI.onLanguageChanged((language) => {
  applyLanguage(language);
  renderPresetOptions();
});
