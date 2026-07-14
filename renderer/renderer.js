"use strict";

/**
 * Catjang 렌더러
 * - 메인 프로세스에서 받은 마우스 dx/dy를 SVG transform에 적용 (4-layer 트래킹)
 * - 좌클릭 드래그로 윈도우 이동 (IPC drag-window)
 * - 우클릭으로 컨텍스트 메뉴 (IPC show-context-menu)
 */

const TRACKING_LAYERS = {
  pupils: { ids: ["pupil-left", "pupil-right"], maxOffset: 1.6, ease: 0.42 },
  eyes:   { ids: ["eyes-js"],                    maxOffset: 0.8, ease: 0.30 },
  face:   { ids: ["face-js"],                    maxOffset: 2.2, ease: 0.20 },
  body:   { ids: ["body"],                       maxOffset: 0.7, ease: 0.09 },
};

const MAX_RAW_DIST_PX = 400;

const obj = document.getElementById("cat");
const shareNameBadge = document.getElementById("share-name-badge");
const catSpeechBubble = document.getElementById("cat-speech-bubble");
const catThinkingDots = document.getElementById("cat-thinking-dots");
const catNameEditor = document.getElementById("cat-name-editor");
const catNameInput = document.getElementById("cat-name-input");
const catNameCancel = document.getElementById("cat-name-cancel");
const userNameEditor = document.getElementById("user-name-editor");
const userNameGuide = document.getElementById("user-name-guide");
const userNameInput = document.getElementById("user-name-input");
const userNameCancel = document.getElementById("user-name-cancel");
const fixedMessageEditor = document.getElementById("fixed-message-editor");
const fixedMessageInput = document.getElementById("fixed-message-input");
const fixedMessageCancel = document.getElementById("fixed-message-cancel");
const reminderClockButton = document.getElementById("reminder-clock-button");
const reminderPanel = document.getElementById("reminder-panel");
const reminderPanelTitle = document.getElementById("reminder-panel-title");
const reminderForm = document.getElementById("reminder-form");
const reminderTimeInput = document.getElementById("reminder-time-input");
const reminderRepeatInput = document.getElementById("reminder-repeat-input");
const reminderRepeatButtons = document.getElementById("reminder-repeat-buttons");
const reminderDayPicker = document.getElementById("reminder-day-picker");
const reminderMessageInput = document.getElementById("reminder-message-input");
const reminderSaveButton = document.getElementById("reminder-save-button");
const reminderCancelButton = document.getElementById("reminder-cancel-button");
const reminderAddButton = document.getElementById("reminder-add-button");
const reminderPanelClose = document.getElementById("reminder-panel-close");
const reminderListEl = document.getElementById("reminder-list");
const pomodoroFocusEditor = document.getElementById("pomodoro-focus-editor");
const pomodoroFocusInput = document.getElementById("pomodoro-focus-input");
const pomodoroFocusCancel = document.getElementById("pomodoro-focus-cancel");
const shareDurationEditor = document.getElementById("share-duration-editor");
const shareDurationInput = document.getElementById("share-duration-input");
const shareDurationCancel = document.getElementById("share-duration-cancel");
let svgDoc = null;
const trackingInitializedDocs = new WeakSet();
let layers = null;
let targetDx = 0;
let targetDy = 0;
let currentCatName = "Catjang";
let currentUserName = "";
let isCatNameVisible = false;
let speechTimer = null;
let activeSpeechKind = null;
let baseSpeech = null;
let speechLayoutRaf = null;
let currentReminders = [];
let editingReminderId = null;
let currentFixedMessage = "";
let aiTaskStaleTimer = null;
let mouseEventsEnabled = true;
let currentLanguage = "es";
let windowBackend = "x11";
let windowShapeSupported = false;
let currentPomodoroState = null;
let updateCtaState = null;
const completionMeow = new Audio("../workspace/assets/sound/meow.m4a");
const reminderMeow = new Audio("../workspace/assets/sound/meow-alert.m4a");
const purringSound = new Audio("../workspace/assets/sound/purring.m4a");
let completionMeowVolume = 0.1;
const reminderMeowVolumeBoost = 2.4;
completionMeow.volume = completionMeowVolume;
completionMeow.preload = "auto";
reminderMeow.volume = getReminderMeowVolume();
reminderMeow.preload = "auto";
purringSound.loop = true;
purringSound.preload = "auto";
purringSound.volume = 0.28;

const I18N = {
  en: {
    agentComplete: "Task complete!",
    needsAttention: (name) => `${name || "Human"}, needs your attention!`,
    focusLabel: "Focus",
    restLabel: "Break",
    startBreak: (name) => `${name || "Human"}, take a break!`,
    startFocus: (name) => `${name || "Human"}, back to focus!`,
    updateChecking: "Checking...",
    updateAvailable: "Update",
    updateNone: "No updates",
    updateDownloading: (percent) => percent === null ? "Updating..." : `Updating ${percent}%`,
    updateRestarting: "Restarting...",
    userNameGuide: "Tell Catjang your name, and Catjang will call you for reminders and other moments.",
    userNamePlaceholder: "Enter your name",
    userGreeting: (name) => `Hi, ${name}!`,
    pomodoroPause: "Pause",
    pomodoroResume: "Resume",
    pomodoroReset: "Reset",
    reminderOnce: "Once",
    reminderCustomDays: "Choose days",
    reminderDaily: "Daily",
    reminderWeekdays: "Weekdays",
    reminderWeekends: "Weekends",
    reminderDaysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    reminderOpen: "Open reminders",
    reminderTitle: "Reminder",
    reminderPanelLabel: "Reminders",
    reminderRepeatGroupLabel: "Repeat",
    reminderDayPickerLabel: "Choose days",
    reminderMessagePlaceholder: "What should Catjang remind you?",
    reminderAdd: "Add",
    reminderCancel: "Cancel",
    reminderSave: "Save",
    reminderUpdate: "Update",
    reminderClose: "Close",
    reminderEmpty: "Add a reminder and Catjang will tell you on time.",
    reminderEdit: "Edit",
    reminderDelete: "Delete",
    sharePermissionFailed: "Could not record the screen. Please check macOS screen recording permission.",
    sharePermissionFailedWindows: "Could not record the screen. Please check Windows privacy or security settings for screen capture.",
    shareConversionFailed: "Could not convert the share video to MP4.",
    shareRecordingFailed: "Could not make the share video.",
  },
  es: {
    agentComplete: "¡Tarea completada!",
    needsAttention: (name) => `${name || "Humano"}, ¡necesito tu atención!`,
    focusLabel: "Concentración",
    restLabel: "Descanso",
    startBreak: (name) => `${name || "Humano"}, ¡tómate un descanso!`,
    startFocus: (name) => `${name || "Humano"}, ¡volvamos a concentrarnos!`,
    updateChecking: "Buscando...",
    updateAvailable: "Actualizar",
    updateNone: "No hay actualizaciones",
    updateDownloading: (percent) => percent === null ? "Actualizando..." : `Actualizando ${percent}%`,
    updateRestarting: "Reiniciando...",
    userNameGuide: "Dile tu nombre a Catjang para que pueda llamarte en los recordatorios y otros momentos.",
    userNamePlaceholder: "Introduce tu nombre",
    userGreeting: (name) => `¡Hola, ${name}!`,
    pomodoroPause: "Pausar",
    pomodoroResume: "Reanudar",
    pomodoroReset: "Restablecer",
    reminderOnce: "Una vez",
    reminderCustomDays: "Elegir días",
    reminderDaily: "Todos los días",
    reminderWeekdays: "Días laborables",
    reminderWeekends: "Fines de semana",
    reminderDaysShort: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
    reminderOpen: "Abrir recordatorios",
    reminderTitle: "Recordatorios",
    reminderPanelLabel: "Recordatorios",
    reminderRepeatGroupLabel: "Repetición",
    reminderDayPickerLabel: "Elegir días",
    reminderMessagePlaceholder: "¿Qué debe recordarte Catjang?",
    reminderAdd: "Añadir",
    reminderCancel: "Cancelar",
    reminderSave: "Guardar",
    reminderUpdate: "Actualizar",
    reminderClose: "Cerrar",
    reminderEmpty: "Añade un recordatorio y Catjang te avisará a tiempo.",
    reminderEdit: "Editar",
    reminderDelete: "Eliminar",
    sharePermissionFailed: "No se pudo grabar la pantalla. Comprueba el permiso de grabación de pantalla de macOS.",
    sharePermissionFailedWindows: "No se pudo grabar la pantalla. Comprueba los permisos de captura en la configuración de privacidad o seguridad de Windows.",
    shareConversionFailed: "No se pudo convertir el vídeo a MP4.",
    shareRecordingFailed: "No se pudo crear el vídeo.",
  },
  ko: {
    agentComplete: "작업 완료냥!",
    needsAttention: (name) => `${name || "집사야"}, 확인이 필요하다냥!`,
    focusLabel: "집중냥",
    restLabel: "휴식냥",
    startBreak: (name) => `${name || "집사야"}, 쉬자냥!`,
    startFocus: (name) => `${name || "집사야"}, 다시 집중하자냥!`,
    updateChecking: "업데이트 확인 중...",
    updateAvailable: "업데이트하기",
    updateNone: "최신 버전이다냥",
    updateDownloading: (percent) => percent === null ? "업데이트 중..." : `업데이트 중 ${percent}%`,
    updateRestarting: "재시작 중...",
    userNameGuide: "이름을 알려주면 캣짱이 알림을 주거나 다양한 상황에서 사용자를 불러줄거예요.",
    userNamePlaceholder: "사용자 이름을 입력해주세요",
    userGreeting: (name) => `안녕, ${name}!`,
    pomodoroPause: "일시정지",
    pomodoroResume: "다시 시작",
    pomodoroReset: "초기화",
    reminderOnce: "한 번",
    reminderCustomDays: "요일 선택",
    reminderDaily: "매일",
    reminderWeekdays: "평일",
    reminderWeekends: "주말",
    reminderDaysShort: ["일", "월", "화", "수", "목", "금", "토"],
    reminderOpen: "알림 열기",
    reminderTitle: "알림",
    reminderPanelLabel: "알림장",
    reminderRepeatGroupLabel: "반복 설정",
    reminderDayPickerLabel: "요일 선택",
    reminderMessagePlaceholder: "무엇을 알려줄까냥?",
    reminderAdd: "추가",
    reminderCancel: "취소",
    reminderSave: "저장",
    reminderUpdate: "수정",
    reminderClose: "닫기",
    reminderEmpty: "알림을 등록하면 시간 맞춰 알려주겠다냥.",
    reminderEdit: "수정",
    reminderDelete: "삭제",
    sharePermissionFailed: "화면을 녹화할 수 없어요. macOS 화면 기록 권한을 확인해 주세요.",
    sharePermissionFailedWindows: "화면을 녹화할 수 없어요. Windows 개인정보 또는 보안 설정에서 화면 캡처 권한을 확인해 주세요.",
    shareConversionFailed: "자랑 영상을 MP4로 변환할 수 없어요.",
    shareRecordingFailed: "자랑 영상을 만들 수 없어요.",
  },
  ja: {
    agentComplete: "タスク完了にゃ！",
    needsAttention: (name) => `${name ? `${name}さん` : "ご主人"}、確認が必要だにゃ！`,
    focusLabel: "集中にゃ",
    restLabel: "休憩にゃ",
    startBreak: (name) => `${name ? `${name}さん` : "ご主人"}、休憩するにゃ！`,
    startFocus: (name) => `${name ? `${name}さん` : "ご主人"}、また集中するにゃ！`,
    updateChecking: "確認中...",
    updateAvailable: "アップデート",
    updateNone: "最新バージョンだにゃ",
    updateDownloading: (percent) => percent === null ? "アップデート中..." : `アップデート中 ${percent}%`,
    updateRestarting: "再起動中...",
    userNameGuide: "名前を教えると、Catjang が通知やいろいろな場面であなたを呼んでくれます。",
    userNamePlaceholder: "ユーザー名を入力してください",
    userGreeting: (name) => `こんにちは、${name}さん！`,
    pomodoroPause: "一時停止",
    pomodoroResume: "再開",
    pomodoroReset: "リセット",
    reminderOnce: "1回",
    reminderCustomDays: "曜日選択",
    reminderDaily: "毎日",
    reminderWeekdays: "平日",
    reminderWeekends: "週末",
    reminderDaysShort: ["日", "月", "火", "水", "木", "金", "土"],
    reminderOpen: "通知を開く",
    reminderTitle: "通知",
    reminderPanelLabel: "通知",
    reminderRepeatGroupLabel: "繰り返し",
    reminderDayPickerLabel: "曜日選択",
    reminderMessagePlaceholder: "何を知らせるにゃ？",
    reminderAdd: "追加",
    reminderCancel: "キャンセル",
    reminderSave: "保存",
    reminderUpdate: "更新",
    reminderClose: "閉じる",
    reminderEmpty: "通知を登録したら時間に合わせて知らせるにゃ。",
    reminderEdit: "編集",
    reminderDelete: "削除",
    sharePermissionFailed: "画面を録画できませんでした。macOS の画面収録権限を確認してください。",
    sharePermissionFailedWindows: "画面を録画できませんでした。Windows のプライバシーまたはセキュリティ設定で画面キャプチャ権限を確認してください。",
    shareConversionFailed: "自慢動画を MP4 に変換できませんでした。",
    shareRecordingFailed: "自慢動画を作成できませんでした。",
  },
};

function normalizeLanguage(language) {
  const lang = String(language || "").toLowerCase().split("-")[0];
  return I18N[lang] ? lang : "es";
}

function tr(key, ...args) {
  const table = I18N[currentLanguage] || I18N.en;
  const value = table[key] || I18N.en[key] || key;
  return typeof value === "function" ? value(...args) : value;
}

// 모든 SVG document 참조 — 타이핑 강도에 따라 --cat-color 동기화
const svgDocs = new Set();
const svgDocNames = new WeakMap();
let currentCatColor = "#1A1A1A";     // 마지막으로 set된 cat-color — 늦게 로드되는 SVG에 즉시 반영
let currentOutlineColor = "#FFFFFF"; // 베이스 색 명도에 따라 흰/검정 전환
let currentHeatOverlayColor = "#dc2828";
let currentLegacyHeatOverlayOpacity = "0";
let currentFullHeatOverlayOpacity = "0";
let currentEyeColor = null;          // null = --cat-color에 fallback (oddEye=false일 때 사용)
let currentEyeBgColor = null;
let currentEyeColorLeft = null;      // oddEye=true일 때 좌측 눈동자 색
let currentEyeColorRight = null;     // oddEye=true일 때 우측 눈동자 색
function registerSvgDoc(doc, svgName = null) {
  if (doc) {
    if (svgName) {
      svgDocNames.set(doc, svgName);
      if (doc.documentElement) doc.documentElement.setAttribute("data-catjang-svg-name", svgName);
    }
    if (svgDocs.has(doc)) {
      if (earComponentsNeedInstall(doc)) {
        installEarComponents(doc);
        applyPatternToSvg(doc, currentPattern);
        refreshHeatOverlays(doc);
      }
      return;
    }
    svgDocs.add(doc);
    // 꼬리/귀 컴포넌트 먼저 주입 (patches slot이 만들어진 뒤 applyPatternToSvg가 채울 수 있도록)
    installTailComponent(doc);
    installEarComponents(doc);
    applyPatternToSvg(doc, currentPattern);
    installHeatOverlays(doc);
    // 새로 로드된 SVG에도 현재 색상들 즉시 적용 — patternChanged가 먼저
    // 발생한 후 SVG가 로드되는 경우 누락 방지 (특히 stretch-end가 늦게 로드되면
    // 드래그 시 사용자 baseColor 대신 :root 기본값 #1A1A1A로 표시되던 버그 fix)
    if (doc.documentElement) {
      const root = doc.documentElement;
      root.style.setProperty("--cat-color", currentCatColor);
      root.style.setProperty("--cat-outline", currentOutlineColor);
      root.style.setProperty("--heat-overlay-color", currentHeatOverlayColor);
      root.style.setProperty("--legacy-heat-overlay-opacity", currentLegacyHeatOverlayOpacity);
      root.style.setProperty("--full-heat-overlay-opacity", currentFullHeatOverlayOpacity);
      if (currentEyeColor) root.style.setProperty("--eye-color", currentEyeColor);
      if (currentEyeBgColor) root.style.setProperty("--eye-bg-color", currentEyeBgColor);
      if (currentEyeColorLeft) root.style.setProperty("--eye-color-left", currentEyeColorLeft);
      if (currentEyeColorRight) root.style.setProperty("--eye-color-right", currentEyeColorRight);
    }
  }
}

function earComponentsNeedInstall(doc) {
  if (!doc) return false;
  for (const id of ["ear-left", "ear-right"]) {
    const ear = doc.getElementById(id);
    if (!ear) continue;
    if (!ear.querySelector("path") || !ear.querySelector(".patches")) return true;
  }
  return false;
}

function ensureSvgObjectReady(id) {
  const el = document.getElementById(id);
  const doc = el && el.contentDocument;
  if (!doc) return null;
  if (!svgDocs.has(doc)) {
    registerSvgDoc(doc, id);
  } else if (earComponentsNeedInstall(doc)) {
    installEarComponents(doc);
    applyPatternToSvg(doc, currentPattern);
    refreshHeatOverlays(doc);
  }
  return doc;
}
function setCatColorAllSvgs(color) {
  currentCatColor = color;
  for (const doc of svgDocs) {
    if (doc && doc.documentElement) {
      doc.documentElement.style.setProperty("--cat-color", color);
    }
  }
}
function setCatOutlineAllSvgs(color) {
  currentOutlineColor = color;
  for (const doc of svgDocs) {
    if (doc && doc.documentElement) {
      doc.documentElement.style.setProperty("--cat-outline", color);
    }
  }
}
function setHeatOverlayAllSvgs(color, legacyOpacity, fullOpacity = legacyOpacity) {
  currentHeatOverlayColor = color;
  currentLegacyHeatOverlayOpacity = String(legacyOpacity);
  currentFullHeatOverlayOpacity = String(fullOpacity);
  for (const doc of svgDocs) {
    if (doc && doc.documentElement) {
      doc.documentElement.style.setProperty("--heat-overlay-color", color);
      doc.documentElement.style.setProperty("--legacy-heat-overlay-opacity", currentLegacyHeatOverlayOpacity);
      doc.documentElement.style.setProperty("--full-heat-overlay-opacity", currentFullHeatOverlayOpacity);
    }
  }
}
function setEyeColorAllSvgs(color) {
  currentEyeColor = color;
  for (const doc of svgDocs) {
    if (doc && doc.documentElement) {
      doc.documentElement.style.setProperty("--eye-color", color);
    }
  }
}
function setEyeBgColorAllSvgs(color) {
  currentEyeBgColor = color;
  for (const doc of svgDocs) {
    if (doc && doc.documentElement) {
      doc.documentElement.style.setProperty("--eye-bg-color", color);
    }
  }
}
function setEyeColorLeftAllSvgs(color) {
  currentEyeColorLeft = color;
  for (const doc of svgDocs) {
    if (doc && doc.documentElement) {
      if (color) doc.documentElement.style.setProperty("--eye-color-left", color);
      else doc.documentElement.style.removeProperty("--eye-color-left");
    }
  }
}
function setEyeColorRightAllSvgs(color) {
  currentEyeColorRight = color;
  for (const doc of svgDocs) {
    if (doc && doc.documentElement) {
      if (color) doc.documentElement.style.setProperty("--eye-color-right", color);
      else doc.documentElement.style.removeProperty("--eye-color-right");
    }
  }
}

// ── 부위별 패턴 (Phase 1: head only) ──
// spot 좌표는 각 부위 로컬 셀 좌표 (0,0 = 부위 frame origin).
// 각 SVG의 부위 <g>에 data-patch-frame="originX originY cellW cellH"가 있어
// 셀(x, y) → 실제 svg 좌표 (originX + x*cellW, originY + y*cellH).
const SVG_NS = "http://www.w3.org/2000/svg";
let currentPattern = { head: [] };

// 메인 프로세스가 보내는 패턴 변경을 구독 — 에디터에서 그릴 때 라이브 반영
window.electronAPI.onPatternChanged((pattern) => {
  const p = pattern || {};
  const rgb = hexToRgb(p.baseColor);
  if (rgb) {
    BASE_RGB = rgb;
    // idle 상태(타이핑/스트레칭 없음)에선 heatTick이 잠들어 있어 --cat-color
    // 갱신이 안 됨 — 즉시 base color로 한 번 적용
    setCatColorAllSvgs(`rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
    // 명도 0.5 이상(밝은 캣짱) → 외곽선 검정으로 전환
    const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    setCatOutlineAllSvgs(lum > 0.5 ? "#000000" : "#FFFFFF");
  }
  // eye color 적용
  if (typeof p.eyeBgColor === "string") setEyeBgColorAllSvgs(p.eyeBgColor);
  // oddEye=true: 좌/우 따로 set, --eye-color는 그대로 두면 fallback 안 쓰임 (left/right가 우선)
  // oddEye=false: 양쪽 공통 --eye-color, left/right는 clear해서 --eye-color로 fallback
  if (p.oddEye) {
    if (typeof p.eyeColorLeft === "string") setEyeColorLeftAllSvgs(p.eyeColorLeft);
    if (typeof p.eyeColorRight === "string") setEyeColorRightAllSvgs(p.eyeColorRight);
  } else {
    // 좌/우 var 제거 → fill에서 --eye-color 또는 --cat-color fallback
    setEyeColorLeftAllSvgs(null);
    setEyeColorRightAllSvgs(null);
    if (typeof p.eyeColor === "string") setEyeColorAllSvgs(p.eyeColor);
  }
  applyPatternAllSvgs(p);
});

// pattern key → SVG element ID 매핑. camelCase key를 kebab-case ID로 변환 (legFl → leg-fl).
const PATTERN_PART_MAPPING = {
  legFl: ["leg-fl"],
  legFr: ["leg-fr"],
  legRl: ["leg-rl"],
  legRr: ["leg-rr"],
  earL: ["ear-left"],
  earR: ["ear-right"],
};

function applyPatternToSvg(doc, pattern) {
  if (!doc || !pattern) return;
  for (const [partKey, spots] of Object.entries(pattern)) {
    if (!Array.isArray(spots)) continue;
    const elemIds = PATTERN_PART_MAPPING[partKey] || [partKey];
    for (const elemId of elemIds) {
      applyPatternSpotsToElement(doc, elemId, spots);
    }
  }
}

function applyPatternSpotsToElement(doc, elemId, spots) {
  // stretch-end의 body는 chain segment에 직접 분배 (segment dx + y lerp 자동 따라감).
  if (elemId === "body" && doc.getElementById("seg-wrap-0")) {
    distributeBodyPatchesToChain(doc, spots);
    return;
  }

  const partEl = doc.getElementById(elemId);
  if (!partEl) return;
  const frameAttr = partEl.getAttribute("data-patch-frame");
  if (!frameAttr) return;
  const [ox, oy, cw, ch] = frameAttr.split(/\s+/).map(Number);
  // data-patch-mirror-x="N": 셀 x를 (N-1-x)로 뒤집음 (좌/우 대칭 부위에 사용)
  const mirrorXCells = parseFloat(partEl.getAttribute("data-patch-mirror-x") || "0");
  const slot = partEl.querySelector(".patches");
  if (!slot) return;
  while (slot.firstChild) slot.removeChild(slot.firstChild);
  for (const s of spots) {
    const cellX = mirrorXCells > 0 ? (mirrorXCells - 1 - s.x) : s.x;
    const mappedPixels = getMappedPixelsForSpot(doc, elemId, cellX, s.y);
    if (mappedPixels) {
      for (const p of mappedPixels) {
        const r = doc.createElementNS(SVG_NS, "rect");
        r.setAttribute("x", p.x);
        r.setAttribute("y", p.y);
        r.setAttribute("width", 1);
        r.setAttribute("height", 1);
        r.setAttribute("fill", s.color);
        slot.appendChild(r);
      }
    } else {
      const r = doc.createElementNS(SVG_NS, "rect");
      r.setAttribute("x", ox + cellX * cw);
      r.setAttribute("y", oy + s.y * ch);
      r.setAttribute("width", cw);
      r.setAttribute("height", ch);
      r.setAttribute("fill", s.color);
      slot.appendChild(r);
    }
  }
}

function getMappedPixelsForSpot(doc, elemId, cellX, cellY) {
  const api = window.cellMappings;
  if (!api || typeof api.getPixelsForCell !== "function") return null;
  const svgName = svgDocNames.get(doc) || (doc.documentElement && doc.documentElement.getAttribute("data-catjang-svg-name"));
  if (!svgName) return null;
  const pixels = api.getPixelsForCell(svgName, elemId, cellX, cellY);
  if (Array.isArray(pixels) && pixels.length === 0 &&
      (svgName === "jump-ing" || svgName === "jump-start") &&
      (elemId === "leg-fl" || elemId === "leg-fr")) {
    return null;
  }
  return Array.isArray(pixels) ? pixels : null;
}

// stretch-end body patches: 각 spot을 endY에 해당하는 seg-wrap에 직접 추가하고
// lerpData에 등록 → chain의 segment dx(흔들림) + y lerp(늘어남)에 자동 동기화.
function distributeBodyPatchesToChain(doc, spots) {
  if (!endData) return;
  const bodyWrapper = doc.getElementById("body");
  if (!bodyWrapper) return;

  const { bodyYmin, segHeight, lerpData, bodyRowRects } = endData;
  if (!bodyRowRects || bodyRowRects.length === 0) return;

  // 기존 body patch rect 제거 (각 seg-wrap에서 .body-patch 클래스 제거 + lerpData에서 제거)
  for (let i = 0; i < N_SEG; i++) {
    const wrapEl = doc.getElementById(`seg-wrap-${i}`);
    if (!wrapEl) continue;
    for (const child of Array.from(wrapEl.children)) {
      if (child.classList && child.classList.contains("body-patch")) {
        wrapEl.removeChild(child);
      }
    }
  }
  // lerpData에서 body-patch 항목 제거
  for (let i = lerpData.length - 1; i >= 0; i--) {
    if (lerpData[i].rect && lerpData[i].rect.classList &&
        lerpData[i].rect.classList.contains("body-patch")) {
      lerpData.splice(i, 1);
    }
  }
  // body wrapper의 patches slot도 비움 (chain 모드에선 사용 안 함)
  const slot = bodyWrapper.querySelector(".patches");
  if (slot) while (slot.firstChild) slot.removeChild(slot.firstChild);

  function addBodyPatchRect({ color, endX, endY, endW, endH, startX, startY, startW, startH }) {
    const cy = endY + endH / 2;
    const segIdx = Math.min(N_SEG - 1, Math.max(0, Math.floor((cy - bodyYmin) / segHeight)));
    const cumulativeY = bodyYmin + segIdx * segHeight;
    const startYLocal = startY - cumulativeY;
    const endYLocal = endY - cumulativeY;

    const rect = doc.createElementNS(SVG_NS, "rect");
    rect.setAttribute("class", "body-patch");
    rect.setAttribute("x", endX);
    rect.setAttribute("y", endYLocal);
    rect.setAttribute("width", endW);
    rect.setAttribute("height", endH);
    rect.setAttribute("fill", color);

    const wrapEl = doc.getElementById(`seg-wrap-${segIdx}`);
    if (wrapEl) wrapEl.appendChild(rect);

    // chain의 lerp 루프가 x/y/w/h 모두 처리.
    lerpData.push({
      rect, useTransform: false,
      startX, endX, startYLocal, endYLocal, startW, endW, startH, endH,
    });
  }

  // 원본 body는 22x15 소스 그리드다.
  // stretch-chain:body가 있으면 그 22x15 가상 블럭 매핑을 사용한다.
  // 매핑이 없는 셀은 원본 cell row N을 stretch-end의 bodyRowRects[N]에 직접 대응시킨다.
  // bodyRowRects는 다시 N_SEG개의 chain segment에 분산되어 기존 늘어남/흔들림을 따른다.
  const CELLS_X = 22;
  const chainMapping = window.cellMappings &&
    window.cellMappings.MAPPINGS &&
    window.cellMappings.MAPPINGS["stretch-chain:body"];

  function addBodyBlockPatch(blockX, blockY, color) {
    if (blockY < 0 || blockY >= bodyRowRects.length) return;
    const targetRect = bodyRowRects[blockY];
    if (blockX < 0 || blockX >= CELLS_X) return;

    const startMaxCol = Math.max(0, targetRect.startW - 1);
    const endMaxCol = Math.max(0, targetRect.endW - 1);
    const cellsMaxCol = CELLS_X - 1;
    const startColInRow = Math.round(blockX * startMaxCol / cellsMaxCol);
    const endColInRow = Math.round(blockX * endMaxCol / cellsMaxCol);
    const startX = targetRect.startX + startColInRow;
    const endX = targetRect.endX + endColInRow;
    const startW = 1;
    const endW = 1;
    const startH = targetRect.startH;
    const endH = targetRect.endH;
    const endY = targetRect.endY;

    addBodyPatchRect({
      color,
      endX,
      endY,
      endW,
      endH,
      startX,
      startY: targetRect.startY,
      startW,
      startH,
    });
  }

  for (const s of spots) {
    const mappedBlocks = chainMapping &&
      chainMapping.cells &&
      Array.isArray(chainMapping.cells[`${s.x},${s.y}`]) &&
      chainMapping.cells[`${s.x},${s.y}`].length > 0
      ? chainMapping.cells[`${s.x},${s.y}`]
      : [[s.x, s.y]];
    for (const [blockX, blockY] of mappedBlocks) {
      addBodyBlockPatch(blockX, blockY, s.color);
    }
  }
}

function applyPatternAllSvgs(pattern) {
  currentPattern = pattern;
  for (const doc of svgDocs) {
    applyPatternToSvg(doc, pattern);
    refreshHeatOverlays(doc);
  }
}

function getSvgViewBoxRect(doc) {
  const svg = doc && doc.documentElement;
  if (!svg) return null;
  const viewBox = svg.getAttribute("viewBox");
  if (viewBox) {
    const [x, y, width, height] = viewBox.trim().split(/[\s,]+/).map(Number);
    if ([x, y, width, height].every((n) => Number.isFinite(n))) {
      return { x, y, width, height };
    }
  }
  const width = parseFloat(svg.getAttribute("width") || "0");
  const height = parseFloat(svg.getAttribute("height") || "0");
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return { x: 0, y: 0, width, height };
  }
  return null;
}

function removeHeatOverlays(doc) {
  if (!doc) return;
  for (const overlay of Array.from(doc.querySelectorAll(".heat-overlay"))) {
    overlay.remove();
  }
}

function refreshHeatOverlays(doc) {
  removeHeatOverlays(doc);
  installHeatOverlays(doc);
}

function installHeatOverlays(doc) {
  const bounds = getSvgViewBoxRect(doc);
  if (!bounds) return;

  const catContent = doc.getElementById("cat-content") || doc.documentElement;
  const maskId = "cat-heat-mask";
  let defs = doc.querySelector("defs");
  if (!defs) {
    defs = doc.createElementNS(SVG_NS, "defs");
    doc.documentElement.insertBefore(defs, doc.documentElement.firstChild);
  }

  let mask = doc.getElementById(maskId);
  if (!mask) {
    mask = doc.createElementNS(SVG_NS, "mask");
    mask.setAttribute("id", maskId);
    defs.appendChild(mask);
  }
  while (mask.firstChild) mask.removeChild(mask.firstChild);
  mask.setAttribute("maskUnits", "userSpaceOnUse");
  mask.setAttribute("x", bounds.x);
  mask.setAttribute("y", bounds.y);
  mask.setAttribute("width", bounds.width);
  mask.setAttribute("height", bounds.height);
  mask.style.setProperty("mask-type", "alpha");

  const sourceSelector = [
    "[data-patch-frame]",
    "[data-heat-overlay]",
    "[id^='seg-wrap-']",
  ].join(",");
  const sources = Array.from(catContent.querySelectorAll(sourceSelector)).filter((source) => {
    if (source.closest("defs") || source.closest(".heat-overlay")) return false;
    if (source.closest("[id^='seg-wrap-']") && !source.id.startsWith("seg-wrap-")) return false;
    if (source.id.startsWith("seg-wrap-") && source.id !== "seg-wrap-0") return false;
    if (source.id === "body" && doc.getElementById("seg-wrap-0")) return false;
    if (!source.id) return false;
    return true;
  });

  for (const source of sources) {
    const use = doc.createElementNS(SVG_NS, "use");
    use.setAttribute("href", `#${source.id}`);
    use.setAttribute("fill", "white");
    use.setAttribute("stroke", "white");
    mask.appendChild(use);
  }

  const overlay = doc.createElementNS(SVG_NS, "rect");
  overlay.setAttribute("class", "heat-overlay cat-heat-overlay");
  overlay.setAttribute("pointer-events", "none");
  overlay.setAttribute("x", bounds.x);
  overlay.setAttribute("y", bounds.y);
  overlay.setAttribute("width", bounds.width);
  overlay.setAttribute("height", bounds.height);
  overlay.setAttribute("mask", `url(#${maskId})`);
  overlay.style.setProperty("fill", "var(--heat-overlay-color, #dc2828)");
  overlay.style.setProperty("opacity", "var(--full-heat-overlay-opacity, 0)");
  catContent.appendChild(overlay);

  const patchSlots = Array.from(doc.querySelectorAll(".patches"));
  const animationTags = new Set(["animate", "animateTransform", "animateMotion", "set"]);
  for (const slot of patchSlots) {
    const parent = slot.parentNode;
    if (!parent || !parent.closest || !parent.closest("[data-patch-frame]")) continue;
    const clipPath = slot.getAttribute("clip-path");
    if (!clipPath) continue;

    if (!parent.hasAttribute("data-patch-frame")) {
      const shapeOverlay = doc.createElementNS(SVG_NS, "g");
      shapeOverlay.setAttribute("class", "heat-overlay legacy-heat-overlay shape-heat-overlay");
      shapeOverlay.setAttribute("pointer-events", "none");
      for (const child of Array.from(parent.children)) {
        if (child === slot) break;
        if (child.classList && child.classList.contains("heat-overlay")) continue;
        if (animationTags.has(child.tagName)) continue;
        const clone = child.cloneNode(true);
        for (const animated of Array.from(clone.querySelectorAll("animate, animateTransform, animateMotion, set"))) {
          animated.remove();
        }
        for (const painted of [clone, ...Array.from(clone.querySelectorAll("*"))]) {
          if (painted.hasAttribute("fill")) painted.setAttribute("fill", "var(--heat-overlay-color, #dc2828)");
          if (painted.hasAttribute("stroke")) painted.setAttribute("stroke", "var(--heat-overlay-color, #dc2828)");
        }
        shapeOverlay.appendChild(clone);
      }
      if (shapeOverlay.childNodes.length > 0) {
        shapeOverlay.style.setProperty("opacity", "var(--legacy-heat-overlay-opacity, 0)");
        parent.appendChild(shapeOverlay);
      }
      continue;
    }

    const patchOverlay = doc.createElementNS(SVG_NS, "rect");
    patchOverlay.setAttribute("class", "heat-overlay legacy-heat-overlay patch-heat-overlay");
    patchOverlay.setAttribute("pointer-events", "none");
    patchOverlay.setAttribute("x", bounds.x);
    patchOverlay.setAttribute("y", bounds.y);
    patchOverlay.setAttribute("width", bounds.width);
    patchOverlay.setAttribute("height", bounds.height);
    patchOverlay.setAttribute("clip-path", clipPath);
    patchOverlay.style.setProperty("fill", "var(--heat-overlay-color, #dc2828)");
    patchOverlay.style.setProperty("opacity", "var(--legacy-heat-overlay-opacity, 0)");
    parent.appendChild(patchOverlay);
  }

  for (const source of Array.from(doc.querySelectorAll("[data-heat-overlay]"))) {
    const parent = source.parentNode;
    if (!parent) continue;

    const legacyOverlay = doc.createElementNS(SVG_NS, "g");
    legacyOverlay.setAttribute("class", "heat-overlay legacy-heat-overlay");
    legacyOverlay.setAttribute("pointer-events", "none");
    for (const child of Array.from(source.children)) {
      const clone = child.cloneNode(true);
      for (const painted of [clone, ...Array.from(clone.querySelectorAll("[fill]"))]) {
        if (painted.hasAttribute("fill")) painted.setAttribute("fill", "var(--heat-overlay-color, #dc2828)");
      }
      legacyOverlay.appendChild(clone);
    }
    legacyOverlay.style.setProperty("opacity", "var(--legacy-heat-overlay-opacity, 0)");
    parent.insertBefore(legacyOverlay, source.nextSibling);
  }
}

// ── 귀 컴포넌트 (좌/우, 단일 정의, 모든 포즈에 동적 주입) ──
// SVG 파일들의 <g id="ear-left/ear-right" data-ear-position="x y"> placeholder에
// 표준 귀 path를 translate(x, y)로 설치한다.
const EAR_LEFT_PATH_D = "M0 7V4H1V2H2V1H3V0H4V2H5V3H6V7H5V8H1V7H0Z";
const EAR_RIGHT_PATH_D = "M1 3H0V7H1V8H4V7H5V2H4V1H3V0H2V1H1V3Z";

function installEarComponents(doc) {
  const earDefs = [
    ["ear-left", EAR_LEFT_PATH_D, "ear-left-clip"],
    ["ear-right", EAR_RIGHT_PATH_D, "ear-right-clip"],
  ];

  // defs 보장
  let defs = doc.querySelector("defs");
  if (!defs && doc.documentElement) {
    defs = doc.createElementNS(SVG_NS, "defs");
    doc.documentElement.insertBefore(defs, doc.documentElement.firstChild);
  }

  for (const [id, pathD, clipId] of earDefs) {
    const el = doc.getElementById(id);
    if (!el) continue;
    const posAttr = el.getAttribute("data-ear-position");
    if (!posAttr) continue;
    const [x, y] = posAttr.split(/\s+/).map(Number);

    while (el.firstChild) el.removeChild(el.firstChild);

    // ear path
    const path = doc.createElementNS(SVG_NS, "path");
    path.setAttribute("transform", `translate(${x} ${y})`);
    path.setAttribute("d", pathD);
    path.setAttribute("fill", "var(--cat-color)");
    el.appendChild(path);

    // clipPath — 같은 모양/위치
    if (defs) {
      let clip = doc.getElementById(clipId);
      if (!clip) {
        clip = doc.createElementNS(SVG_NS, "clipPath");
        clip.setAttribute("id", clipId);
        defs.appendChild(clip);
      }
      while (clip.firstChild) clip.removeChild(clip.firstChild);
      const clipPath = doc.createElementNS(SVG_NS, "path");
      clipPath.setAttribute("transform", `translate(${x} ${y})`);
      clipPath.setAttribute("d", pathD);
      clip.appendChild(clipPath);
    }

    // patches slot
    const patches = doc.createElementNS(SVG_NS, "g");
    patches.setAttribute("class", "patches");
    patches.setAttribute("clip-path", `url(#${clipId})`);
    el.appendChild(patches);

    // data-patch-frame: 셀 (0,0) → svg (x, y), 1×1 셀
    el.setAttribute("data-patch-frame", `${x} ${y} 1 1`);
  }
  placeEarsBehindHead(doc);
}

function placeEarsBehindHead(doc) {
  const head = doc.getElementById("head");
  if (!head || !head.parentNode) return;
  for (const id of ["ear-left", "ear-right"]) {
    const ear = doc.getElementById(id);
    const renderNode = directChildUnder(head.parentNode, ear);
    if (!renderNode || renderNode === head) continue;
    head.parentNode.insertBefore(renderNode, head);
  }
}

function directChildUnder(parent, node) {
  if (!parent || !node) return null;
  let current = node;
  while (current && current.parentNode && current.parentNode !== parent) {
    current = current.parentNode;
  }
  return current && current.parentNode === parent ? current : null;
}

// ── 꼬리 컴포넌트 (단일 정의, 모든 포즈에 동적 주입) ──
// SVG 파일들의 <g id="tail" data-patch-frame="ox oy cw ch"> placeholder에
// 표준 꼬리 path + patches slot + clipPath를 설치한다.
// data-tail-path-id가 있으면 inner path에 id="tail-path" 부여 (stretch-end chain용).
const TAIL_PATH_D = "M0 8V7H6V6H8V5H9V4H8V1H9V0H11V1H12V2H13V7H12V8H11V9H9V10H4V9H1V8H0Z";

function installTailComponent(doc) {
  const tailEl = doc.getElementById("tail");
  if (!tailEl) return;
  const frameAttr = tailEl.getAttribute("data-patch-frame");
  if (!frameAttr) return;
  const [ox, oy, cw, ch] = frameAttr.split(/\s+/).map(Number);

  // 기존 자식 제거
  while (tailEl.firstChild) tailEl.removeChild(tailEl.firstChild);

  // 표준 꼬리 path (cw=ch=1이면 translate만, 아니면 scale도)
  const transformStr = (cw === 1 && ch === 1)
    ? `translate(${ox} ${oy})`
    : `translate(${ox} ${oy}) scale(${cw} ${ch})`;
  const path = doc.createElementNS(SVG_NS, "path");
  path.setAttribute("transform", transformStr);
  path.setAttribute("d", TAIL_PATH_D);
  path.setAttribute("fill", "var(--cat-color)");
  if (tailEl.hasAttribute("data-tail-path-id")) {
    path.setAttribute("id", "tail-path");
  }
  tailEl.appendChild(path);

  // defs 안에 clipPath 보장 (없으면 생성)
  let defs = doc.querySelector("defs");
  if (!defs) {
    defs = doc.createElementNS(SVG_NS, "defs");
    doc.documentElement.insertBefore(defs, doc.documentElement.firstChild);
  }
  let clip = doc.getElementById("tail-clip");
  if (!clip) {
    clip = doc.createElementNS(SVG_NS, "clipPath");
    clip.setAttribute("id", "tail-clip");
    defs.appendChild(clip);
  }
  while (clip.firstChild) clip.removeChild(clip.firstChild);
  const clipPath = doc.createElementNS(SVG_NS, "path");
  clipPath.setAttribute("transform", transformStr);
  clipPath.setAttribute("d", TAIL_PATH_D);
  clip.appendChild(clipPath);

  // patches slot
  const patches = doc.createElementNS(SVG_NS, "g");
  patches.setAttribute("class", "patches");
  patches.setAttribute("clip-path", "url(#tail-clip)");
  tailEl.appendChild(patches);
}

obj.addEventListener("load", initTracking);
requestAnimationFrame(() => {
  if (obj && obj.contentDocument) initTracking();
});

function initTracking() {
  svgDoc = obj.contentDocument;
  if (!svgDoc) return;
  if (trackingInitializedDocs.has(svgDoc)) {
    ensureSvgObjectReady("cat");
    return;
  }
  trackingInitializedDocs.add(svgDoc);
  registerSvgDoc(svgDoc, "cat-idle-follow-v2");

  layers = {};
  for (const [name, cfg] of Object.entries(TRACKING_LAYERS)) {
    const wrappers = [];
    for (const id of cfg.ids) {
      const el = svgDoc.getElementById(id);
      if (!el) continue;
      wrappers.push(wrapElement(el));
    }
    layers[name] = {
      wrappers,
      maxOffset: cfg.maxOffset,
      ease: cfg.ease,
      stretchAxis: cfg.stretchAxis,
      x: 0,
      y: 0,
    };
  }

  requestAnimationFrame(tick);
  startBlinkLoop();
}

let blinkTimer = null;
function startBlinkLoop() {
  if (blinkTimer) clearTimeout(blinkTimer);
  function schedule() {
    blinkTimer = setTimeout(() => {
      const root = svgDoc && svgDoc.documentElement;
      if (root && !root.classList.contains("purring")) {
        root.classList.add("blinking");
        setTimeout(() => root && root.classList.remove("blinking"), 220);
      }
      schedule();
    }, 2200 + Math.random() * 3800);
  }
  schedule();
}

function wrapElement(el) {
  const ns = "http://www.w3.org/2000/svg";
  const wrapper = svgDoc.createElementNS(ns, "g");
  wrapper.setAttribute("data-tracking-wrapper", "1");
  el.parentNode.insertBefore(wrapper, el);
  wrapper.appendChild(el);
  return wrapper;
}

function isStretching() {
  return !!document.body.dataset.stretching;
}

function updateShakeDetection(dx, dy) {
  const now = performance.now();
  if (!lastCursorSample) {
    lastCursorSample = { dx, dy, vx: 0, vy: 0, t: now };
    return;
  }

  const dt = Math.max(1, now - lastCursorSample.t);
  const vx = (dx - lastCursorSample.dx) / dt * 16;
  const vy = (dy - lastCursorSample.dy) / dt * 16;
  const speed = Math.hypot(vx, vy);
  const prevSpeed = Math.hypot(lastCursorSample.vx, lastCursorSample.vy);
  const dot = vx * lastCursorSample.vx + vy * lastCursorSample.vy;
  const reversed = prevSpeed > 0 && speed > 0 && dot / (speed * prevSpeed) < -0.28;
  const acceleration = Math.max(0, speed - prevSpeed);

  shakeEnergy *= SHAKE_ENERGY_DECAY;
  if (canShowHuntingPose() && speed > SHAKE_SPEED_THRESHOLD) {
    shakeEnergy += Math.min(0.22, (speed - SHAKE_SPEED_THRESHOLD) / 42);
    if (reversed && speed > SHAKE_SPEED_THRESHOLD * 1.28) {
      shakeEnergy += Math.min(0.42, (speed - SHAKE_SPEED_THRESHOLD) / 34 + 0.12);
    }
    if (acceleration > 14) shakeEnergy += Math.min(0.18, acceleration / 52);
    if (speed > SHAKE_SPEED_THRESHOLD * 3.2 && acceleration > 18) {
      shakeEnergy += 0.28;
    }
  }

  if (shakeEnergy >= SHAKE_TRIGGER_ENERGY) {
    shakeEnergy = SHAKE_TRIGGER_ENERGY * 0.35;
    startHuntingPose();
  }

  lastCursorSample = { dx, dy, vx, vy, t: now };
}

window.electronAPI.onCursorPos(({ dx, dy }) => {
  updatePolledMouseEventPassthrough(dx, dy);
  // 스트레칭 중에는 마우스 추적 정지 — layers가 자연스럽게 0으로 수렴
  if (isStretching()) {
    targetDx = 0;
    targetDy = 0;
    lastCursorSample = null;
    shakeEnergy = 0;
    return;
  }
  updateShakeDetection(dx, dy);
  const dist = Math.hypot(dx, dy);
  if (dist === 0) {
    targetDx = 0;
    targetDy = 0;
    return;
  }
  const clamped = Math.min(dist, MAX_RAW_DIST_PX) / MAX_RAW_DIST_PX;
  targetDx = (dx / dist) * clamped;
  targetDy = (dy / dist) * clamped;
});

function tick() {
  if (!layers) return;
  for (const layer of Object.values(layers)) {
    const tx = targetDx * layer.maxOffset;
    const ty = targetDy * layer.maxOffset;

    layer.x += (tx - layer.x) * layer.ease;
    layer.y += (ty - layer.y) * layer.ease;

    if (Math.abs(layer.x) < 0.005 && Math.abs(layer.y) < 0.005 && tx === 0 && ty === 0) {
      layer.x = 0;
      layer.y = 0;
    }

    const qx = Math.round(layer.x * 8) / 8;
    const qy = Math.round(layer.y * 8) / 8;

    for (const w of layer.wrappers) {
      if (layer.stretchAxis === "x") {
        const stretch = 1 + Math.abs(targetDx) * 0.08;
        w.setAttribute("transform", `translate(${qx} 0) scale(${stretch.toFixed(3)} 1)`);
      } else {
        w.setAttribute("transform", `translate(${qx} ${qy})`);
      }
    }
  }
  requestAnimationFrame(tick);
}

function applyCatNameSettings(settings) {
  if (!settings) return;
  currentCatName = (settings.name || "Catjang").trim() || "Catjang";
  isCatNameVisible = !!settings.visible;
  if (shareNameBadge) shareNameBadge.textContent = currentCatName;
  document.body.toggleAttribute("data-show-name", isCatNameVisible);
}

function applyUserNameSettings(settings) {
  currentUserName = String(settings && settings.name || "").trim().slice(0, 24);
}

function openCatNameEditor(initialName) {
  if (!catNameEditor || !catNameInput) return;
  if (window.electronAPI.catNamePromptShown) {
    window.electronAPI.catNamePromptShown().catch(() => {});
  }
  catNameInput.value = (initialName || currentCatName || "Catjang").trim();
  document.body.dataset.editingName = "1";
  requestAnimationFrame(() => {
    catNameInput.focus();
    catNameInput.select();
  });
}

function closeCatNameEditor() {
  delete document.body.dataset.editingName;
}

function openUserNameEditor(initialName) {
  if (!userNameEditor || !userNameInput) return;
  userNameInput.value = String(initialName || "").trim();
  if (userNameGuide) userNameGuide.textContent = tr("userNameGuide");
  document.body.dataset.editingUserName = "1";
  requestAnimationFrame(() => {
    userNameInput.focus();
    userNameInput.select();
  });
}

function closeUserNameEditor() {
  delete document.body.dataset.editingUserName;
}

function openFixedMessageEditor(initialMessage) {
  if (!fixedMessageEditor || !fixedMessageInput) return;
  fixedMessageInput.value = String(initialMessage || currentFixedMessage || "").trim();
  document.body.dataset.editingFixedMessage = "1";
  requestAnimationFrame(() => {
    fixedMessageInput.focus();
    fixedMessageInput.select();
  });
}

function closeFixedMessageEditor() {
  delete document.body.dataset.editingFixedMessage;
}

function refreshBaseSpeech() {
  if (currentPomodoroState && currentPomodoroState.visible) {
    setBaseSpeech(formatPomodoroTime(currentPomodoroState.remainingSec), "timer");
    return;
  }
  setBaseSpeech(currentFixedMessage, "fixed");
}

function applyFixedMessageSettings(settings) {
  currentFixedMessage = String(settings && settings.message || "").trim().slice(0, 80);
  refreshBaseSpeech();
}

function openPomodoroFocusEditor(initialMin) {
  if (!pomodoroFocusEditor || !pomodoroFocusInput) return;
  const min = Math.max(1, Math.min(180, Math.round(Number(initialMin) || 25)));
  pomodoroFocusInput.value = String(min);
  document.body.dataset.editingPomodoroFocus = "1";
  requestAnimationFrame(() => {
    pomodoroFocusInput.focus();
    pomodoroFocusInput.select();
  });
}

function closePomodoroFocusEditor() {
  delete document.body.dataset.editingPomodoroFocus;
}

function openShareDurationEditor() {
  if (!shareDurationEditor || !shareDurationInput || shareRecording) return;
  shareDurationInput.value = shareDurationInput.value || "5";
  document.body.dataset.editingShareDuration = "1";
  requestAnimationFrame(() => {
    shareDurationInput.focus();
    shareDurationInput.select();
  });
}

function closeShareDurationEditor() {
  delete document.body.dataset.editingShareDuration;
}

function reminderRepeatLabel(repeat) {
  if (repeat === "daily") return tr("reminderDaily");
  if (repeat === "weekdays") return tr("reminderWeekdays");
  if (repeat === "weekends") return tr("reminderWeekends");
  if (repeat === "custom") return tr("reminderCustomDays");
  return tr("reminderOnce");
}

function reminderDaysLabel(days) {
  const names = tr("reminderDaysShort");
  const selected = Array.isArray(days) ? days : [];
  const separator = currentLanguage === "en" ? " " : "";
  return selected.map((day) => names[Number(day)]).filter(Boolean).join(separator);
}

function selectedReminderDays() {
  if (!reminderDayPicker) return [];
  return Array.from(reminderDayPicker.querySelectorAll("input[type='checkbox']:checked"))
    .map((input) => Number(input.value))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}

function updateReminderDayPickerVisibility() {
  if (!reminderDayPicker || !reminderRepeatInput) return;
  reminderDayPicker.hidden = reminderRepeatInput.value !== "custom";
}

function setReminderRepeat(value) {
  if (!reminderRepeatInput) return;
  reminderRepeatInput.value = value === "custom" ? "custom" : "none";
  if (reminderRepeatButtons) {
    for (const button of reminderRepeatButtons.querySelectorAll("button[data-repeat]")) {
      button.classList.toggle("is-selected", button.dataset.repeat === reminderRepeatInput.value);
    }
  }
  updateReminderDayPickerVisibility();
}

function updateReminderSaveButtonText() {
  if (reminderSaveButton) reminderSaveButton.textContent = editingReminderId ? tr("reminderUpdate") : tr("reminderSave");
}

function applyReminderI18n() {
  if (reminderClockButton) reminderClockButton.setAttribute("aria-label", tr("reminderOpen"));
  if (userNameGuide) userNameGuide.textContent = tr("userNameGuide");
  if (userNameInput) userNameInput.placeholder = tr("userNamePlaceholder");
  if (reminderPanelTitle) reminderPanelTitle.textContent = tr("reminderTitle");
  if (reminderPanel) reminderPanel.setAttribute("aria-label", tr("reminderPanelLabel"));
  if (reminderMessageInput) reminderMessageInput.placeholder = tr("reminderMessagePlaceholder");
  if (reminderAddButton) reminderAddButton.textContent = tr("reminderAdd");
  if (reminderCancelButton) reminderCancelButton.textContent = tr("reminderCancel");
  if (reminderPanelClose) reminderPanelClose.textContent = tr("reminderClose");
  if (reminderRepeatButtons) reminderRepeatButtons.setAttribute("aria-label", tr("reminderRepeatGroupLabel"));
  if (reminderRepeatButtons) {
    const once = reminderRepeatButtons.querySelector('button[data-repeat="none"]');
    const custom = reminderRepeatButtons.querySelector('button[data-repeat="custom"]');
    if (once) once.textContent = tr("reminderOnce");
    if (custom) custom.textContent = tr("reminderCustomDays");
  }
  if (reminderDayPicker) {
    reminderDayPicker.setAttribute("aria-label", tr("reminderDayPickerLabel"));
    const names = tr("reminderDaysShort");
    for (const label of reminderDayPicker.querySelectorAll("label")) {
      const input = label.querySelector("input");
      const day = input ? Number(input.value) : -1;
      const text = names[day] || "";
      for (const node of Array.from(label.childNodes)) {
        if (node.nodeType === 3) node.remove();
      }
      label.appendChild(document.createTextNode(text));
    }
  }
  updateReminderSaveButtonText();
  renderReminders(currentReminders);
}

function openReminderPanel() {
  document.body.dataset.reminderPanel = "1";
}

function applyReminderSettings(settings) {
  const showButtonOutside = !!(settings && settings.showButtonOutside);
  document.body.toggleAttribute("data-reminder-button", showButtonOutside);
}

function openReminderForm() {
  document.body.dataset.reminderForm = "1";
  if (reminderTimeInput && !reminderTimeInput.value) {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 10);
    reminderTimeInput.value = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }
  requestAnimationFrame(() => {
    if (reminderMessageInput) reminderMessageInput.focus();
  });
}

function closeReminderPanel() {
  delete document.body.dataset.reminderPanel;
  closeReminderForm();
}

function closeReminderForm() {
  delete document.body.dataset.reminderForm;
}

function clearReminderDaySelection() {
  if (!reminderDayPicker) return;
  for (const input of reminderDayPicker.querySelectorAll("input[type='checkbox']")) input.checked = false;
}

function setReminderDaySelection(days) {
  clearReminderDaySelection();
  if (!reminderDayPicker || !Array.isArray(days)) return;
  const selected = new Set(days.map((day) => Number(day)));
  for (const input of reminderDayPicker.querySelectorAll("input[type='checkbox']")) {
    input.checked = selected.has(Number(input.value));
  }
}

function resetReminderForm() {
  editingReminderId = null;
  updateReminderSaveButtonText();
  if (reminderTimeInput) reminderTimeInput.value = "";
  if (reminderMessageInput) reminderMessageInput.value = "";
  setReminderRepeat("none");
  clearReminderDaySelection();
  closeReminderForm();
}

function editReminder(reminder) {
  if (!reminder || !reminder.id) return;
  editingReminderId = reminder.id;
  document.body.dataset.reminderPanel = "1";
  document.body.dataset.reminderForm = "1";
  if (reminderTimeInput) reminderTimeInput.value = reminder.time || "";
  if (reminderMessageInput) reminderMessageInput.value = reminder.message || "";
  updateReminderSaveButtonText();
  setReminderRepeat(reminder.repeat === "custom" ? "custom" : "none");
  setReminderDaySelection(reminder.days);
  requestAnimationFrame(() => {
    if (reminderMessageInput) {
      reminderMessageInput.focus();
      reminderMessageInput.select();
    }
  });
}

function currentReminderTimeKey() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function isReminderVisuallyDisabled(reminder) {
  if (!reminder) return false;
  return reminder.repeat === "none" && String(reminder.time || "") < currentReminderTimeKey();
}

function renderReminders(reminders) {
  currentReminders = Array.isArray(reminders) ? reminders : [];
  if (!reminderListEl) return;
  reminderListEl.textContent = "";
  if (!currentReminders.length) {
    const empty = document.createElement("div");
    empty.className = "reminder-empty";
    empty.textContent = tr("reminderEmpty");
    reminderListEl.appendChild(empty);
    return;
  }
  for (const reminder of currentReminders.slice().sort((a, b) => String(a.time).localeCompare(String(b.time)))) {
    const item = document.createElement("div");
    item.className = `reminder-item${isReminderVisuallyDisabled(reminder) ? " is-disabled" : ""}`;

    const time = document.createElement("span");
    time.textContent = reminder.time || "--:--";

    const message = document.createElement("span");
    message.className = "reminder-message";
    message.textContent = reminder.message || "";
    message.title = reminder.message || "";

    const repeat = document.createElement("span");
    repeat.className = "reminder-repeat";
    const dayLabel = reminder.repeat === "custom" ? reminderDaysLabel(reminder.days) : "";
    repeat.textContent = dayLabel ? dayLabel : reminderRepeatLabel(reminder.repeat);

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = tr("reminderEdit");
    edit.addEventListener("click", () => editReminder(reminder));

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = tr("reminderDelete");
    remove.addEventListener("click", () => {
      window.electronAPI.reminderDelete(reminder.id).catch(() => {});
    });

    item.appendChild(time);
    item.appendChild(message);
    item.appendChild(repeat);
    item.appendChild(edit);
    item.appendChild(remove);
    reminderListEl.appendChild(item);
  }
}

if (reminderClockButton) {
  reminderClockButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (document.body.dataset.reminderPanel) closeReminderPanel();
    else openReminderPanel();
  });
}

if (reminderPanelClose) {
  reminderPanelClose.addEventListener("click", () => {
    closeReminderPanel();
    resetReminderForm();
  });
}

if (reminderAddButton) {
  reminderAddButton.addEventListener("click", () => {
    resetReminderForm();
    openReminderForm();
  });
}

if (reminderCancelButton) {
  reminderCancelButton.addEventListener("click", () => resetReminderForm());
}

if (reminderRepeatButtons) {
  reminderRepeatButtons.addEventListener("click", (event) => {
    const button = event.target && event.target.closest ? event.target.closest("button[data-repeat]") : null;
    if (!button) return;
    setReminderRepeat(button.dataset.repeat);
  });
  setReminderRepeat(reminderRepeatInput ? reminderRepeatInput.value : "none");
}

if (reminderForm && reminderTimeInput && reminderRepeatInput && reminderMessageInput) {
  reminderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = reminderMessageInput.value.trim();
    if (!reminderTimeInput.value || !message) return;
    const repeat = reminderRepeatInput.value;
    const days = repeat === "custom" ? selectedReminderDays() : [];
    if (repeat === "custom" && days.length === 0) return;
    const payload = {
      time: reminderTimeInput.value,
      message,
      repeat,
      days,
    };
    const result = editingReminderId
      ? await window.electronAPI.reminderUpdate({ ...payload, id: editingReminderId })
      : await window.electronAPI.reminderAdd(payload);
    if (result && result.ok) {
      resetReminderForm();
      renderReminders(await window.electronAPI.remindersGet());
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !document.body.dataset.reminderPanel) return;
  event.preventDefault();
  closeReminderPanel();
  resetReminderForm();
});

if (catNameEditor && catNameInput) {
  catNameEditor.addEventListener("submit", async (event) => {
    event.preventDefault();
    const settings = await window.electronAPI.catNameSet(catNameInput.value);
    applyCatNameSettings(settings);
    closeCatNameEditor();
  });
}

if (catNameCancel) {
  catNameCancel.addEventListener("click", () => closeCatNameEditor());
}

if (userNameEditor && userNameInput) {
  userNameEditor.addEventListener("submit", async (event) => {
    event.preventDefault();
    const settings = await window.electronAPI.userNameSet(userNameInput.value);
    applyUserNameSettings(settings);
    closeUserNameEditor();
    if (currentUserName) {
      playCompletionJump();
      playCompletionMeow();
      showSpeech(tr("userGreeting", currentUserName), { duration: 2200, kind: "notice" });
    }
  });
}

if (userNameCancel) {
  userNameCancel.addEventListener("click", () => closeUserNameEditor());
}

if (fixedMessageEditor && fixedMessageInput) {
  fixedMessageEditor.addEventListener("submit", async (event) => {
    event.preventDefault();
    const settings = await window.electronAPI.fixedMessageSet(fixedMessageInput.value);
    applyFixedMessageSettings(settings);
    closeFixedMessageEditor();
  });
}

if (fixedMessageCancel) {
  fixedMessageCancel.addEventListener("click", () => closeFixedMessageEditor());
}

if (pomodoroFocusEditor && pomodoroFocusInput) {
  pomodoroFocusEditor.addEventListener("submit", async (event) => {
    event.preventDefault();
    const min = Math.max(1, Math.min(180, Math.round(Number(pomodoroFocusInput.value) || 25)));
    const state = await window.electronAPI.pomodoroFocusSet(min);
    applyPomodoroState(state);
    closePomodoroFocusEditor();
  });
}

if (pomodoroFocusCancel) {
  pomodoroFocusCancel.addEventListener("click", () => closePomodoroFocusEditor());
}

if (shareDurationEditor && shareDurationInput) {
  shareDurationEditor.addEventListener("submit", (event) => {
    event.preventDefault();
    const durationSec = Math.max(5, Math.min(30, Math.round(Number(shareDurationInput.value) || 5)));
    closeShareDurationEditor();
    startShareRecording(durationSec);
  });
}

if (shareDurationCancel) {
  shareDurationCancel.addEventListener("click", () => closeShareDurationEditor());
}

window.electronAPI.catNameGet().then(applyCatNameSettings).catch(() => {});
window.electronAPI.onCatNameChanged(applyCatNameSettings);
window.electronAPI.userNameGet().then(applyUserNameSettings).catch(() => {});
window.electronAPI.onUserNameChanged(applyUserNameSettings);
window.electronAPI.onUserNameEdit((name) => openUserNameEditor(name));
window.electronAPI.onCatNameEdit((name) => openCatNameEditor(name));
window.electronAPI.fixedMessageGet().then(applyFixedMessageSettings).catch(() => {});
window.electronAPI.onFixedMessageChanged(applyFixedMessageSettings);
window.electronAPI.onFixedMessageEdit((message) => openFixedMessageEditor(message));
window.electronAPI.onPomodoroFocusEdit((min) => openPomodoroFocusEditor(min));
applyReminderI18n();
window.electronAPI.remindersGet().then(renderReminders).catch(() => {});
setInterval(() => renderReminders(currentReminders), 30 * 1000);
window.electronAPI.onRemindersChanged(renderReminders);
window.electronAPI.onReminderSettingsChanged(applyReminderSettings);
window.electronAPI.onReminderPanelOpen(() => {
  openReminderPanel();
});
window.electronAPI.onReminderTriggered((payload) => {
  const text = payload && typeof payload.text === "string" ? payload.text.trim() : "";
  if (text) {
    playReminderMeow();
    playReminderJumpSequence();
    showSpeech(text, { duration: 5200, kind: "reminder" });
  }
});

function updateCtaText(state) {
  if (!state) return "";
  if (state.state === "checking") return tr("updateChecking");
  if (state.state === "available") return tr("updateAvailable");
  if (state.state === "none") return tr("updateNone");
  if (state.state === "downloading") return tr("updateDownloading", state.percent ?? null);
  if (state.state === "restarting") return tr("updateRestarting");
  return "";
}

function renderUpdateCta() {
  if (!catSpeechBubble || !updateCtaState) return false;
  const text = updateCtaText(updateCtaState);
  if (!text) return false;

  catSpeechBubble.textContent = "";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "update-cta-button";
  button.textContent = text;
  button.disabled = updateCtaState.state === "checking" || updateCtaState.state === "none" || updateCtaState.state === "downloading";
  const keepUpdateCtaClickable = () => setPetMouseEventsEnabled(true);
  const keepUpdateCtaPointer = (event) => {
    keepUpdateCtaClickable();
    event.stopPropagation();
  };
  const pressUpdateCtaButton = () => {
    button.classList.add("is-pressed");
    setTimeout(() => {
      button.classList.remove("is-pressed");
    }, 160);
  };
  catSpeechBubble.addEventListener("pointerenter", keepUpdateCtaClickable, { once: true });
  catSpeechBubble.addEventListener("pointermove", keepUpdateCtaClickable, { once: true });
  catSpeechBubble.addEventListener("mouseenter", keepUpdateCtaClickable, { once: true });
  button.addEventListener("mouseenter", keepUpdateCtaClickable);
  button.addEventListener("mousemove", keepUpdateCtaClickable);
  button.addEventListener("pointerenter", keepUpdateCtaClickable);
  button.addEventListener("pointermove", keepUpdateCtaClickable);
  button.addEventListener("pointerdown", (event) => {
    keepUpdateCtaPointer(event);
    pressUpdateCtaButton();
  });
  button.addEventListener("mousedown", keepUpdateCtaPointer);
  button.addEventListener("click", () => {
    if (updateCtaState.state === "available") {
      pressUpdateCtaButton();
      updateCtaState = { ...updateCtaState, state: "downloading", percent: null };
      renderUpdateCta();
      window.electronAPI.updateDownload().catch(() => {});
    }
  });
  catSpeechBubble.appendChild(button);
  catSpeechBubble.setAttribute("aria-label", text);
  document.body.dataset.speech = "update";
  keepUpdateCtaClickable();
  return true;
}

function createPomodoroIcon(kind) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "pomodoro-icon");
  svg.setAttribute("viewBox", "0 0 12 12");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const addRect = (x, y, width, height) => {
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(width));
    rect.setAttribute("height", String(height));
    rect.setAttribute("fill", "currentColor");
    svg.appendChild(rect);
  };

  if (kind === "pause") {
    addRect(3, 2, 2, 8);
    addRect(7, 2, 2, 8);
  } else if (kind === "play") {
    addRect(3, 2, 2, 8);
    addRect(5, 3, 2, 6);
    addRect(7, 4, 2, 4);
    addRect(9, 5, 1, 2);
  } else {
    addRect(3, 3, 2, 2);
    addRect(7, 3, 2, 2);
    addRect(5, 5, 2, 2);
    addRect(3, 7, 2, 2);
    addRect(7, 7, 2, 2);
  }

  return svg;
}

function renderPomodoroTimerSpeech(speech) {
  if (!catSpeechBubble || !speech || speech.kind !== "timer" || !currentPomodoroState || !currentPomodoroState.visible) {
    return false;
  }

  catSpeechBubble.textContent = "";
  const text = document.createElement("span");
  text.className = "pomodoro-timer-text";
  text.textContent = speech.text;
  catSpeechBubble.appendChild(text);

  const controls = document.createElement("span");
  controls.className = "pomodoro-controls";

  const pauseButton = document.createElement("button");
  pauseButton.type = "button";
  pauseButton.className = "pomodoro-control";
  pauseButton.appendChild(createPomodoroIcon(currentPomodoroState.running ? "pause" : "play"));
  pauseButton.title = currentPomodoroState.running ? tr("pomodoroPause") : tr("pomodoroResume");
  pauseButton.setAttribute("aria-label", pauseButton.title);
  pauseButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const action = currentPomodoroState && currentPomodoroState.running ?
      window.electronAPI.pomodoroPause() :
      window.electronAPI.pomodoroStart();
    action.then(applyPomodoroState).catch(() => {});
  });
  controls.appendChild(pauseButton);

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.className = "pomodoro-control";
  resetButton.appendChild(createPomodoroIcon("reset"));
  resetButton.title = tr("pomodoroReset");
  resetButton.setAttribute("aria-label", resetButton.title);
  resetButton.addEventListener("click", (event) => {
    event.stopPropagation();
    window.electronAPI.pomodoroReset().then(applyPomodoroState).catch(() => {});
  });
  controls.appendChild(resetButton);

  catSpeechBubble.appendChild(controls);
  catSpeechBubble.setAttribute("aria-label", speech.text);
  document.body.dataset.speech = "timer";
  return true;
}

function resetSpeechBubbleOverflow() {
  document.body.style.removeProperty("--bubble-overflow-y");
}

function scheduleSpeechBubbleLayout() {
  if (!catSpeechBubble) return;
  if (speechLayoutRaf) cancelAnimationFrame(speechLayoutRaf);
  speechLayoutRaf = requestAnimationFrame(() => {
    speechLayoutRaf = null;
    if (!document.body.dataset.speech || catSpeechBubble.offsetParent === null) {
      resetSpeechBubbleOverflow();
      return;
    }
    resetSpeechBubbleOverflow();
    const top = catSpeechBubble.getBoundingClientRect().top;
    const minTop = 4;
    if (top < minTop) {
      document.body.style.setProperty("--bubble-overflow-y", `${Math.ceil(minTop - top)}px`);
    }
  });
}

function renderSpeech(speech) {
  if (!catSpeechBubble) return;
  if (activeSpeechKind === "reminder" && (!speech || speech.kind !== "reminder")) return;
  if (renderUpdateCta()) {
    resetSpeechBubbleOverflow();
    return;
  }
  if (!speech || !speech.text) {
    catSpeechBubble.textContent = "";
    catSpeechBubble.removeAttribute("aria-label");
    delete document.body.dataset.speech;
    resetSpeechBubbleOverflow();
    return;
  }
  if (!renderPomodoroTimerSpeech(speech)) {
    catSpeechBubble.textContent = speech.kind === "thinking" ? "" : speech.text;
    catSpeechBubble.setAttribute("aria-label", speech.text);
    document.body.dataset.speech = speech.kind || "notice";
  }
  scheduleSpeechBubbleLayout();
}

window.electronAPI.onUpdateState((state) => {
  if (!state || state.state === "idle") updateCtaState = null;
  else updateCtaState = state;
  renderSpeech(baseSpeech);
  if (state && state.state === "none") {
    setTimeout(() => {
      if (!updateCtaState || updateCtaState.state !== "none") return;
      updateCtaState = null;
      renderSpeech(baseSpeech);
    }, 3000);
  }
});

function clearSpeech() {
  if (activeSpeechKind === "reminder") return;
  if (speechTimer) {
    clearTimeout(speechTimer);
    speechTimer = null;
  }
  activeSpeechKind = null;
  renderSpeech(baseSpeech);
}

function showSpeech(text, { duration = 1800, kind = "notice" } = {}) {
  if (activeSpeechKind === "reminder" && kind !== "reminder") return;
  if (speechTimer) clearTimeout(speechTimer);
  activeSpeechKind = kind;
  delete document.body.dataset.speech;
  void document.body.offsetWidth;
  renderSpeech({ text, kind });
  speechTimer = setTimeout(() => {
    speechTimer = null;
    activeSpeechKind = null;
    renderSpeech(baseSpeech);
  }, duration);
}

function setBaseSpeech(text, kind = "timer") {
  baseSpeech = text ? { text, kind } : null;
  if (!speechTimer) renderSpeech(baseSpeech);
}

function setThinkingDotsVisible(visible) {
  document.body.toggleAttribute("data-thinking", !!visible);
  if (catThinkingDots) catThinkingDots.setAttribute("aria-hidden", visible ? "false" : "true");
}

function clearAiTaskStaleTimer() {
  if (!aiTaskStaleTimer) return;
  clearTimeout(aiTaskStaleTimer);
  aiTaskStaleTimer = null;
}

let lastMeowAt = 0;
const MEOW_COOLDOWN_MS = 500;

function playCompletionMeow() {
  if (completionMeowVolume <= 0) return;
  const now = Date.now();
  if (now - lastMeowAt < MEOW_COOLDOWN_MS) return;
  lastMeowAt = now;
  completionMeow.volume = completionMeowVolume;
  completionMeow.currentTime = 0;
  completionMeow.play().catch(() => {});
}

function getReminderMeowVolume() {
  return Math.max(0, Math.min(1, completionMeowVolume * reminderMeowVolumeBoost));
}

function playReminderMeow(options = {}) {
  if (completionMeowVolume <= 0) return;
  const repeat = Math.max(1, Math.min(3, Math.round(Number(options.repeat) || 3)));
  const play = () => {
    reminderMeow.volume = getReminderMeowVolume();
    reminderMeow.currentTime = 0;
    reminderMeow.play().catch(() => {});
  };
  play();
  if (repeat >= 2) setTimeout(play, 1500);
  if (repeat >= 3) setTimeout(play, 3000);
}

function playAiComplete() {
  setThinkingDotsVisible(false);
  playCompletionJump();
  playCompletionMeow();
  showSpeech(tr("agentComplete"), { kind: "complete" });
}

function playAiNotification() {
  setThinkingDotsVisible(false);
  playReminderAlertOnce();
  showSpeech(tr("needsAttention", currentUserName), { duration: 5200, kind: "reminder" });
}

function formatPomodoroTime(totalSec) {
  const sec = Math.max(0, Math.floor(Number(totalSec) || 0));
  const min = Math.floor(sec / 60);
  const rest = sec % 60;
  return `${String(min).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function applyPomodoroState(state) {
  currentPomodoroState = state || null;
  if (!state || !state.visible) {
    currentPomodoroState = null;
    delete document.body.dataset.pomodoro;
    delete document.body.dataset.pomodoroMode;
    delete document.body.dataset.pomodoroPaused;
    if (speechTimer && activeSpeechKind !== "reminder") {
      clearTimeout(speechTimer);
      speechTimer = null;
      activeSpeechKind = null;
    }
    refreshBaseSpeech();
    return;
  }
  const mode = state.mode === "rest" ? "rest" : "focus";
  currentPomodoroState = state;
  document.body.dataset.pomodoro = "1";
  document.body.dataset.pomodoroMode = mode;
  document.body.toggleAttribute("data-pomodoro-paused", !state.running);
  refreshBaseSpeech();
}

function applyAiTaskState(event) {
  const state = event && typeof event.state === "string" ? event.state : "";
  const active = state === "thinking" || state === "working";
  setThinkingDotsVisible(active);
  clearAiTaskStaleTimer();
  if (active && event && event.agentId === "antigravity") {
    aiTaskStaleTimer = setTimeout(() => {
      aiTaskStaleTimer = null;
      setThinkingDotsVisible(false);
    }, 3000);
  }
}

window.electronAPI.onAiTaskComplete(playAiComplete);
window.electronAPI.onDoJump(playCompletionJump);
window.electronAPI.onAiTaskState(applyAiTaskState);
window.electronAPI.onAiTaskNotification(playAiNotification);
function applyTaskCompleteSoundVolume(volume) {
  completionMeowVolume = Math.max(0, Math.min(1, Number(volume) || 0));
  completionMeow.volume = completionMeowVolume;
  reminderMeow.volume = getReminderMeowVolume();
}
window.electronAPI.taskCompleteSoundVolumeGet().then(applyTaskCompleteSoundVolume).catch(() => {});
window.electronAPI.onTaskCompleteSoundVolume(applyTaskCompleteSoundVolume);
window.electronAPI.pomodoroGet().then(applyPomodoroState).catch(() => {});
window.electronAPI.onPomodoroState(applyPomodoroState);
window.electronAPI.onPomodoroComplete((event) => {
  const isBreakStart = event && event.completedMode === "focus";
  const text = isBreakStart ? tr("startBreak", currentUserName) : tr("startFocus", currentUserName);
  showSpeech(text, { kind: isBreakStart ? "break" : "focus" });
});
window.electronAPI.languageGet().then((language) => {
  currentLanguage = normalizeLanguage(language);
  applyReminderI18n();
  applyPomodoroState(currentPomodoroState);
}).catch(() => {});
window.electronAPI.onLanguageChanged((language) => {
  currentLanguage = normalizeLanguage(language);
  applyReminderI18n();
  applyPomodoroState(currentPomodoroState);
});

// ── Share recording: current desktop crop + Catjang name → vertical video ──
let shareRecording = false;
let shareCancelRequested = false;
let activeShareRecorder = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function preferredRecordingMime() {
  const candidates = [
    "video/mp4;codecs=h264",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return "";
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime)) || "";
}

function blobToUint8Array(blob) {
  return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
}

function isSharePermissionError(error) {
  const name = error && error.name ? String(error.name) : "";
  const message = error && error.message ? String(error.message) : "";
  return name === "NotAllowedError" ||
    name === "SecurityError" ||
    /permission|not allowed|denied|No desktop capture source/i.test(message);
}

function isWindowsRuntime() {
  return /Windows/i.test(navigator.userAgent || navigator.platform || "");
}

function shareFailureMessage(error) {
  if (isSharePermissionError(error)) return tr(isWindowsRuntime() ? "sharePermissionFailedWindows" : "sharePermissionFailed");
  if (error && /conversion-failed|ffmpeg|MP4/i.test(String(error.message || ""))) {
    return tr("shareConversionFailed");
  }
  return tr("shareRecordingFailed");
}

async function startShareRecording(durationSec = 5) {
  if (shareRecording) return;
  shareRecording = true;
  shareCancelRequested = false;
  const durationMs = Math.max(5000, Math.min(30000, Math.round(Number(durationSec) || 5) * 1000));

  const catName = currentCatName || "Catjang";

  if (shareNameBadge) shareNameBadge.textContent = catName;
  document.body.dataset.sharing = "1";

  let desktopStream = null;

  try {
    await sleep(250);
    const options = await window.electronAPI.shareCaptureOptions({ durationMs });
    if (!options || !options.sourceId) throw new Error("No desktop capture source.");

    desktopStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: options.sourceId,
          maxFrameRate: 30,
        },
      },
    });

    const video = document.createElement("video");
    video.muted = true;
    video.srcObject = desktopStream;
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });
    await video.play();

    const scaleX = video.videoWidth / options.displayBounds.width;
    const scaleY = video.videoHeight / options.displayBounds.height;
    const cropX = Math.max(0, Math.min(video.videoWidth - 2, options.crop.x * scaleX));
    const cropY = Math.max(0, Math.min(video.videoHeight - 2, options.crop.y * scaleY));
    const crop = {
      x: cropX,
      y: cropY,
      width: Math.min(options.crop.width * scaleX, video.videoWidth - cropX),
      height: Math.min(options.crop.height * scaleY, video.videoHeight - cropY),
    };

    const mimeType = preferredRecordingMime();
    const recorderOptions = {
      videoBitsPerSecond: 24_000_000,
    };
    if (mimeType) recorderOptions.mimeType = mimeType;
    const recorder = new MediaRecorder(desktopStream, recorderOptions);
    activeShareRecorder = recorder;
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };

    const stopped = new Promise((resolve) => {
      recorder.onstop = resolve;
    });
    recorder.start();
    await window.electronAPI.shareCaptureStarted().catch(() => {});
    await sleep(options.durationMs || durationMs);
    if (recorder.state !== "inactive") recorder.stop();
    await stopped;
    await window.electronAPI.shareCaptureOverlayHide().catch(() => {});
    if (shareCancelRequested) return;

    const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" });
    const bytes = await blobToUint8Array(blob);
    const extension = (blob.type || "").includes("mp4") ? "mp4" : "webm";
    const result = await window.electronAPI.shareVideoSave({
      bytes,
      extension,
      crop,
      scale: { x: scaleX, y: scaleY },
      source: { width: video.videoWidth, height: video.videoHeight },
      output: options.output,
    });
    if (result && result.ok === false && !result.canceled) {
      throw new Error(result.reason || "share-save-failed");
    }
  } catch (error) {
    console.error("Share recording failed:", error);
    await window.electronAPI.shareErrorDialog(shareFailureMessage(error)).catch(() => {
      window.alert(shareFailureMessage(error));
    });
  } finally {
    await window.electronAPI.shareCaptureOverlayHide().catch(() => {});
    if (desktopStream) desktopStream.getTracks().forEach((track) => track.stop());
    delete document.body.dataset.sharing;
    activeShareRecorder = null;
    shareCancelRequested = false;
    shareRecording = false;
  }
}

window.electronAPI.onShareRecord(() => openShareDurationEditor());
window.electronAPI.onShareCaptureCancel(() => {
  shareCancelRequested = true;
  if (activeShareRecorder && activeShareRecorder.state !== "inactive") {
    activeShareRecorder.stop();
  }
});

// ── Drag (좌클릭) + Context menu (우클릭) ──

const dragHandle = document.getElementById("drag-handle");
const pettingHandle = document.getElementById("petting-handle");
const stretchEndObj = document.getElementById("stretch-svg-end");
let dragging = false;
let lastX = 0;
let lastY = 0;
let dragStartScreenY = 0;
let stretchT = 0;
let stretchTVel = 0;
let dragHoldStartAt = 0;
let pendulumAngle = 0, pendulumVelAngle = 0;
let prevDragDx = 0;  // previous frame's dx — impulse comes from change in velocity, not velocity
let lastWiggleDx = 0; // drag delta fed into per-segment wiggle; zeroed on mouseup
let lagX = 0, lagVelX = 0;
let lagY = 0, lagVelY = 0;
let pendingDrag = null;
let purrStopTimer = null;
let purrPlayPromise = null;
let purrWanted = false;
let huntingTimer = null;
let huntingReturnTimer = null;
let lastCursorSample = null;
let shakeEnergy = 0;

const MAX_UP_OFFSET = 140;
const N_SEG = 16;
const DRAG_START_THRESHOLD_PX = 4;
const PURR_IDLE_TIMEOUT_MS = 420;
const PURR_LEAVE_GRACE_MS = 260;
const SHAKE_SPEED_THRESHOLD = 11.2;
const SHAKE_TRIGGER_ENERGY = 2.34;
const SHAKE_ENERGY_DECAY = 0.82;
const HUNTING_DURATION_MS = 1100;
const HUNTING_RETURN_DURATION_MS = 420;

let nativeShapeRaf = null;
let nativeShapeObserversStarted = false;
let nativeDragStateActive = false;

function scheduleNativeWindowShapeUpdate() {
  if (!windowShapeSupported || nativeShapeRaf !== null) return;
  nativeShapeRaf = requestAnimationFrame(() => {
    nativeShapeRaf = null;
    const selectors = [
      "#drag-handle", "#share-name-badge", "#cat-speech-bubble", "#cat-thinking-dots",
      "#reminder-clock-button", "#reminder-panel", "#cat-name-editor", "#user-name-editor",
      "#fixed-message-editor", "#pomodoro-focus-editor", "#share-duration-editor", "#cat",
      "#purr-hearts", "#heat-steam", "#press-left", "#press-right", "#scroll-unroll",
      "#jump-start", "#jump-ing", "#stretch-svg-end", "#stretch-pose-default",
    ];
    const rects = [];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      const padding = selector === "#purr-hearts" || selector === "#heat-steam" ? 40 : 8;
      rects.push({
        x: Math.floor(rect.left - padding),
        y: Math.floor(rect.top - padding),
        width: Math.ceil(rect.width + padding * 2),
        height: Math.ceil(rect.height + padding * 2),
      });
    }
    window.electronAPI.setWindowShape(rects);
  });
}

function startNativeWindowShapeObservers() {
  if (nativeShapeObserversStarted) return;
  nativeShapeObserversStarted = true;
  new MutationObserver(scheduleNativeWindowShapeUpdate).observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
  });
  const resizeObserver = new ResizeObserver(scheduleNativeWindowShapeUpdate);
  resizeObserver.observe(document.documentElement);
  for (const element of document.body.children) resizeObserver.observe(element);
  scheduleNativeWindowShapeUpdate();
}

window.electronAPI.windowCapabilities().then((capabilities) => {
  windowBackend = capabilities && capabilities.backend === "wayland" ? "wayland" : "x11";
  windowShapeSupported = !!(capabilities && capabilities.supportsWindowShape);
  document.body.dataset.windowBackend = windowBackend;
  if (windowShapeSupported) {
    setPetMouseEventsEnabled(true);
    startNativeWindowShapeObservers();
  } else if (windowBackend === "wayland") {
    setPetMouseEventsEnabled(true);
  } else {
    requestAnimationFrame(() => setPetMouseEventsEnabled(false));
  }
}).catch(() => {
  windowBackend = "x11";
  windowShapeSupported = false;
  document.body.dataset.windowBackend = windowBackend;
  requestAnimationFrame(() => setPetMouseEventsEnabled(false));
});

window.electronAPI.onNativeWindowDragState((active) => {
  if (windowBackend !== "wayland") return;
  const next = !!active;
  document.body.classList.toggle("native-dragging", next);
  if (next === nativeDragStateActive) return;
  nativeDragStateActive = next;
  if (next) {
    clearPendingDrag();
    beginDragStretch(
      { screenX: 0, screenY: 0 },
      { screenX: 0, screenY: 0 },
    );
  } else {
    finishDragStretch(false);
  }
});

function setPetMouseEventsEnabled(enabled) {
  const next = windowShapeSupported ? true : !!enabled;
  if (mouseEventsEnabled === next) return;
  mouseEventsEnabled = next;
  window.electronAPI.setMouseEventsEnabled(next);
}

function rectContains(rect, x, y) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function pointInEllipse(nx, ny, cx, cy, rx, ry) {
  const dx = (nx - cx) / rx;
  const dy = (ny - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

function normalizedPointInElement(el, x, y) {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || !rectContains(rect, x, y)) return null;
  return {
    nx: (x - rect.left) / rect.width,
    ny: (y - rect.top) / rect.height,
  };
}

function isIdlePoseInteractive() {
  return !dragging &&
    !pendingDrag &&
    !releasing &&
    !isStretching() &&
    !document.body.dataset.press &&
    !document.body.dataset.scroll &&
    !document.body.dataset.jump &&
    !document.body.dataset.hunting &&
    !document.body.dataset.huntingReturn;
}

function isIdleHeadPoint(x, y) {
  if (!isIdlePoseInteractive()) return false;
  const point = normalizedPointInElement(obj, x, y);
  if (!point) return false;
  return pointInEllipse(point.nx, point.ny, 0.40, 0.33, 0.25, 0.23);
}

function idleSvgRoot() {
  const doc = obj && obj.contentDocument;
  return doc && doc.documentElement ? doc.documentElement : null;
}

function setIdleSvgClass(className, active) {
  const root = idleSvgRoot();
  if (root) root.classList.toggle(className, !!active);
}

function canShowHuntingPose() {
  return !dragging &&
    !pendingDrag &&
    !releasing &&
    !isStretching() &&
    !document.body.dataset.press &&
    !document.body.dataset.scroll &&
    !document.body.dataset.jump &&
    !document.body.dataset.huntingReturn;
}

function startHuntingPose() {
  if (!canShowHuntingPose()) return;
  stopPurring();
  clearTimeout(huntingReturnTimer);
  huntingReturnTimer = null;
  delete document.body.dataset.huntingReturn;
  setIdleSvgClass("hunting-return", false);
  window.electronAPI.setHuntingMode(true);
  setIdleSvgClass("hunting", true);
  document.body.dataset.hunting = "1";
  clearTimeout(huntingTimer);
  huntingTimer = setTimeout(stopHuntingPose, HUNTING_DURATION_MS);
}

function stopHuntingPose() {
  const wasHunting = !!document.body.dataset.hunting;
  setIdleSvgClass("hunting", false);
  delete document.body.dataset.hunting;
  if (wasHunting) window.electronAPI.setHuntingMode(false);
  clearTimeout(huntingTimer);
  huntingTimer = null;
  if (wasHunting) {
    setIdleSvgClass("hunting-return", true);
    document.body.dataset.huntingReturn = "1";
    clearTimeout(huntingReturnTimer);
    huntingReturnTimer = setTimeout(() => {
      setIdleSvgClass("hunting-return", false);
      delete document.body.dataset.huntingReturn;
      huntingReturnTimer = null;
    }, HUNTING_RETURN_DURATION_MS);
  }
}

function setPurrFaceOffset(x, y) {
  const root = idleSvgRoot();
  if (!root) return;
  root.style.setProperty("--purr-face-x", `${x.toFixed(2)}px`);
  root.style.setProperty("--purr-face-y", `${y.toFixed(2)}px`);
}

function purrFaceOffsetForPoint(x, y) {
  const point = normalizedPointInElement(obj, x, y);
  if (!point) return { x: 0, y: 0 };
  const dx = Math.max(-1, Math.min(1, (point.nx - 0.40) / 0.25));
  const dy = Math.max(-1, Math.min(1, (point.ny - 0.33) / 0.23));
  return {
    x: dx * 1.15,
    y: dy * 0.75,
  };
}

function startPurring(clientX, clientY) {
  if (!isIdlePoseInteractive()) return;
  const offset = purrFaceOffsetForPoint(clientX, clientY);
  setPurrFaceOffset(offset.x, offset.y);
  setIdleSvgClass("purring", true);
  document.body.dataset.purring = "1";
  purrWanted = true;
  if (purringSound.paused && !purrPlayPromise) {
    purringSound.currentTime = 0;
    purrPlayPromise = purringSound.play()
      .then(() => {
        purrPlayPromise = null;
        if (!purrWanted) stopPurring();
      })
      .catch(() => {
        purrPlayPromise = null;
      });
  }
  scheduleStopPurring(PURR_IDLE_TIMEOUT_MS);
}

function scheduleStopPurring(delayMs) {
  clearTimeout(purrStopTimer);
  purrStopTimer = setTimeout(stopPurring, delayMs);
}

function stopPurring() {
  purrWanted = false;
  setIdleSvgClass("purring", false);
  delete document.body.dataset.purring;
  setPurrFaceOffset(0, 0);
  clearTimeout(purrStopTimer);
  purrStopTimer = null;
  purringSound.pause();
  purringSound.currentTime = 0;
}

function currentPoseElement() {
  if (document.body.classList.contains("dragging")) {
    ensureSvgObjectReady("stretch-svg-end");
    return stretchEndObj;
  }
  if (document.body.dataset.stretching) {
    ensureSvgObjectReady("stretch-pose-default");
    return document.getElementById("stretch-pose-default");
  }
  if (document.body.dataset.hunting) {
    ensureSvgObjectReady("cat");
    return document.getElementById("cat");
  }
  if (document.body.dataset.jump === "start") {
    ensureSvgObjectReady("jump-start");
    return document.getElementById("jump-start");
  }
  if (document.body.dataset.jump === "ing") {
    ensureSvgObjectReady("jump-ing");
    return document.getElementById("jump-ing");
  }
  if (document.body.dataset.scroll) {
    ensureSvgObjectReady("scroll-unroll");
    return document.getElementById("scroll-unroll");
  }
  if (document.body.dataset.press === "left") {
    ensureSvgObjectReady("press-left");
    return document.getElementById("press-left");
  }
  if (document.body.dataset.press === "right") {
    ensureSvgObjectReady("press-right");
    return document.getElementById("press-right");
  }
  ensureSvgObjectReady("cat");
  return obj;
}

function isCatHitPoint(x, y) {
  const pose = currentPoseElement();
  if (!pose) return false;
  const rect = pose.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || !rectContains(rect, x, y)) return false;

  const nx = (x - rect.left) / rect.width;
  const ny = (y - rect.top) / rect.height;

  if (pose === stretchEndObj) {
    return pointInEllipse(nx, ny, 0.5, 0.2, 0.2, 0.14) ||
      pointInEllipse(nx, ny, 0.5, 0.52, 0.18, 0.38);
  }

  return pointInEllipse(nx, ny, 0.4, 0.3, 0.24, 0.22) ||
    pointInEllipse(nx, ny, 0.55, 0.62, 0.3, 0.3) ||
    (nx >= 0.28 && nx <= 0.72 && ny >= 0.3 && ny <= 0.78);
}

function shouldReceiveMouseAt(x, y) {
  if (dragging) return true;
  if (catNameEditor && getComputedStyle(catNameEditor).display !== "none" && rectContains(catNameEditor.getBoundingClientRect(), x, y)) {
    return true;
  }
  if (userNameEditor && getComputedStyle(userNameEditor).display !== "none" && rectContains(userNameEditor.getBoundingClientRect(), x, y)) {
    return true;
  }
  if (fixedMessageEditor && getComputedStyle(fixedMessageEditor).display !== "none" && rectContains(fixedMessageEditor.getBoundingClientRect(), x, y)) {
    return true;
  }
  if (pomodoroFocusEditor && getComputedStyle(pomodoroFocusEditor).display !== "none" && rectContains(pomodoroFocusEditor.getBoundingClientRect(), x, y)) {
    return true;
  }
  if (shareDurationEditor && getComputedStyle(shareDurationEditor).display !== "none" && rectContains(shareDurationEditor.getBoundingClientRect(), x, y)) {
    return true;
  }
  if (reminderClockButton && getComputedStyle(reminderClockButton).display !== "none" && rectContains(reminderClockButton.getBoundingClientRect(), x, y)) {
    return true;
  }
  if (reminderPanel && getComputedStyle(reminderPanel).display !== "none" && rectContains(reminderPanel.getBoundingClientRect(), x, y)) {
    return true;
  }
  if (catSpeechBubble && getComputedStyle(catSpeechBubble).display !== "none" && rectContains(catSpeechBubble.getBoundingClientRect(), x, y)) {
    return true;
  }
  return isCatHitPoint(x, y);
}

function updateMouseEventPassthrough(event) {
  if (!event) {
    setPetMouseEventsEnabled(false);
    return;
  }
  setPetMouseEventsEnabled(shouldReceiveMouseAt(event.clientX, event.clientY));
}

function updatePolledMouseEventPassthrough(dx, dy) {
  if (windowBackend !== "x11" || dragging) return;
  const clientX = Number(dx) + window.innerWidth / 2;
  const clientY = Number(dy) + window.innerHeight / 2;
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
  setPetMouseEventsEnabled(shouldReceiveMouseAt(clientX, clientY));
  updatePurringAtPoint(clientX, clientY, true);
}

// ── stretch-svg 자동 segment 분할 + 체인 wrapper 구축 ──
const dxState = new Array(N_SEG).fill(0);
const velState = new Array(N_SEG).fill(0);
let endData = null;
const startYsByIdx = []; // start.svg 각 rect의 y 좌표 (idx 매칭)
const startHsByIdx = []; // height (start.svg h=3, end.svg h=6/9 → lerp)
const startXsByIdx = []; // x 좌표 (start.svg와 end.svg가 다를 수 있음)
const startWsByIdx = []; // width (마찬가지)
let pendingEndDoc = null;
let tailStartY = null; // stretch-start.svg의 #tail-path 시작 y (path data에서 파싱)

function parseFirstMy(d) {
  const m = (d || "").match(/M\s*(-?\d+(?:\.\d+)?)[\s,]+(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[2]) : null;
}

function parseRectY(r) {
  if (r.hasAttribute("y")) return parseFloat(r.getAttribute("y") || 0);
  const t = r.getAttribute("transform") || "";
  const m = t.match(/translate\(\s*[\d.\-]+(?:[\s,]+([\d.\-]+))?\s*\)/);
  return m && m[1] !== undefined ? parseFloat(m[1]) : 0;
}

function parseRectH(r) {
  return parseFloat(r.getAttribute("height") || "0");
}

function parseRectX(r) {
  if (r.hasAttribute("x")) return parseFloat(r.getAttribute("x") || 0);
  const t = r.getAttribute("transform") || "";
  const m = t.match(/translate\(\s*([-\d.]+)/);
  return m && m[1] !== undefined ? parseFloat(m[1]) : 0;
}

function parseRectW(r) {
  return parseFloat(r.getAttribute("width") || "0");
}

function setRectXY(rect, x, y, useTransform) {
  if (useTransform) {
    rect.setAttribute("transform", `translate(${x} ${y})`);
  } else {
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
  }
}

function isStretchBaseRect(rect) {
  return !rect.classList.contains("heat-overlay") &&
    !rect.closest(".heat-overlay") &&
    !rect.closest(".patches") &&
    !rect.closest("defs") &&
    !rect.closest("clipPath");
}

// start.svg는 fetch로 텍스트 받아서 파싱 (rect y 좌표 추출 전용 — 화면에 안 띄움)
fetch("../svg/stretch-start.svg")
  .then((r) => r.text())
  .then((text) => {
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    // end.svg의 setupStretchChain과 같은 필터 — defs/clipPath/.patches 안의 rect 제외
    const rects = Array.from(doc.querySelectorAll("rect")).filter(isStretchBaseRect);
    startYsByIdx.length = 0;
    startHsByIdx.length = 0;
    startXsByIdx.length = 0;
    startWsByIdx.length = 0;
    rects.forEach((r, idx) => {
      startYsByIdx[idx] = parseRectY(r);
      startHsByIdx[idx] = parseRectH(r);
      startXsByIdx[idx] = parseRectX(r);
      startWsByIdx[idx] = parseRectW(r);
    });
    const startTail = doc.getElementById("tail-path");
    if (startTail) tailStartY = parseFirstMy(startTail.getAttribute("d"));
    if (pendingEndDoc) {
      endData = setupStretchChain(pendingEndDoc);
      pendingEndDoc = null;
      applyStretchChain();
      if (dragging || releasing) startChain();
    }
  })
  .catch((err) => console.error("Failed to load stretch-start.svg:", err));

stretchEndObj.addEventListener("load", () => {
  const doc = stretchEndObj.contentDocument;
  if (!doc) return;
  registerSvgDoc(doc, "stretch-end");
  if (startYsByIdx.length === 0) {
    pendingEndDoc = doc;
    return;
  }
  endData = setupStretchChain(doc);
  applyStretchChain();
  if (dragging || releasing) startChain();
});

function setupStretchChain(svgDoc) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = svgDoc.documentElement;
  // viewBox를 좌우로 20씩, 위/아래로 2씩 확장
  // → segment가 좌우로 흔들려도, 외곽선 dilate가 위/아래로 나가도 잘리지 않음
  svg.setAttribute("viewBox", "-20 -2 80 148");
  svg.setAttribute("width", "80");
  svg.setAttribute("preserveAspectRatio", "xMidYMin meet");
  // patch rect / defs(clipPath 안)의 rect는 stretch chain 분류에서 제외 —
  // 이들이 잡히면 body rect 인덱스가 밀려 start.svg와 startYsByIdx 매칭이 깨짐.
  // (예: stretch-end.svg의 body-clip은 16개 rect를 가져 인덱스가 16칸 밀림)
  const allRects = Array.from(svg.querySelectorAll("rect")).filter(isStretchBaseRect);

  // rect의 (x, y, w, h)와 transform 사용 여부 추출 — 인덱스도 함께 (start.svg와 매칭용)
  const rectInfo = allRects.map((r, idx) => {
    let x = 0, y = 0, useTransform = false;
    if (r.hasAttribute("y") || r.hasAttribute("x")) {
      x = parseFloat(r.getAttribute("x") || 0);
      y = parseFloat(r.getAttribute("y") || 0);
    } else {
      const t = r.getAttribute("transform") || "";
      const m = t.match(/translate\(\s*([\d.\-]+)(?:[\s,]+([\d.\-]+))?\s*\)/);
      if (m) { x = parseFloat(m[1]); y = parseFloat(m[2] || 0); useTransform = true; }
    }
    return {
      rect: r, x, y, useTransform, origIdx: idx,
      w: parseFloat(r.getAttribute("width")),
      h: parseFloat(r.getAttribute("height")),
    };
  });

  // y_bot >= 25 → 몸통, 미만 → 머리 (자동 분류)
  const bodyRects = rectInfo.filter((rd) => rd.y + rd.h >= 25);
  if (bodyRects.length === 0) return null;

  const bodyYmin = Math.min(...bodyRects.map((rd) => rd.y));
  const bodyYmax = Math.max(...bodyRects.map((rd) => rd.y + rd.h));
  const bodyXmin = Math.min(...bodyRects.map((rd) => rd.x));
  const bodyXmax = Math.max(...bodyRects.map((rd) => rd.x + rd.w));
  // 꼬리(x>32)는 pivot 계산에서 제외 — 척추 중심으로 회전
  const spineRects = bodyRects.filter((rd) => rd.x < 33);
  const sxMin = Math.min(...spineRects.map((rd) => rd.x));
  const sxMax = Math.max(...spineRects.map((rd) => rd.x + rd.w));
  const bodyCenterX = (sxMin + sxMax) / 2;

  const segHeight = (bodyYmax - bodyYmin) / N_SEG;

  const segments = [];
  for (let i = 0; i < N_SEG; i++) {
    segments.push({ idx: i, yTop: bodyYmin + i * segHeight, rects: [] });
  }
  for (const rd of bodyRects) {
    const cy = rd.y + rd.h / 2;
    const idx = Math.min(N_SEG - 1, Math.max(0, Math.floor((cy - bodyYmin) / segHeight)));
    segments[idx].rects.push(rd);
  }

  // 각 body rect에 대해 x/y/w/h 모두 start↔end lerp.
  // start.svg는 압축 (좁은 w, 얇은 h), end.svg는 펼쳐진 상태 (넓은 w, 두꺼운 h).
  const lerpData = []; // { rect, useTransform, startX, endX, startYLocal, endYLocal, startW, endW, startH, endH }
  for (let i = 0; i < N_SEG; i++) {
    const seg = segments[i];
    const cumulativeY = bodyYmin + i * segHeight;
    for (const rd of seg.rects) {
      const startYGlobal = startYsByIdx[rd.origIdx];
      const endYGlobal = rd.y;
      const startYLocal = ((startYGlobal !== undefined) ? startYGlobal : endYGlobal) - cumulativeY;
      const endYLocal = endYGlobal - cumulativeY;
      const startX = startXsByIdx[rd.origIdx] !== undefined ? startXsByIdx[rd.origIdx] : rd.x;
      const endX = rd.x;
      const startW = startWsByIdx[rd.origIdx] !== undefined ? startWsByIdx[rd.origIdx] : rd.w;
      const endW = rd.w;
      const startH = startHsByIdx[rd.origIdx] !== undefined ? startHsByIdx[rd.origIdx] : rd.h;
      const endH = rd.h;
      lerpData.push({
        rect: rd.rect, useTransform: rd.useTransform,
        startX, endX, startYLocal, endYLocal, startW, endW, startH, endH,
      });
      rd.rect.remove();
    }
  }

  // 중첩 wrapper 빌드: seg-wrap-0 안에 seg-wrap-1 안에 seg-wrap-2 ...
  // 외곽선 filter wrapper(#cat-content) 안에 세그먼트를 두어 cat 전체 실루엣에 외곽선이 적용되도록.
  let parent = svgDoc.getElementById("cat-content") || svg;
  const wrappers = [];
  for (let i = 0; i < N_SEG; i++) {
    const seg = segments[i];
    const wrap = svgDoc.createElementNS(NS, "g");
    wrap.setAttribute("id", `seg-wrap-${i}`);
    for (const rd of seg.rects) wrap.appendChild(rd.rect);
    parent.appendChild(wrap);
    parent = wrap;
    wrappers.push({ el: wrap });
  }

  // 꼬리 path는 setupStretchChain의 segment 분류 대상 외 (rect 아님).
  // applyStretchChain에서 stretchT에 따라 transform y만 lerp.
  // tail-path의 d로 endY를 읽고, transform은 wrapper(<g id="tail">)에 적용 —
  // 그래야 patches도 같이 이동.
  // installTailComponent가 inner path에 transform="translate(ox oy)"을 적용하므로,
  // 절대 Y = parseFirstMy(d) + transform y.
  const tailPath = svgDoc.getElementById("tail-path");
  const tailGroup = svgDoc.getElementById("tail") || tailPath;
  const tailLocalY = tailPath ? parseFirstMy(tailPath.getAttribute("d")) : null;
  const tailTy = tailPath ? parseTranslateY(tailPath.getAttribute("transform")) : 0;
  const tailEndY = tailLocalY !== null ? tailLocalY + tailTy : null;

  // 몸통 patches wrapper — body rects 뒤에 위치한 별도 <g id="body">.
  // applyStretchChain이 scaleY transform을 적용해 body 길이 변화에 맞춤.
  // start vs end 본체 높이 비율로 scaleY lerp.
  const bodyWrapper = svgDoc.getElementById("body");

  // z-order: tail이 맨 뒤(첫 자식). 그 다음 seg-wrap-0(체인 body), body wrapper(patches),
  // 그리고 head/legs/eyes 등이 위에 깔림.
  const catContent = svgDoc.getElementById("cat-content");
  if (catContent && wrappers.length > 0) {
    catContent.insertBefore(wrappers[0].el, catContent.firstChild);
    if (bodyWrapper && bodyWrapper.parentNode === catContent) {
      catContent.insertBefore(bodyWrapper, wrappers[0].el.nextSibling);
    }
    for (const id of ["leg-fl", "leg-fr", "leg-rl", "leg-rr"]) {
      const legEl = svgDoc.getElementById(id);
      if (legEl && legEl.parentNode === catContent) {
        catContent.insertBefore(legEl, bodyWrapper || wrappers[0].el.nextSibling);
      }
    }
    // tail은 절대 맨 뒤 — body 앞으로 이동해서 첫 자식으로
    const tailEl = svgDoc.getElementById("tail");
    if (tailEl && tailEl.parentNode === catContent) {
      catContent.insertBefore(tailEl, catContent.firstChild);
    }
  }
  const startYsForBody = bodyRects
    .map((rd) => startYsByIdx[rd.origIdx])
    .filter((y) => y !== undefined && !isNaN(y));
  const startYBotsForBody = bodyRects
    .map((rd) => (startYsByIdx[rd.origIdx] !== undefined ? startYsByIdx[rd.origIdx] : rd.y) + rd.h);
  const startBodyYmin = startYsForBody.length ? Math.min(...startYsForBody) : bodyYmin;
  const startBodyYmax = Math.max(...startYBotsForBody);
  const startBodyHeight = Math.max(1, startBodyYmax - startBodyYmin);
  const endBodyHeight = Math.max(1, bodyYmax - bodyYmin);

  // patch가 어느 body rect 위에 있는지 직접 매핑 — x/y/w/h + start.svg의 startY 모두 저장.
  // patch가 어떤 rect에도 안 걸리면 그리지 않음 (몸 영역 밖 빈 공간 무시).
  const bodyEndToStartMap = bodyRects.map((rd) => ({
    endX: rd.x,
    endY: rd.y,
    endW: rd.w,
    endH: rd.h,
    startX: startXsByIdx[rd.origIdx] !== undefined ? startXsByIdx[rd.origIdx] : rd.x,
    startY: startYsByIdx[rd.origIdx] !== undefined ? startYsByIdx[rd.origIdx] : rd.y,
    startW: startWsByIdx[rd.origIdx] !== undefined ? startWsByIdx[rd.origIdx] : rd.w,
    startH: startHsByIdx[rd.origIdx] !== undefined ? startHsByIdx[rd.origIdx] : rd.h,
  }));

  // 편집기 body cell row N → spine rect N 직접 매핑. spine rect = 본체 폭 12+ 이며
  // 높이 5+ (다리 3px과 바닥 4px 제외 → 정확히 15개의 row가 됨).
  // 편집기에서 cell row N에 칠한 점이 stretch에선 spineRects[N] 위에 그려진다.
  const bodyRowRects = bodyEndToStartMap
    .filter((r) => r.endW >= 12 && r.endH >= 5)
    .sort((a, b) => a.endY - b.endY);

  // 다리(앞 2 + 뒤 2) lerp — 각 leg 그룹의 data-stretch-y-delta 만큼 stretchT=0에서 위로 이동.
  // 또한 다리의 end 위치 cy로 segment 결정 → 그 segment까지의 누적 dx를 transform에 합쳐서
  // chain 좌우 흔들림에 같이 흔들리도록.
  const legGroups = [];
  for (const id of ["leg-fl", "leg-fr", "leg-rl", "leg-rr"]) {
    const el = svgDoc.getElementById(id);
    if (!el) continue;
    const delta = parseFloat(el.getAttribute("data-stretch-y-delta") || "0");
    // end 위치 cy 추정 — data-patch-frame의 oy + h/2 (h는 inner path 높이 추정).
    // leg-fl/leg-fr 앞다리 11 tall (y=34..45), cy=39.5. leg-rl/leg-rr 뒷다리 8 tall (y=134..142), cy=138.
    const frameAttr = el.getAttribute("data-patch-frame");
    let cy = bodyYmin + segHeight; // fallback: 첫 segment 부근
    if (el.hasAttribute("data-stretch-cy")) {
      cy = parseFloat(el.getAttribute("data-stretch-cy"));
    } else if (frameAttr) {
      const [, oy] = frameAttr.split(/\s+/).map(Number);
      // 다리 높이는 ID로 추정 (간단)
      const isFront = id.startsWith("leg-f");
      const legH = isFront ? 11 : 8;
      cy = oy + legH / 2;
    }
    const segIdx = Math.min(N_SEG - 1, Math.max(0, Math.floor((cy - bodyYmin) / segHeight)));
    legGroups.push({ el, delta, segIdx });
  }

  const result = {
    wrappers, segHeight, bodyYmin, bodyCenterX, lerpData,
    tailGroup, tailEndY,
    bodyWrapper, startBodyHeight, endBodyHeight,
    bodyEndToStartMap,
    bodyRowRects,
    legGroups,
  };
  // 임시로 endData에 결과를 셋팅해서 distributeBodyPatchesToChain이 사용 가능하도록.
  // 그 후 현재 pattern의 body spots를 chain에 분배 (체인이 막 만들어졌으니 새로 분배 필요).
  endData = result;
  if (Array.isArray(currentPattern && currentPattern.body)) {
    distributeBodyPatchesToChain(svgDoc, currentPattern.body);
  }
  refreshHeatOverlays(svgDoc);
  return result;
}

function parseTranslateY(transformStr) {
  const m = (transformStr || "").match(/translate\(\s*-?[\d.]+(?:[\s,]+(-?[\d.]+))?/);
  return m && m[1] != null ? parseFloat(m[1]) : 0;
}

function applyStretchChain() {
  if (!endData) return;
  const { wrappers, segHeight, bodyYmin, lerpData, tailGroup, tailEndY, legGroups } = endData;

  // segment wrapper transform: 좌우 dx 만 (위치는 고정)
  for (let i = 0; i < wrappers.length; i++) {
    const ty = (i === 0) ? bodyYmin : segHeight;
    const transform = `translate(${dxState[i].toFixed(3)} ${ty.toFixed(3)})`;
    wrappers[i].el.setAttribute("transform", transform);
  }

  // 각 rect의 x/y/w/h 모두 stretchT에 따라 start↔end 로 lerp.
  // start.svg는 좁고 얇은 압축 상태, end.svg는 넓고 두꺼운 펼친 상태 — 매끄럽게 변환.
  for (const ld of lerpData) {
    const x = (ld.startX !== undefined ? ld.startX : ld.endX) +
      ((ld.endX - (ld.startX !== undefined ? ld.startX : ld.endX)) * stretchT);
    const y = ld.startYLocal + (ld.endYLocal - ld.startYLocal) * stretchT;
    setRectXY(ld.rect, x, y, ld.useTransform);
    if (ld.startW !== undefined && ld.endW !== undefined) {
      const w = Math.max(0, ld.startW + (ld.endW - ld.startW) * stretchT);
      ld.rect.setAttribute("width", w.toFixed(3));
    }
    if (ld.startH !== undefined && ld.endH !== undefined) {
      const h = Math.max(0, ld.startH + (ld.endH - ld.startH) * stretchT);
      ld.rect.setAttribute("height", h.toFixed(3));
    }
  }

  // 몸통 patches는 distributeBodyPatchesToChain이 seg-wrap에 직접 넣고
  // lerpData에 추가했으므로 위쪽 lerp 루프에서 자동으로 처리됨 (segment dx + y lerp).

  // 4 다리 그룹 — translate (dx, ty)로 start↔end 위치 lerp + chain dx 흔들림.
  // ty: delta는 (startY - endY)라 stretchT=0에서 음수 translate, stretchT=1에서 0.
  // dx: 다리의 segIdx까지의 누적 dxState — 그 segment 위치에 맞는 좌우 흔들림.
  if (legGroups) {
    for (const lg of legGroups) {
      const ty = lg.delta * (1 - stretchT);
      let dx = 0;
      for (let i = 0; i <= lg.segIdx; i++) dx += dxState[i];
      lg.el.setAttribute("transform", `translate(${dx.toFixed(3)} ${ty.toFixed(3)})`);
    }
  }

  // 꼬리는 wrapper(<g id="tail">)에 transform 적용 — path와 patches 함께 이동.
  // stretchT=0 → start.svg 꼬리 위치, stretchT=1 → end.svg 위치 (offset 0)
  // x는 모든 segment의 dx 누적 — 마지막 segment 흔들림에 따라가도록.
  if (tailGroup && tailEndY !== null && tailStartY !== null) {
    let tailDx = 0;
    for (let i = 0; i < dxState.length; i++) tailDx += dxState[i];
    const offsetY = (tailStartY - tailEndY) * (1 - stretchT);
    tailGroup.setAttribute("transform", `translate(${tailDx.toFixed(3)} ${offsetY.toFixed(2)})`);
  }
}

// ── 체인 횡 진동 물리 (각 segment가 좌우로만 이동) ──
let chainRafId = null;
let releasing = false; // mouseup 후 stretchT를 1→0으로 감쇠하는 동안 true
let lastDragMoveAt = 0;
let pointerDownScreenX = 0;
let pointerDownScreenY = 0;
const SPRING = 0.038;
const DAMPING = 0.93;
const STRETCH_HOLD_MS = 1600;
const STRETCH_T_SPRING = 0.13;
const STRETCH_T_DAMP = 0.78;
const PEND_SPRING = 0.003;
const PEND_DAMP = 0.962;
const PEND_IMPULSE = 0.065;
const PEND_MAX_DEG = 45;
const PEND_MAX_PX = 22;        // max absolute lateral displacement at the bottom (svg units)
const WIGGLE_IMPULSE = 0.008;  // lateral segment kick during drag only
const WIGGLE_MIN_SPEED = 6;    // minimum dx (px/event) before wiggle fires at all
const WIGGLE_MAX_DX = 2.5;     // hard clamp on per-segment lateral offset (svg units)

function chainTick() {
  if (!endData) {
    // The object starts with display:none, so Chromium may defer loading its
    // SVG until the first drag makes it visible. Keep waiting during that
    // short window instead of permanently cancelling the animation loop.
    chainRafId = (dragging || releasing) ? requestAnimationFrame(chainTick) : null;
    return;
  }

  // when mouse pauses mid-drag, decay prevDragDx so resuming movement gives a clean impulse
  if (dragging && Date.now() - lastDragMoveAt > 80) {
    prevDragDx *= 0.78;
  }

  // advance stretchT every RAF frame so the stretch grows smoothly while the mouse is held
  if (dragging && dragHoldStartAt > 0) {
    const holdMs = Date.now() - dragHoldStartAt;
    const holdT = Math.min(1, holdMs / STRETCH_HOLD_MS);
    stretchT = holdT < 0.5
      ? 4 * holdT * holdT * holdT
      : 1 - Math.pow(-2 * holdT + 2, 3) / 2;
    stretchT = Math.min(0.32, stretchT);
  }

  // Native Wayland owns the pointer drag, so Chromium cannot provide its
  // per-frame deltas. Keep the full hanging animation alive with a restrained
  // lateral sway while the compositor reports that the window is moving.
  if (nativeDragStateActive && dragging) {
    const sway = Math.sin(performance.now() / 92) * 0.42;
    pendulumVelAngle += sway;
    lastWiggleDx = Math.sin(performance.now() / 58) * (WIGGLE_MIN_SPEED + 1.4);
    lastDragMoveAt = Date.now();
  }

  // spring release: stretchT oscillates toward 0 with overshoot
  if (releasing) {
    stretchTVel += (0 - stretchT) * STRETCH_T_SPRING;
    stretchTVel *= STRETCH_T_DAMP;
    stretchT += stretchTVel;
    if (Math.abs(stretchT) < 0.006 && Math.abs(stretchTVel) < 0.005) {
      stretchT = 0;
      stretchTVel = 0;
    }
  }

  // pendulum simulation — angle drives per-segment lateral targets below
  // while dragging, use stronger spring + more damping so old angle bleeds off fast
  // when direction changes; on release, switch to the slow lingering constants
  const activePendSpring = dragging ? 0.018 : PEND_SPRING;
  const activePendDamp   = dragging ? 0.86  : PEND_DAMP;
  pendulumVelAngle += -pendulumAngle * activePendSpring;
  pendulumVelAngle *= activePendDamp;
  pendulumAngle += pendulumVelAngle;
  pendulumAngle = Math.max(-PEND_MAX_DEG, Math.min(PEND_MAX_DEG, pendulumAngle));

  // each segment springs toward its depth-quadratic target:
  // top (i=0) barely moves, bottom (i=N_SEG-1) gets full PEND_MAX_PX displacement.
  // wrappers are nested, so each dxState[i] is relative to its parent — use incremental targets.
  const pendDx = Math.sin(pendulumAngle * Math.PI / 180) * PEND_MAX_PX;
  let maxMotion = 0;
  for (let i = 0; i < N_SEG; i++) {
    const d = i / (N_SEG - 1);
    const dPrev = i > 0 ? (i - 1) / (N_SEG - 1) : 0;
    const relTarget = pendDx * (d * d - dPrev * dPrev);
    velState[i] += (relTarget - dxState[i]) * SPRING;
    velState[i] *= DAMPING;
    dxState[i] = Math.max(-WIGGLE_MAX_DX, Math.min(WIGGLE_MAX_DX, dxState[i] + velState[i]));
    maxMotion = Math.max(maxMotion, Math.abs(velState[i]));
  }

  // drag wiggle: kick top segment laterally while mouse is moving; zeroed on mouseup
  if (dragging && Math.abs(lastWiggleDx) > WIGGLE_MIN_SPEED) {
    const kick = Math.sign(lastWiggleDx) * Math.pow(Math.abs(lastWiggleDx), 1.3) * WIGGLE_IMPULSE;
    velState[0] -= kick;
    lastWiggleDx *= 0.6; // consume the kick so it doesn't fire every frame
  }

  const lagMotion = (Math.abs(pendulumAngle) + Math.abs(pendulumVelAngle)) / PEND_MAX_DEG;

  applyStretchChain();

  if (releasing && stretchT === 0 && stretchTVel === 0 && maxMotion < 0.15 && lagMotion < 0.02) {
    releasing = false;
    for (let i = 0; i < N_SEG; i++) { dxState[i] = 0; velState[i] = 0; }
    pendulumAngle = 0; pendulumVelAngle = 0;
    if (stretchEndObj) stretchEndObj.style.transform = "translateX(-50%)";
    applyStretchChain();
    document.body.classList.remove("dragging");
    window.electronAPI.setStretchMode(false);
    chainRafId = null;
    return;
  }

  if (dragging || releasing || maxMotion > 0.01 || lagMotion > 0.01) {
    chainRafId = requestAnimationFrame(chainTick);
  } else {
    for (let i = 0; i < N_SEG; i++) { dxState[i] = 0; velState[i] = 0; }
    pendulumAngle = 0; pendulumVelAngle = 0;
    if (stretchEndObj) stretchEndObj.style.transform = "translateX(-50%)";
    applyStretchChain();
    chainRafId = null;
  }
}

function startChain() {
  if (chainRafId === null) chainRafId = requestAnimationFrame(chainTick);
}

function beginDragStretch(startEvent, currentEvent = startEvent) {
  if (dragging || !startEvent || isStretching()) return;
  stopPurring();
  stopHuntingPose();
  dragging = true;
  releasing = false;
  lastX = currentEvent.screenX;
  lastY = currentEvent.screenY;
  dragStartScreenY = startEvent.screenY;
  dragHoldStartAt = Date.now();
  stretchT = 0;
  stretchTVel = 0;
  pendulumAngle = 0; pendulumVelAngle = 0; prevDragDx = 0; lastWiggleDx = 0;
  lagX = 0; lagVelX = 0; lagY = 0; lagVelY = 0;
  if (stretchEndObj) stretchEndObj.style.transform = "translateX(-50%)";
  for (let i = 0; i < N_SEG; i++) { dxState[i] = 0; velState[i] = 0; }
  document.body.classList.add("dragging");
  window.electronAPI.setStretchMode(true);
  startChain();
}

function finishDragStretch(notifyMain = true) {
  if (!dragging) return;
  dragging = false;
  if (notifyMain) window.electronAPI.dragWindowEnded();
  // Kill wiggle instantly; the pendulum carries on during the release.
  lastWiggleDx = 0;
  for (let i = 0; i < N_SEG; i++) { dxState[i] = 0; velState[i] = 0; }
  if (stretchT > 0.01) {
    releasing = true;
    stretchTVel = -stretchT * 0.55;
    prevDragDx = 0;
    startChain();
  } else {
    stretchT = 0;
    stretchTVel = 0;
    document.body.classList.remove("dragging");
    window.electronAPI.setStretchMode(false);
  }
}

function clearPendingDrag() {
  pendingDrag = null;
}

window.addEventListener("mousedown", (e) => {
  pointerDownScreenX = e.screenX;
  pointerDownScreenY = e.screenY;
}, { capture: true });

dragHandle.addEventListener("mousedown", (e) => {
  if (!isCatHitPoint(e.clientX, e.clientY)) return;
  if (e.button === 0) {
    if (isStretching()) return; // 스트레칭 중에는 드래그 시작 차단
    setPetMouseEventsEnabled(true);
    pendingDrag = {
      screenX: e.screenX,
      screenY: e.screenY,
      clientX: e.clientX,
      clientY: e.clientY,
      startedAt: Date.now(),
    };
    e.preventDefault();
  }
});

if (pettingHandle) {
  pettingHandle.addEventListener("mousedown", (event) => {
    // Do not let the no-drag Wayland petting island create a renderer drag
    // that the compositor cannot follow.
    if (windowBackend === "wayland") event.stopPropagation();
  });
}

function updatePurringAtPoint(clientX, clientY, continuous = false) {
  if (isIdleHeadPoint(clientX, clientY)) {
    startPurring(clientX, clientY);
  } else if (!pendingDrag && (!continuous || !purrStopTimer)) {
    scheduleStopPurring(PURR_LEAVE_GRACE_MS);
  }
}

window.addEventListener("mousemove", updateMouseEventPassthrough, { passive: true });

window.addEventListener("mousemove", (e) => {
  const pointerMoved = Math.hypot(e.screenX - pointerDownScreenX, e.screenY - pointerDownScreenY);
  if (e.buttons && pointerMoved > DRAG_START_THRESHOLD_PX) {
    lastDragMoveAt = Date.now();
  }
  if (pendingDrag) {
    const pendingMoved = Math.hypot(e.screenX - pendingDrag.screenX, e.screenY - pendingDrag.screenY);
    if ((e.buttons & 1) && pendingMoved > DRAG_START_THRESHOLD_PX) {
      beginDragStretch(pendingDrag, e);
      clearPendingDrag();
    } else if (!(e.buttons & 1)) {
      clearPendingDrag();
    }
  }
  updatePurringAtPoint(e.clientX, e.clientY);
  if (!dragging) return;
  const dx = e.screenX - lastX;
  const dy = e.screenY - lastY;
  if (dx !== 0 || dy !== 0) {
    lastDragMoveAt = Date.now();
    window.electronAPI.dragWindow(dx, dy);
    // impulse from acceleration (delta-velocity); power-law so fast drags swing much more
    const delta = dx - prevDragDx;
    const scaledDelta = Math.sign(delta) * Math.pow(Math.abs(delta), 2.2) * PEND_IMPULSE;
    pendulumVelAngle -= scaledDelta;
    lastWiggleDx = dx; // raw velocity — wiggle fires on next chainTick frame
    prevDragDx = dx;
    lastX = e.screenX;
    lastY = e.screenY;
  }
});

window.addEventListener("mouseup", (e) => {
  clearPendingDrag();
  if (dragging) {
    finishDragStretch(true);
  } else {
    dragging = false;
  }
  updateMouseEventPassthrough(e);
});

window.addEventListener("mouseleave", () => {
  if (!dragging) setPetMouseEventsEnabled(false);
  clearPendingDrag();
  stopPurring();
});

function cancelDragStretchState() {
  dragging = false;
  pendingDrag = null;
  releasing = false;
  stretchT = 0;
  stretchTVel = 0;
  pendulumAngle = 0; pendulumVelAngle = 0; prevDragDx = 0; lastWiggleDx = 0;
  lagX = 0; lagVelX = 0; lagY = 0; lagVelY = 0;
  if (stretchEndObj) stretchEndObj.style.transform = "translateX(-50%)";
  stopPurring();
  stopHuntingPose();
  for (let i = 0; i < N_SEG; i++) {
    dxState[i] = 0;
    velState[i] = 0;
  }
  document.body.classList.remove("dragging");
  applyStretchChain();
  window.electronAPI.setStretchMode(false);
  updateMouseEventPassthrough();
}

window.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (dragging || releasing || Date.now() - lastDragMoveAt < 350) return;
  window.electronAPI.showContextMenu();
});

// ── 타이핑 반응 (글로벌 키 입력 시 press-left/right 토글, 무입력 시 idle 복귀) ──
const PRESS_RELEASE_MS = 180;
const SCROLL_RELEASE_MS = 520;
const SCROLL_PAPER_START_H = 17;
const SCROLL_PAPER_END_H = 32.5;
const SCROLL_PAPER_UNROLL_MS = 220;
let pressIdx = 0;
let pressReleaseTimer = null;
let scrollReleaseTimer = null;
let scrollPaperRaf = null;
let focusStartTypingTimer = null;
let completionJumpTimers = [];

function clearCompletionJumpTimers() {
  for (const timer of completionJumpTimers) clearTimeout(timer);
  completionJumpTimers = [];
}

function stopCompletionJump() {
  clearCompletionJumpTimers();
  delete document.body.dataset.jump;
  delete document.body.dataset.reminderJump;
  document.body.style.removeProperty("--jump-y");
  document.body.style.removeProperty("--bubble-jump-y");
  setReminderJumpEyesActive(false);
}

function ensureReminderJumpEyes(doc, frame) {
  if (!doc || !doc.documentElement) return;
  const existingStyle = doc.getElementById("reminder-jump-eye-style");
  if (!existingStyle) {
    const style = doc.createElementNS(SVG_NS, "style");
    style.setAttribute("id", "reminder-jump-eye-style");
    style.textContent = [
      ":root:not(.reminder-jump) .reminder-idle-eyes{display:none}",
      ":root.reminder-jump .jump-closed-eye{display:none}",
    ].join("\n");
    doc.documentElement.insertBefore(style, doc.documentElement.firstChild);
  }

  if (frame === "ing") {
    for (const path of doc.querySelectorAll("path[stroke]")) {
      const d = path.getAttribute("d") || "";
      if (d === "M13 12L17 14L13 16" || d === "M27 12L23 14L27 16") {
        path.classList.add("jump-closed-eye");
      }
    }
  }

  if (doc.getElementById("reminder-idle-eyes")) return;
  const y = frame === "ing" ? 11 : 22;
  const eyes = doc.createElementNS(SVG_NS, "g");
  eyes.setAttribute("id", "reminder-idle-eyes");
  eyes.setAttribute("class", "reminder-idle-eyes");

  const addRect = (attrs) => {
    const rect = doc.createElementNS(SVG_NS, "rect");
    for (const [key, value] of Object.entries(attrs)) rect.setAttribute(key, String(value));
    eyes.appendChild(rect);
  };

  const bg = "var(--eye-bg-color, #FFFFFF)";
  const leftPupil = "var(--eye-color-left, var(--eye-color, var(--cat-color)))";
  const rightPupil = "var(--eye-color-right, var(--eye-color, var(--cat-color)))";
  addRect({ x: 13, y: y + 1, width: 1, height: 3, fill: bg });
  addRect({ x: 17, y: y + 1, width: 1, height: 3, fill: bg });
  addRect({ x: 14, y, width: 3, height: 5, fill: bg });
  addRect({ x: 14, y: y + 1, width: 3, height: 3, fill: leftPupil });
  addRect({ x: 22, y: y + 1, width: 1, height: 3, fill: bg });
  addRect({ x: 26, y: y + 1, width: 1, height: 3, fill: bg });
  addRect({ x: 23, y, width: 3, height: 5, fill: bg });
  addRect({ x: 23, y: y + 1, width: 3, height: 3, fill: rightPupil });

  const content = doc.getElementById("cat-content") || doc.documentElement;
  content.appendChild(eyes);
}

function setReminderJumpEyesActive(active) {
  for (const id of ["jump-start", "jump-ing"]) {
    const element = document.getElementById(id);
    const doc = element && element.contentDocument;
    if (doc && doc.documentElement) {
      doc.documentElement.classList.toggle("reminder-jump", !!active);
    }
  }
}

function playReminderJump() {
  playCompletionJump({ idleEyes: true });
}

function playReminderJumpSequence() {
  playReminderJump();
  setTimeout(playReminderJump, 1500);
  setTimeout(playReminderJump, 3000);
}

function playReminderAlertOnce() {
  playReminderJump();
  playReminderMeow({ repeat: 1 });
}

function playCompletionJump(options = {}) {
  if (dragging || isStretching()) return;
  const useIdleEyes = !!options.idleEyes;
  stopScrollAnimation();
  clearTimeout(pressReleaseTimer);
  delete document.body.dataset.press;
  clearCompletionJumpTimers();
  document.body.toggleAttribute("data-reminder-jump", useIdleEyes);
  setReminderJumpEyesActive(useIdleEyes);

  const frames = [
    ["start", 0, "0px", "0px"],
    ["start", 140, "0px", "0px"],
    ["ing", 300, "-16px", "-18px"],
    ["ing", 500, "-26px", "-26px"],
    ["ing", 660, "-24px", "-24px"],
    ["start", 860, "-5px", "-8px"],
    ["start", 1040, "0px", "0px"],
    ["ing", 1240, "-16px", "-18px"],
    ["ing", 1440, "-26px", "-26px"],
    ["ing", 1600, "-24px", "-24px"],
    ["start", 1800, "-5px", "-8px"],
    ["start", 1980, "0px", "0px"],
    [null, 2220, "0px", "0px"],
  ];
  for (const [frame, delay, jumpY, bubbleJumpY] of frames) {
    completionJumpTimers.push(setTimeout(() => {
      document.body.style.setProperty("--jump-y", jumpY);
      document.body.style.setProperty("--bubble-jump-y", bubbleJumpY);
      if (frame) {
        const svgId = frame === "start" ? "jump-start" : "jump-ing";
        ensureSvgObjectReady(svgId);
        if (useIdleEyes) {
          const element = document.getElementById(svgId);
          ensureReminderJumpEyes(element && element.contentDocument, frame);
          setReminderJumpEyesActive(true);
        }
        document.body.dataset.jump = frame;
      }
      else stopCompletionJump();
    }, delay));
  }
}

function scrollSvgObject() {
  return document.getElementById("scroll-unroll");
}

function scrollSvgDoc() {
  const scrollObj = scrollSvgObject();
  return scrollObj ? scrollObj.contentDocument : null;
}

function clearScrollPaperTimers() {
  if (scrollPaperRaf !== null) {
    cancelAnimationFrame(scrollPaperRaf);
    scrollPaperRaf = null;
  }
}

function setScrollPaperHeight(height) {
  const doc = scrollSvgDoc();
  const mask = doc && doc.getElementById("paper-strip-mask");
  if (mask) mask.setAttribute("height", height.toFixed(2));
}

function resetScrollSvgAnimation() {
  clearScrollPaperTimers();
  setScrollPaperHeight(SCROLL_PAPER_START_H);
}

function restartScrollSvgAnimation() {
  resetScrollSvgAnimation();
  const startedAt = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - startedAt) / SCROLL_PAPER_UNROLL_MS);
    const eased = 1 - Math.pow(1 - t, 3);
    const height = SCROLL_PAPER_START_H + (SCROLL_PAPER_END_H - SCROLL_PAPER_START_H) * eased;
    setScrollPaperHeight(height);
    if (t < 1) {
      scrollPaperRaf = requestAnimationFrame(step);
    } else {
      scrollPaperRaf = null;
    }
  };
  scrollPaperRaf = requestAnimationFrame(step);
}

function stopScrollAnimation() {
  delete document.body.dataset.scroll;
  clearTimeout(scrollReleaseTimer);
  scrollReleaseTimer = null;
  resetScrollSvgAnimation();
}

function registerSvgObjectWhenReady(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const register = () => {
    if (!el.contentDocument) return;
    registerSvgDoc(el.contentDocument, id);
    if (document.body.dataset.reminderJump && (id === "jump-start" || id === "jump-ing")) {
      ensureReminderJumpEyes(el.contentDocument, id === "jump-start" ? "start" : "ing");
      setReminderJumpEyesActive(true);
    }
  };
  el.addEventListener("load", register);
  requestAnimationFrame(register);
}

// press / wheel / stretch-pose SVG document 참조 — 이미 로드된 SVG도 놓치지 않고 등록한다.
for (const id of ["press-left", "press-right", "scroll-unroll", "jump-start", "jump-ing", "stretch-pose-default", "stretch-pose-ing"]) {
  registerSvgObjectWhenReady(id);
}

// ── 타이핑 강도(KPS)에 따라 --cat-color를 base→빨강으로 lerp ──
// BASE_RGB는 사용자가 패턴에서 정한 baseColor에서 동적으로 갱신.
let BASE_RGB = [26, 26, 26];       // 기본 #1A1A1A — patternChanged에서 갱신
const HOT_RGB  = [220, 40, 40];    // 매우 빠른 타이핑일 때
const COOL_RGB = [60, 180, 90];    // 스트레칭 휴식 (초록)

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
const KEY_WINDOW_MS = 1500;        // 1.5초 sliding window
const KPS_MIN = 4;                 // 이 KPS 미만은 강도 0 — 보통 타이핑은 색 안 바뀜
const KPS_MAX = 14;                // 이 KPS 이상은 강도 1 — 빠른 타이핑이면 최대
const HEAT_CURVE = 1.5;            // 강도 곡선 — 클수록 낮은 강도에서 더 천천히 빨개짐
const HEAT_EASE = 0.10;            // current heat → target heat 수렴 속도
const HOT_OVERLAY_MAX = 0.7;
const COOL_OVERLAY_MAX = 0.42;

const keyTimestamps = [];
let targetHeat = 0;
let currentHeat = 0;
let heatRafId = null;

function rgbToCss(rgb) {
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

// ── 스트레칭 모드 색상(초록) — typing의 빨강과 모드 분리 ──
let stretchingHeat = 0;       // 0~1, 초록 강도
let stretchingHeatTarget = 0;

function heatTick() {
  const now = Date.now();
  // 1초 이전 timestamps 폐기
  while (keyTimestamps.length > 0 && now - keyTimestamps[0] > KEY_WINDOW_MS) {
    keyTimestamps.shift();
  }
  // KPS는 1.5초 윈도우의 키 수 → 초당으로 환산
  const kps = keyTimestamps.length / (KEY_WINDOW_MS / 1000);
  const raw = Math.min(1, Math.max(0, (kps - KPS_MIN) / (KPS_MAX - KPS_MIN)));
  targetHeat = Math.pow(raw, HEAT_CURVE); // 제곱 곡선

  currentHeat += (targetHeat - currentHeat) * HEAT_EASE;
  if (currentHeat < 0.005 && targetHeat === 0) currentHeat = 0;

  // 스트레칭 heat도 같이 ease (RAF 통합)
  stretchingHeat += (stretchingHeatTarget - stretchingHeat) * 0.12;
  if (stretchingHeat < 0.005 && stretchingHeatTarget === 0) stretchingHeat = 0;

  // 모드 분기: 스트레칭 활성 시 초록 우선, 아니면 typing 빨강.
  let overlayColor;
  let legacyOverlayOpacity = 0;
  let fullOverlayOpacity = 0;
  if (dragging && currentHeat > 0.005) {
    overlayColor = rgbToCss(HOT_RGB);
    fullOverlayOpacity = Math.min(HOT_OVERLAY_MAX, currentHeat * HOT_OVERLAY_MAX);
  } else if (stretchingHeat > 0.005 || stretchingHeatTarget > 0) {
    overlayColor = rgbToCss(COOL_RGB);
    legacyOverlayOpacity = Math.min(COOL_OVERLAY_MAX, stretchingHeat * COOL_OVERLAY_MAX);
  } else {
    overlayColor = rgbToCss(HOT_RGB);
    legacyOverlayOpacity = Math.min(HOT_OVERLAY_MAX, currentHeat * HOT_OVERLAY_MAX);
  }
  setCatColorAllSvgs(rgbToCss(BASE_RGB));
  setHeatOverlayAllSvgs(overlayColor, legacyOverlayOpacity.toFixed(3), fullOverlayOpacity.toFixed(3));

  // 타이핑 heat 0.5 이상부터 김 particle visible — 0.5~1.0 → 0~1 opacity
  // stretching 중에는 CSS에서 display:none으로 가려짐
  const steamOpacity = Math.max(0, Math.min(1, (currentHeat - 0.5) * 2));
  document.body.style.setProperty("--steam-opacity", steamOpacity.toFixed(2));

  if (currentHeat > 0 || kps > 0 || stretchingHeat > 0 || stretchingHeatTarget > 0) {
    heatRafId = requestAnimationFrame(heatTick);
  } else {
    heatRafId = null;
  }
}

// ── 우클릭 메뉴 → 스트레칭 시퀀스 (3초 keyframe animation) ──
// SVG 내부의 .stretching 클래스 토글로 각 부위 keyframe animation 재생.
// 색상은 별도로 ease (검정 → 초록 → 검정)
const STRETCH_DURATION_MS = 3000;
let stretchingTimers = [];
let pendingStretchAnimation = 0;
let pendingStretchLoadListener = null;
function clearPendingStretchLoadListener() {
  if (pendingStretchLoadListener) {
    const obj = document.getElementById("stretch-pose-default");
    if (obj) obj.removeEventListener("load", pendingStretchLoadListener);
    pendingStretchLoadListener = null;
  }
}
function clearStretchingTimers() {
  pendingStretchAnimation += 1;
  for (const t of stretchingTimers) clearTimeout(t);
  stretchingTimers = [];
  clearPendingStretchLoadListener();
}

function requestStretchPoseAnimation() {
  const token = ++pendingStretchAnimation;
  if (pendingStretchLoadListener) {
    const obj = document.getElementById("stretch-pose-default");
    if (obj) obj.removeEventListener("load", pendingStretchLoadListener);
    pendingStretchLoadListener = null;
  }
  const startedAt = performance.now();
  const tryStart = () => {
    if (token !== pendingStretchAnimation || !document.body.dataset.stretching) return;
    if (setStretchPoseAnimating(true)) {
      clearPendingStretchLoadListener();
      return;
    }
    if (performance.now() - startedAt < STRETCH_DURATION_MS) requestAnimationFrame(tryStart);
  };
  const obj = document.getElementById("stretch-pose-default");
  if (obj) {
    pendingStretchLoadListener = () => {
      if (token !== pendingStretchAnimation || !document.body.dataset.stretching) return;
      requestAnimationFrame(tryStart);
    };
    obj.addEventListener("load", pendingStretchLoadListener, { once: true });
  }
  requestAnimationFrame(() => requestAnimationFrame(tryStart));
}

function setStretchPoseAnimating(active) {
  const obj = document.getElementById("stretch-pose-default");
  if (!obj) return false;
  const doc = obj.contentDocument;
  if (!doc || !doc.documentElement) return false;
  const root = doc.documentElement;
  if (active) {
    // 재생을 다시 트리거하려면 클래스 잠시 제거 후 재추가 (reflow)
    root.classList.remove("stretching");
    void root.getBoundingClientRect();
    root.classList.add("stretching");
  } else {
    root.classList.remove("stretching");
  }
  return true;
}

window.electronAPI.onDoStretch(() => {
  if (dragging || releasing || document.body.classList.contains("dragging")) {
    cancelDragStretchState();
  }
  if (focusStartTypingTimer) {
    clearInterval(focusStartTypingTimer);
    focusStartTypingTimer = null;
  }
  clearTimeout(pressReleaseTimer);
  pressReleaseTimer = null;
  delete document.body.dataset.press;
  clearStretchingTimers();
  stopCompletionJump();
  stopScrollAnimation();
  stopHuntingPose();
  ensureSvgObjectReady("stretch-pose-default");
  document.body.dataset.stretching = "ing";
  requestStretchPoseAnimation();
  // 색상: 검정 → 초록 → 검정 (전체 3초 안에 자연스럽게)
  stretchingHeatTarget = 1;
  if (heatRafId === null) heatRafId = requestAnimationFrame(heatTick);
  // 70% 지점에서 색상 다시 0으로 (animation도 100%에서 default로 복귀)
  stretchingTimers.push(setTimeout(() => {
    stretchingHeatTarget = 0;
  }, STRETCH_DURATION_MS * 0.7));
  // 종료: idle 복귀
  stretchingTimers.push(setTimeout(() => {
    pendingStretchAnimation += 1;
    clearPendingStretchLoadListener();
    setStretchPoseAnimating(false);
    delete document.body.dataset.stretching;
  }, STRETCH_DURATION_MS));
});

const TYPING_TRIGGER_COUNT = 5;
const TYPING_WINDOW_MS = 2000;
let recentKeyTimestamps = [];

window.electronAPI.onKeyPressed(() => {
  if (isStretching()) return;
  const now = Date.now();

  // sliding window: only react visually once typing reaches 5 keys / 2 seconds
  recentKeyTimestamps.push(now);
  recentKeyTimestamps = recentKeyTimestamps.filter(t => now - t < TYPING_WINDOW_MS);
  const isTypingActive = recentKeyTimestamps.length >= TYPING_TRIGGER_COUNT;

  if (!dragging && isTypingActive) {
    stopHuntingPose();
    stopCompletionJump();
    stopScrollAnimation();
    pressIdx++;
    const nextPress = pressIdx % 2 === 0 ? "left" : "right";
    ensureSvgObjectReady(nextPress === "left" ? "press-left" : "press-right");
    document.body.dataset.press = nextPress;
    clearTimeout(pressReleaseTimer);
    pressReleaseTimer = setTimeout(() => {
      delete document.body.dataset.press;
    }, PRESS_RELEASE_MS);
  }
  // heat colour tracking always runs regardless of threshold
  keyTimestamps.push(now);
  if (heatRafId === null) heatRafId = requestAnimationFrame(heatTick);
});

window.electronAPI.onPomodoroFocusStart(() => {
  if (dragging || isStretching()) return;
  if (focusStartTypingTimer) clearInterval(focusStartTypingTimer);
  stopCompletionJump();
  stopScrollAnimation();
  clearTimeout(pressReleaseTimer);
  let count = 0;
  focusStartTypingTimer = setInterval(() => {
    pressIdx++;
    const nextPress = pressIdx % 2 === 0 ? "left" : "right";
    ensureSvgObjectReady(nextPress === "left" ? "press-left" : "press-right");
    document.body.dataset.press = nextPress;
    keyTimestamps.push(Date.now());
    if (heatRafId === null) heatRafId = requestAnimationFrame(heatTick);
    count++;
    if (count >= 10) {
      clearInterval(focusStartTypingTimer);
      focusStartTypingTimer = null;
      pressReleaseTimer = setTimeout(() => {
        delete document.body.dataset.press;
      }, PRESS_RELEASE_MS);
    }
  }, 110);
});

window.electronAPI.onMouseWheel(() => {
  if (isStretching() || dragging || document.body.dataset.press || document.body.dataset.jump) return;
  if (!document.body.dataset.scroll) restartScrollSvgAnimation();
  ensureSvgObjectReady("scroll-unroll");
  document.body.dataset.scroll = "unroll";
  clearTimeout(scrollReleaseTimer);
  scrollReleaseTimer = setTimeout(() => {
    stopScrollAnimation();
  }, SCROLL_RELEASE_MS);
});
