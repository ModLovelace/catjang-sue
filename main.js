"use strict";

const { app, BrowserWindow, screen, ipcMain, Menu, desktopCapturer, dialog, nativeImage, globalShortcut, shell, systemPreferences } = require("electron");
const autoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  async checkForUpdates() {},
  async downloadUpdate() {},
  quitAndInstall() {},
  on() {},
  off() {},
  removeListener() {},
  removeAllListeners() {},
  emit() {},
  setFeedURL() {},
};
const path = require("path");
const fs = require("fs");
const os = require("os");
const http = require("http");
const vm = require("vm");
const { spawn } = require("child_process");
const bundledFfmpegPath = require("ffmpeg-static");

const IS_MAC = process.platform === "darwin";
const IS_WINDOWS = process.platform === "win32";
const IS_SMOKE_TEST = process.argv.includes("--catjang-smoke-test");

if (IS_WINDOWS && !process.env.PREBUILDS_ONLY) {
  process.env.PREBUILDS_ONLY = "1";
}

const STARTUP_LOG_PATH = (() => {
  try {
    return path.join(app.getPath("userData"), "logs", "main.log");
  } catch {
    return null;
  }
})();

function appendStartupLog(level, args) {
  if (!STARTUP_LOG_PATH) return;
  try {
    fs.mkdirSync(path.dirname(STARTUP_LOG_PATH), { recursive: true });
    const message = Array.from(args).map((item) => {
      if (item instanceof Error) return item.stack || item.message;
      if (typeof item === "string") return item;
      try { return JSON.stringify(item); } catch { return String(item); }
    }).join(" ");
    fs.appendFileSync(STARTUP_LOG_PATH, `[${new Date().toISOString()}] [${level}] ${message}\n`);
  } catch {}
}

function logInfo(...args) {
  console.log(...args);
  appendStartupLog("info", args);
}

function logWarn(...args) {
  console.warn(...args);
  appendStartupLog("warn", args);
}

function logError(...args) {
  console.error(...args);
  appendStartupLog("error", args);
}

process.on("uncaughtException", (error) => {
  logError("[Catjang] uncaught exception:", error);
});

process.on("unhandledRejection", (reason) => {
  logError("[Catjang] unhandled rejection:", reason);
});

let uIOhook = null;
try {
  ({ uIOhook } = require("uiohook-napi"));
} catch (error) {
  logWarn("[Catjang] uiohook-napi is unavailable:", error && error.message ? error.message : error);
}

let petWin = null;
let patternWin = null;
let mappingWin = null;
let licenseWin = null;
let shareOverlayWin = null;
let shareControlsWin = null;
let shareCaptureSession = null;
let cursorPollTimer = null;
let keyHookStarted = false;
let keyHookListenersAttached = false;
let keyHookRetryTimer = null;
const APP_ICON_PATH = path.join(__dirname, "assets", "catjang-logo.png");
const AGENT_STATE_PORT = 23456;
const AGENT_ACTIVE_TTL_MS = 10 * 60 * 1000;
let agentStateServer = null;
let codexMonitor = null;
let kiroMonitor = null;
let cursorAgentMonitor = null;
const activeAgentSessions = new Map();
let regularCheckTimer = null;
let regularCheckRunning = false;
let updateInstallPending = false;
let pendingManualUpdateCheck = false;

const PROTOTYPE_LICENSE_ENDPOINT = require("./prototype-license/endpoint");
const SUPPORTED_LANGUAGES = ["en", "ko", "ja"];
const SHARE_VIDEO_CROP_GUARD_X_PX = 48;
const SHARE_VIDEO_CROP_GUARD_TOP_PX = 96;
const SHARE_VIDEO_CROP_GUARD_BOTTOM_PX = 48;
const SHARE_VIDEO_KEYFRAME_INTERVAL_SEC = 1 / 30;
const REGULAR_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
let currentLanguage = "en";

function resolveFfmpegPath() {
  if (!bundledFfmpegPath) return null;
  const unpackedPath = bundledFfmpegPath.replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`);
  return unpackedPath;
}

const ffmpegPath = resolveFfmpegPath();

const I18N = {
  en: {
    licenseMissingKey: "Please enter your license key.",
    licenseActivateFailed: "We could not activate this license key.",
    licenseWindowTitle: "Catjang License",
    patternEditorTitle: "Catjang Pattern Editor",
    mappingEditorTitle: "Catjang Cell Mapping Editor",
    appMenuAbout: "About Catjang",
    appMenuQuit: "Quit",
    checkForUpdates: "Check for Updates",
    editMenu: "Edit",
    contextTitle: "Catjang",
    size: "Size",
    smaller: "Smaller (-20)",
    larger: "Larger (+20)",
    resetSize: "Reset size (100 × 100)",
    petSizePixels: (size) => `${size} × ${size}`,
    stretch: "Break Stretch",
    stretchNow: "Start break stretch now",
    jump: "Jump",
    jumpNow: "Jump now",
    shareCat: "Show off my Catjang",
    setUserName: "Tell my name",
    setCatName: "Set Catjang name",
    showCatName: "Show Catjang name",
    fixedMessage: "Fixed message",
    reminders: "Reminders",
    remindersOpen: "Open reminders",
    showReminderButtonOutside: "Show button outside",
    pomodoro: "Pomodoro",
    pomodoroStart: "Start",
    pomodoroPause: "Pause",
    pomodoroResume: "Resume",
    pomodoroReset: "Reset",
    pomodoroFocusTime: "Focus time",
    pomodoroRestTime: "Break time",
    pomodoroFocusLabel: "Focus",
    pomodoroRestLabel: "Break",
    pomodoroMinutes: (min) => `${min} min`,
    pomodoroCustom: "Custom",
    patternEditor: "Pattern Editor",
    mappingEditor: "Cell Mapping Editor",
    taskCompleteSound: "Task complete sound",
    soundOff: "Off",
    soundLow: "Low",
    soundNormal: "Normal",
    soundHigh: "High",
    autoStretch: "Auto Break Stretch",
    off: "Off",
    everyMinuteTest: "Every 1 minute (test)",
    everyMinutes: (min) => `Every ${min} minutes`,
    everyHour: "Every hour",
    everyHourAndHalf: "Every 1 hour 30 minutes",
    everyTwoHours: "Every 2 hours",
    language: "Language",
    english: "English",
    korean: "Korean",
    japanese: "Japanese",
    accessibilityPermissionTitle: "Accessibility permission needed",
    accessibilityPermissionMessage: "Allow Catjang to react to typing",
    accessibilityPermissionDetail: "Turn on Catjang in Accessibility, then restart Catjang if typing reactions do not start.",
    inputPermissionTitle: "Input Monitoring may be needed",
    inputPermissionMessage: "Catjang still cannot detect typing",
    inputPermissionDetail: "Some macOS environments also require Input Monitoring. Add Catjang in Input Monitoring, then restart Catjang if typing reactions do not start.",
    openInputMonitoring: "Open Input Monitoring",
    openAccessibility: "Open Accessibility",
    shareVideoTitle: "Share video",
    shareVideoSaveTitle: "Save share video",
    shareRecordingFailed: "Could not make the share video.",
    globalInputPermissionTitle: "Input monitoring unavailable",
    globalInputPermissionMessage: "Catjang cannot detect keyboard or wheel input",
    globalInputPermissionDetail: "Restart Catjang and check whether Windows security software or system policy is blocking global input hooks.",
    reset: "Reset",
    clear: "Clear",
    delete: "Delete",
    later: "Later",
  },
  ko: {
    licenseMissingKey: "라이선스 키를 입력해 주세요.",
    licenseActivateFailed: "라이선스를 활성화할 수 없습니다.",
    licenseWindowTitle: "Catjang 라이선스",
    patternEditorTitle: "캣짱 패턴 편집기",
    mappingEditorTitle: "캣짱 셀 매핑 편집기",
    appMenuAbout: "Catjang에 관하여",
    appMenuQuit: "종료",
    checkForUpdates: "업데이트 확인",
    editMenu: "편집",
    contextTitle: "Catjang",
    size: "크기",
    smaller: "조금 작게 (-20)",
    larger: "조금 크게 (+20)",
    resetSize: "크기 초기화 (100 × 100)",
    petSizePixels: (size) => `${size} × ${size}`,
    stretch: "휴식 스트레칭",
    stretchNow: "지금 휴식 스트레칭",
    jump: "점프",
    jumpNow: "지금 점프",
    shareCat: "내 캣짱 자랑 영상찍기",
    setUserName: "내 이름 알려주기",
    setCatName: "캣짱 이름 지정",
    showCatName: "캣짱 이름 표시",
    fixedMessage: "고정 메시지",
    reminders: "알림",
    remindersOpen: "알림 열기",
    showReminderButtonOutside: "바깥에 버튼 표시",
    pomodoro: "뽀모도로",
    pomodoroStart: "시작",
    pomodoroPause: "일시정지",
    pomodoroResume: "다시 시작",
    pomodoroReset: "초기화",
    pomodoroFocusTime: "집중 시간",
    pomodoroRestTime: "휴식 시간",
    pomodoroFocusLabel: "집중",
    pomodoroRestLabel: "휴식",
    pomodoroMinutes: (min) => `${min}분`,
    pomodoroCustom: "커스텀",
    patternEditor: "패턴 편집",
    mappingEditor: "셀 매핑 편집",
    taskCompleteSound: "작업 완료 알림음",
    soundOff: "끄기",
    soundLow: "작게",
    soundNormal: "보통",
    soundHigh: "크게",
    autoStretch: "자동 휴식 스트레칭",
    off: "끄기",
    everyMinuteTest: "1분마다 (테스트)",
    everyMinutes: (min) => `${min}분마다`,
    everyHour: "1시간마다",
    everyHourAndHalf: "1시간 30분마다",
    everyTwoHours: "2시간마다",
    language: "언어",
    english: "영어",
    korean: "한국어",
    japanese: "일본어",
    accessibilityPermissionTitle: "손쉬운 사용 권한이 필요해요",
    accessibilityPermissionMessage: "캣짱이 타이핑에 반응하도록 허용해 주세요",
    accessibilityPermissionDetail: "손쉬운 사용에서 Catjang을 켜 주세요. 타이핑 반응이 바로 시작되지 않으면 캣짱을 다시 실행해 주세요.",
    inputPermissionTitle: "입력 모니터링이 필요할 수 있어요",
    inputPermissionMessage: "캣짱이 아직 키보드 입력을 감지하지 못하고 있어요",
    inputPermissionDetail: "일부 macOS 환경에서는 입력 모니터링도 필요해요. 입력 모니터링에 Catjang을 추가한 뒤, 타이핑 반응이 시작되지 않으면 캣짱을 다시 실행해 주세요.",
    openInputMonitoring: "입력 모니터링 열기",
    openAccessibility: "손쉬운 사용 열기",
    shareVideoTitle: "자랑 영상",
    shareVideoSaveTitle: "자랑 영상 저장",
    shareRecordingFailed: "자랑 영상을 만들 수 없어요.",
    globalInputPermissionTitle: "입력 감지를 사용할 수 없어요",
    globalInputPermissionMessage: "Catjang이 키보드 또는 휠 입력을 감지하지 못하고 있어요",
    globalInputPermissionDetail: "Catjang을 다시 실행해 보세요. 계속 실패하면 Windows 보안 프로그램이나 시스템 정책이 전역 입력 후킹을 막고 있는지 확인해 주세요.",
    reset: "초기화",
    clear: "지우기",
    delete: "삭제",
    later: "나중에",
  },
  ja: {
    licenseMissingKey: "ライセンスキーを入力してください。",
    licenseActivateFailed: "このライセンスキーを有効化できませんでした。",
    licenseWindowTitle: "Catjang ライセンス",
    patternEditorTitle: "Catjang パターンエディター",
    mappingEditorTitle: "Catjang セルマッピングエディター",
    appMenuAbout: "Catjang について",
    appMenuQuit: "終了",
    checkForUpdates: "アップデートを確認",
    editMenu: "編集",
    contextTitle: "Catjang",
    size: "サイズ",
    smaller: "少し小さく (-20)",
    larger: "少し大きく (+20)",
    resetSize: "サイズをリセット (100 × 100)",
    petSizePixels: (size) => `${size} × ${size}`,
    stretch: "休憩ストレッチ",
    stretchNow: "今すぐ休憩ストレッチ",
    jump: "ジャンプ",
    jumpNow: "今すぐジャンプ",
    shareCat: "Catjang を自慢する動画を撮る",
    setUserName: "自分の名前を教える",
    setCatName: "Catjang の名前を設定",
    showCatName: "Catjang の名前を表示",
    fixedMessage: "固定メッセージ",
    reminders: "通知",
    remindersOpen: "通知を開く",
    showReminderButtonOutside: "外側にボタンを表示",
    pomodoro: "ポモドーロ",
    pomodoroStart: "開始",
    pomodoroPause: "一時停止",
    pomodoroResume: "再開",
    pomodoroReset: "リセット",
    pomodoroFocusTime: "集中時間",
    pomodoroRestTime: "休憩時間",
    pomodoroFocusLabel: "集中",
    pomodoroRestLabel: "休憩",
    pomodoroMinutes: (min) => `${min}分`,
    pomodoroCustom: "カスタム",
    patternEditor: "パターン編集",
    mappingEditor: "セルマッピング編集",
    taskCompleteSound: "タスク完了音",
    soundOff: "オフ",
    soundLow: "小",
    soundNormal: "標準",
    soundHigh: "大",
    autoStretch: "自動休憩ストレッチ",
    off: "オフ",
    everyMinuteTest: "1分ごと (テスト)",
    everyMinutes: (min) => `${min}分ごと`,
    everyHour: "1時間ごと",
    everyHourAndHalf: "1時間30分ごと",
    everyTwoHours: "2時間ごと",
    language: "言語",
    english: "英語",
    korean: "韓国語",
    japanese: "日本語",
    accessibilityPermissionTitle: "アクセシビリティ権限が必要です",
    accessibilityPermissionMessage: "Catjang がタイピングに反応できるよう許可してください",
    accessibilityPermissionDetail: "アクセシビリティで Catjang をオンにしてください。タイピング反応が始まらない場合は Catjang を再起動してください。",
    inputPermissionTitle: "入力監視が必要な場合があります",
    inputPermissionMessage: "Catjang がまだキーボード入力を検出できません",
    inputPermissionDetail: "一部の macOS 環境では入力監視も必要です。入力監視に Catjang を追加し、タイピング反応が始まらない場合は Catjang を再起動してください。",
    openInputMonitoring: "入力監視を開く",
    openAccessibility: "アクセシビリティを開く",
    shareVideoTitle: "自慢動画",
    shareVideoSaveTitle: "自慢動画を保存",
    shareRecordingFailed: "自慢動画を作成できませんでした。",
    globalInputPermissionTitle: "入力検出を使用できません",
    globalInputPermissionMessage: "Catjang がキーボードまたはホイール入力を検出できません",
    globalInputPermissionDetail: "Catjang を再起動してください。解決しない場合は、Windows のセキュリティソフトまたはシステムポリシーがグローバル入力フックをブロックしていないか確認してください。",
    reset: "リセット",
    clear: "クリア",
    delete: "削除",
    later: "後で",
  },
};

function t(key, ...args) {
  const table = I18N[currentLanguage] || I18N.en;
  const value = table[key] || I18N.en[key] || key;
  return typeof value === "function" ? value(...args) : value;
}

function normalizeLanguage(language) {
  const lang = String(language || "").toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : "en";
}

function defaultLanguage() {
  return normalizeLanguage(app.getLocale && app.getLocale());
}

function licensePath() {
  return path.join(app.getPath("userData"), "license.json");
}

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadLicense() {
  return PROTOTYPE_LICENSE_ENDPOINT.loadLicenseFile(licensePath());
}

function saveLicense(data) {
  PROTOTYPE_LICENSE_ENDPOINT.saveLicenseFile(licensePath(), data);
}

function removeLicense() {
  PROTOTYPE_LICENSE_ENDPOINT.removeLicenseFile(licensePath());
}

function activateLicenseKey(licenseKey) {
  const key = String(licenseKey || "").trim();
  if (!key) throw new Error(t("licenseMissingKey"));

  const result = PROTOTYPE_LICENSE_ENDPOINT.activate(key, { platform: process.platform });
  if (!result.ok || !result.activated || !result.instance || !result.instance.id) {
    throw new Error(result.error || t("licenseActivateFailed"));
  }
  PROTOTYPE_LICENSE_ENDPOINT.saveLicenseFile(licensePath(), result.record);
  return result.record;
}

async function validateSavedLicense(options = {}) {
  const license = loadLicense();
  if (!license) return { ok: false, reason: "missing" };
  const allowOffline = options.allowOffline !== false;

  const result = PROTOTYPE_LICENSE_ENDPOINT.validate(license.licenseKey, license.instanceId);
  if (!result.ok || !result.valid) {
    removeLicense();
    return { ok: false, reason: result.error || "invalid" };
  }

  const updated = {
    ...license,
    status: "active",
    customerEmail: result.meta && result.meta.customer_email,
    productName: result.meta && result.meta.product_name,
    lastValidatedAt: result.lastValidatedAt || new Date().toISOString(),
  };
  saveLicense(updated);
  return { ok: true, license: updated, offline: !allowOffline ? false : true };
}

// ── 패턴 (사용자 커스텀 무늬) ──
// { baseColor, eyeColor, eyeBgColor, oddEye, eyeColorLeft, eyeColorRight,
//   head: [{x, y, color}], body: [...], tail: [...] }
// baseColor: 캣짱 기본 몸통 색 (타이핑/스트레칭 lerp의 시작점).
// eyeColor: 양쪽 공통 눈동자 색 (oddEye=false일 때 사용).
// eyeBgColor: 눈 배경색.
// oddEye=true이면 eyeColorLeft/eyeColorRight 따로 적용 (viewer 기준 좌/우).
const DEFAULT_BASE_COLOR = "#1A1A1A";
const DEFAULT_EYE_COLOR = "#1A1A1A";
const DEFAULT_EYE_BG_COLOR = "#FFFFFF";
let currentPattern = {
  selectedPresetId: null,
  baseColor: DEFAULT_BASE_COLOR,
  eyeColor: DEFAULT_EYE_COLOR,
  eyeBgColor: DEFAULT_EYE_BG_COLOR,
  oddEye: false,
  eyeColorLeft: DEFAULT_EYE_COLOR,
  eyeColorRight: DEFAULT_EYE_COLOR,
  head: [], body: [], tail: [],
  legFl: [], legFr: [], legRl: [], legRr: [],
  earL: [], earR: [],
};
const PATTERN_PRESETS = [
  { id: "black-cat", label: { en: "Black cat", ko: "검은냥이" }, file: "black-cat.json", image: "../workspace/assets/img/presets/black.png" },
  { id: "white-cat", label: { en: "White cat", ko: "하얀냥이" }, file: "white-cat.json", image: "../workspace/assets/img/presets/white.png" },
  { id: "cheese-cat", label: { en: "Cheese cat", ko: "치즈냥이" }, file: "cheese-cat.json", image: "../workspace/assets/img/presets/orange.png" },
  { id: "siamese-cat", label: { en: "Siamese cat", ko: "샴고양이" }, file: "siamese-cat.json", image: "../workspace/assets/img/presets/siamese.png" },
  { id: "mackerel-tabby", label: { en: "Mackerel tabby", ko: "고등어냥이" }, file: "mackerel-tabby.json", image: "../workspace/assets/img/presets/mackerel.png" },
  { id: "calico-cat", label: { en: "Calico cat", ko: "삼색냥이" }, file: "calico-cat.json", image: "../workspace/assets/img/presets/calico.png" },
  { id: "russian-blue", label: { en: "Russian Blue", ko: "러시안블루" }, file: "rusian-blue.json", image: "../workspace/assets/img/presets/rusian-blue.png" },
];

function patternPath() {
  return path.join(app.getPath("userData"), "pattern.json");
}
function customPatternPresetsPath() {
  return path.join(app.getPath("userData"), "custom-presets.json");
}
function customPatternPresetExportName(name) {
  const presetName = typeof name === "string" && name.trim() ? name.trim() : "custom";
  const safeName = presetName.replace(/[^a-z0-9가-힣_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "custom";
  return `catjang-pattern-${safeName}.json`;
}
function sanitizePattern(data) {
  const pattern = data && typeof data === "object" ? data : {};
  return {
    selectedPresetId: typeof pattern.selectedPresetId === "string" ? pattern.selectedPresetId : null,
    baseColor: typeof pattern.baseColor === "string" ? pattern.baseColor : DEFAULT_BASE_COLOR,
    eyeColor: typeof pattern.eyeColor === "string" ? pattern.eyeColor : DEFAULT_EYE_COLOR,
    eyeBgColor: typeof pattern.eyeBgColor === "string" ? pattern.eyeBgColor : DEFAULT_EYE_BG_COLOR,
    oddEye: !!pattern.oddEye,
    eyeColorLeft: typeof pattern.eyeColorLeft === "string" ? pattern.eyeColorLeft : (pattern.eyeColor || DEFAULT_EYE_COLOR),
    eyeColorRight: typeof pattern.eyeColorRight === "string" ? pattern.eyeColorRight : (pattern.eyeColor || DEFAULT_EYE_COLOR),
    head: Array.isArray(pattern.head) ? pattern.head : [],
    body: Array.isArray(pattern.body) ? pattern.body : [],
    tail: Array.isArray(pattern.tail) ? pattern.tail : [],
    legFl: Array.isArray(pattern.legFl) ? pattern.legFl : [],
    legFr: Array.isArray(pattern.legFr) ? pattern.legFr : [],
    legRl: Array.isArray(pattern.legRl) ? pattern.legRl : [],
    legRr: Array.isArray(pattern.legRr) ? pattern.legRr : [],
    earL: Array.isArray(pattern.earL) ? pattern.earL : [],
    earR: Array.isArray(pattern.earR) ? pattern.earR : [],
  };
}
function patternPresetPath(fileName) {
  return path.join(__dirname, "presets", "patterns", path.basename(fileName));
}
function loadCustomPatternPresets() {
  try {
    const data = readJsonFile(customPatternPresetsPath());
    if (!data || !Array.isArray(data.presets)) return [];
    return data.presets
      .filter((preset) => preset && typeof preset === "object" && typeof preset.id === "string")
      .map((preset) => ({
        id: preset.id,
        name: typeof preset.name === "string" && preset.name.trim() ? preset.name.trim().slice(0, 60) : "My preset",
        createdAt: typeof preset.createdAt === "string" ? preset.createdAt : new Date().toISOString(),
        updatedAt: typeof preset.updatedAt === "string" ? preset.updatedAt : new Date().toISOString(),
        pattern: sanitizePattern(preset.pattern),
      }));
  } catch {
    return [];
  }
}
function saveCustomPatternPresets(presets) {
  writeJsonFile(customPatternPresetsPath(), { version: 1, presets });
}
function uniqueCustomPatternPresetName(name, presets) {
  const baseName = (typeof name === "string" && name.trim() ? name.trim() : "My preset").slice(0, 60);
  const used = new Set(presets.map((preset) => preset.name));
  if (!used.has(baseName)) return baseName;
  for (let index = 1; index < 1000; index += 1) {
    const nextName = `${baseName} (${index})`.slice(0, 60);
    if (!used.has(nextName)) return nextName;
  }
  return `${baseName}-${Date.now()}`.slice(0, 60);
}
function normalizeImportedCustomPresets(data) {
  if (!data || typeof data !== "object") return [];
  const sourcePresets = Array.isArray(data.presets) ? data.presets : (data.preset ? [data.preset] : []);
  return sourcePresets
    .filter((preset) => preset && typeof preset === "object")
    .map((preset) => ({
      name: typeof preset.name === "string" && preset.name.trim() ? preset.name.trim().slice(0, 60) : "My preset",
      createdAt: typeof preset.createdAt === "string" ? preset.createdAt : new Date().toISOString(),
      updatedAt: typeof preset.updatedAt === "string" ? preset.updatedAt : new Date().toISOString(),
      pattern: sanitizePattern(preset.pattern),
    }));
}
function customPatternPresetPayload(preset) {
  return {
    id: preset.id,
    label: { en: preset.name, ko: preset.name },
    source: "custom",
    createdAt: preset.createdAt,
    updatedAt: preset.updatedAt,
    pattern: sanitizePattern(preset.pattern),
  };
}
function loadPattern() {
  try {
    if (fs.existsSync(patternPath())) {
      const data = JSON.parse(fs.readFileSync(patternPath(), "utf8"));
      if (data && typeof data === "object") {
        currentPattern = sanitizePattern(data);
      }
    }
  } catch {}
}
function savePattern() {
  try {
    fs.writeFileSync(patternPath(), JSON.stringify(currentPattern));
  } catch {}
}
function broadcastPattern() {
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("pattern-changed", currentPattern);
  }
}

// ── 자동 스트레칭 설정 ──
const DEFAULT_STRETCH_INTERVAL_MIN = 30;
const RELEASE_EXCLUDED_STRETCH_INTERVAL_MIN = 1;
let stretchIntervalMin = DEFAULT_STRETCH_INTERVAL_MIN; // 0 = 끔
let stretchTimer = null;
let reminders = [];
let reminderTimer = null;
let catName = "Catjang";
let userName = "";
let showCatName = true;
let fixedMessage = "";
let showReminderButtonOutside = true;
let pomodoroFocusMin = 25;
let pomodoroRestSec = 5 * 60;
let pomodoroMode = "focus";
let pomodoroRunning = false;
let pomodoroVisible = false;
let pomodoroRemainingSec = pomodoroFocusMin * 60;
let pomodoroTimer = null;
let accessibilityPermissionGuideShown = false;
let inputPermissionGuideShown = false;
let catNamePromptShown = false;
let taskCompleteSoundVolume = 0.1;

function releaseBuildExcludesDevOptions() {
  return app.isPackaged;
}

function normalizeStretchIntervalForBuild(min) {
  if (releaseBuildExcludesDevOptions() && min === RELEASE_EXCLUDED_STRETCH_INTERVAL_MIN) {
    return DEFAULT_STRETCH_INTERVAL_MIN;
  }
  return min;
}

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function normalizePetSize(size) {
  return Math.max(40, Math.min(400, Math.round(Number(size) || DEFAULT_SIZE)));
}

function normalizePetPosition(position) {
  if (!position || typeof position !== "object") return null;
  const x = Math.round(Number(position.x));
  const y = Math.round(Number(position.y));
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath())) {
      const data = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
      if (typeof data.stretchIntervalMin === "number" && data.stretchIntervalMin >= 0) {
        stretchIntervalMin = normalizeStretchIntervalForBuild(data.stretchIntervalMin);
      }
      if (Array.isArray(data.reminders)) {
        reminders = data.reminders.map(sanitizeReminder).filter(Boolean);
      }
      if (typeof data.language === "string") {
        currentLanguage = normalizeLanguage(data.language);
      }
      if (typeof data.catName === "string" && data.catName.trim()) {
        catName = data.catName.trim().slice(0, 24);
      }
      if (typeof data.userName === "string") {
        userName = data.userName.trim().slice(0, 24);
      }
      if (typeof data.showCatName === "boolean") {
        showCatName = data.showCatName;
      }
      if (typeof data.fixedMessage === "string") {
        fixedMessage = data.fixedMessage.trim().slice(0, 80);
      }
      if (typeof data.showReminderButtonOutside === "boolean") {
        showReminderButtonOutside = data.showReminderButtonOutside;
      }
      if (typeof data.catNamePromptShown === "boolean") {
        catNamePromptShown = data.catNamePromptShown;
      }
      if (typeof data.taskCompleteSoundVolume === "number") {
        taskCompleteSoundVolume = Math.max(0, Math.min(1, data.taskCompleteSoundVolume));
      }
      if (typeof data.petSize === "number") {
        currentPetSize = normalizePetSize(data.petSize);
      }
      currentPetPosition = normalizePetPosition(data.petPosition);
      if (typeof data.pomodoroFocusMin === "number" && data.pomodoroFocusMin > 0) {
        pomodoroFocusMin = Math.max(1, Math.min(180, Math.round(data.pomodoroFocusMin)));
      }
      if (typeof data.pomodoroRestMin === "number" && data.pomodoroRestMin > 0) {
        pomodoroRestSec = Math.max(30, Math.min(60 * 60, Math.round(data.pomodoroRestMin * 60)));
      }
      if (typeof data.pomodoroRestSec === "number" && data.pomodoroRestSec > 0) {
        pomodoroRestSec = Math.max(30, Math.min(60 * 60, Math.round(data.pomodoroRestSec)));
      }
      pomodoroRemainingSec = pomodoroFocusMin * 60;
    }
  } catch {}
}
function saveSettings() {
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify({
      stretchIntervalMin,
      reminders,
      language: currentLanguage,
      catName,
      userName,
      showCatName,
      fixedMessage,
      showReminderButtonOutside,
      catNamePromptShown,
      taskCompleteSoundVolume,
      petSize: currentPetSize,
      petPosition: currentPetPosition,
      pomodoroFocusMin,
      pomodoroRestSec,
    }, null, 2));
  } catch {}
}

function startStretchTimer() {
  if (stretchTimer) {
    clearInterval(stretchTimer);
    stretchTimer = null;
  }
  if (stretchIntervalMin > 0) {
    stretchTimer = setInterval(() => triggerStretchSequence(), stretchIntervalMin * 60 * 1000);
  }
}
function setStretchInterval(min) {
  stretchIntervalMin = normalizeStretchIntervalForBuild(min);
  saveSettings();
  startStretchTimer();
}

function todayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeReminderRepeat(repeat) {
  return ["none", "daily", "weekdays", "weekends", "custom"].includes(repeat) ? repeat : "none";
}

function normalizeReminderDays(days) {
  if (!Array.isArray(days)) return [];
  return [...new Set(days.map((day) => Number(day)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))]
    .sort((a, b) => a - b);
}

function sanitizeReminder(reminder) {
  if (!reminder || typeof reminder !== "object") return null;
  const timeMatch = typeof reminder.time === "string" ? /^(\d{2}):(\d{2})$/.exec(reminder.time) : null;
  const hour = timeMatch ? Number(timeMatch[1]) : -1;
  const minute = timeMatch ? Number(timeMatch[2]) : -1;
  const time = hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59
    ? `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
    : "";
  const message = typeof reminder.message === "string" ? reminder.message.trim().slice(0, 80) : "";
  if (!time || !message) return null;
  let repeat = normalizeReminderRepeat(reminder.repeat);
  const days = normalizeReminderDays(reminder.days);
  if (repeat === "custom" && days.length === 0) repeat = "none";
  return {
    id: typeof reminder.id === "string" && reminder.id ? reminder.id : `reminder-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    time,
    message,
    repeat,
    days,
    enabled: reminder.enabled !== false,
    lastTriggeredDate: typeof reminder.lastTriggeredDate === "string" ? reminder.lastTriggeredDate : "",
    createdAt: typeof reminder.createdAt === "string" ? reminder.createdAt : new Date().toISOString(),
  };
}

function reminderAppliesToday(reminder, date = new Date()) {
  const day = date.getDay();
  if (reminder.repeat === "weekdays") return day >= 1 && day <= 5;
  if (reminder.repeat === "weekends") return day === 0 || day === 6;
  if (reminder.repeat === "custom") return Array.isArray(reminder.days) && reminder.days.includes(day);
  return true;
}

function reminderList() {
  return reminders
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time) || a.createdAt.localeCompare(b.createdAt))
    .map((reminder) => ({ ...reminder }));
}

function broadcastReminders() {
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("reminders-changed", reminderList());
  }
}

function broadcastReminderSettings() {
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("reminder-settings-changed", {
      showButtonOutside: showReminderButtonOutside,
    });
  }
}

function setShowReminderButtonOutside(visible) {
  showReminderButtonOutside = !!visible;
  saveSettings();
  broadcastReminderSettings();
}

function addReminder(payload) {
  const reminder = sanitizeReminder({
    ...payload,
    id: `reminder-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    enabled: true,
    createdAt: new Date().toISOString(),
  });
  if (!reminder) return { ok: false, reason: "invalid" };
  reminders.push(reminder);
  saveSettings();
  broadcastReminders();
  return { ok: true, reminder, reminders: reminderList() };
}

function updateReminder(id, payload) {
  const index = reminders.findIndex((reminder) => reminder.id === id);
  if (index < 0) return { ok: false, reason: "not-found" };
  const current = reminders[index];
  const reminder = sanitizeReminder({
    ...payload,
    id: current.id,
    enabled: true,
    createdAt: current.createdAt,
  });
  if (!reminder) return { ok: false, reason: "invalid" };
  reminder.lastTriggeredDate = "";
  reminders[index] = reminder;
  saveSettings();
  broadcastReminders();
  return { ok: true, reminder, reminders: reminderList() };
}

function deleteReminder(id) {
  const before = reminders.length;
  reminders = reminders.filter((reminder) => reminder.id !== id);
  if (reminders.length !== before) {
    saveSettings();
    broadcastReminders();
  }
  return { ok: true, reminders: reminderList() };
}

function setReminderEnabled(id, enabled) {
  const reminder = reminders.find((item) => item.id === id);
  if (!reminder) return { ok: false, reason: "not-found" };
  reminder.enabled = !!enabled;
  saveSettings();
  broadcastReminders();
  return { ok: true, reminder, reminders: reminderList() };
}

function formatReminderTimeForSpeech(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(time || ""));
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = match[2];
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return "";
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function formatReminderSpeech(message, time) {
  const text = String(message || "").trim();
  if (!text) return "";
  const timeText = formatReminderTimeForSpeech(time);
  const name = String(userName || "").trim();
  const koName = name || "집사야";
  const enName = name || "Human";
  const jaName = name ? `${name}さん` : "ご主人";
  if (currentLanguage === "ko") return `${koName}, ${timeText} "${text}"`;
  if (currentLanguage === "ja") return `${jaName}、${timeText}「${text}」`;
  return `${enName}, ${timeText} "${text}"`;
}

function checkRemindersNow() {
  const now = new Date();
  const key = todayKey(now);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const time = `${hh}:${mm}`;
  let changed = false;
  for (const reminder of reminders) {
    if (!reminder.enabled || reminder.time !== time || reminder.lastTriggeredDate === key) continue;
    if (!reminderAppliesToday(reminder, now)) continue;
    reminder.lastTriggeredDate = key;
    changed = true;
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send("reminder-triggered", {
        id: reminder.id,
        text: formatReminderSpeech(reminder.message, reminder.time),
      });
    }
    if (reminder.repeat === "none") {
      reminder.enabled = false;
    }
  }
  if (changed) {
    saveSettings();
    broadcastReminders();
  }
}

function startReminderTimer() {
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = setInterval(checkRemindersNow, 15 * 1000);
  checkRemindersNow();
}

function stopReminderTimer() {
  if (!reminderTimer) return;
  clearInterval(reminderTimer);
  reminderTimer = null;
}

function setLanguage(language) {
  currentLanguage = normalizeLanguage(language);
  saveSettings();
  buildAppMenu();
  if (licenseWin && !licenseWin.isDestroyed()) {
    licenseWin.setTitle(t("licenseWindowTitle"));
    licenseWin.webContents.send("language-changed", currentLanguage);
  }
  if (patternWin && !patternWin.isDestroyed()) {
    patternWin.setTitle(t("patternEditorTitle"));
    patternWin.webContents.send("language-changed", currentLanguage);
  }
  if (mappingWin && !mappingWin.isDestroyed()) {
    mappingWin.setTitle(t("mappingEditorTitle"));
  }
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("language-changed", currentLanguage);
  }
}

function broadcastCatNameSettings() {
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("cat-name-changed", { name: catName, visible: showCatName });
  }
}

function broadcastUserNameSettings() {
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("user-name-changed", { name: userName });
  }
}

function broadcastFixedMessageSettings() {
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("fixed-message-changed", { message: fixedMessage });
  }
}

function setCatName(value) {
  const next = String(value || "").trim().slice(0, 24) || "Catjang";
  catName = next;
  saveSettings();
  broadcastCatNameSettings();
  return { name: catName, visible: showCatName };
}

function setUserName(value) {
  userName = String(value || "").trim().slice(0, 24);
  saveSettings();
  broadcastUserNameSettings();
  return { name: userName };
}

function setShowCatName(visible) {
  showCatName = !!visible;
  saveSettings();
  broadcastCatNameSettings();
  return { name: catName, visible: showCatName };
}

function setFixedMessage(value) {
  fixedMessage = String(value || "").trim().slice(0, 80);
  saveSettings();
  broadcastFixedMessageSettings();
  return { message: fixedMessage };
}

function markCatNamePromptShown() {
  if (catNamePromptShown) return;
  catNamePromptShown = true;
  saveSettings();
}

function broadcastTaskCompleteSoundVolume() {
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("task-complete-sound-volume", taskCompleteSoundVolume);
  }
}

function setTaskCompleteSoundVolume(volume) {
  taskCompleteSoundVolume = Math.max(0, Math.min(1, Number(volume) || 0));
  saveSettings();
  broadcastTaskCompleteSoundVolume();
  return taskCompleteSoundVolume;
}

function pomodoroPhaseDurationSec(mode = pomodoroMode) {
  return mode === "rest" ? pomodoroRestSec : pomodoroFocusMin * 60;
}

function pomodoroState() {
  return {
    visible: pomodoroVisible,
    running: pomodoroRunning,
    mode: pomodoroMode,
    remainingSec: Math.max(0, pomodoroRemainingSec),
    focusMin: pomodoroFocusMin,
    restSec: pomodoroRestSec,
  };
}

function broadcastPomodoroState() {
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("pomodoro-state", pomodoroState());
  }
}

function stopPomodoroTimer() {
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
  }
}

function startPomodoroTimer() {
  stopPomodoroTimer();
  pomodoroTimer = setInterval(() => {
    if (!pomodoroRunning) return;
    pomodoroRemainingSec -= 1;
    if (pomodoroRemainingSec <= 0) {
      const completedMode = pomodoroMode;
      pomodoroMode = completedMode === "focus" ? "rest" : "focus";
      pomodoroRemainingSec = pomodoroPhaseDurationSec(pomodoroMode);
      if (petWin && !petWin.isDestroyed()) {
        petWin.webContents.send("pomodoro-complete", {
          completedMode,
          nextMode: pomodoroMode,
        });
      }
      if (completedMode === "focus") {
        triggerStretchSequence();
      } else {
        triggerPomodoroFocusStartSequence();
      }
    }
    broadcastPomodoroState();
  }, 1000);
}

function startPomodoro() {
  pomodoroVisible = true;
  if (pomodoroRemainingSec <= 0) pomodoroRemainingSec = pomodoroPhaseDurationSec();
  pomodoroRunning = true;
  startPomodoroTimer();
  broadcastPomodoroState();
}

function pausePomodoro() {
  pomodoroRunning = false;
  stopPomodoroTimer();
  broadcastPomodoroState();
}

function resetPomodoro() {
  pomodoroRunning = false;
  pomodoroVisible = false;
  pomodoroMode = "focus";
  pomodoroRemainingSec = pomodoroPhaseDurationSec("focus");
  stopPomodoroTimer();
  broadcastPomodoroState();
}

function setPomodoroFocusMin(min) {
  pomodoroFocusMin = Math.max(1, Math.min(180, Math.round(min)));
  if (!pomodoroRunning && pomodoroMode === "focus") {
    pomodoroRemainingSec = pomodoroPhaseDurationSec("focus");
  }
  saveSettings();
  broadcastPomodoroState();
}

function setPomodoroRestSec(sec) {
  pomodoroRestSec = Math.max(30, Math.min(60 * 60, Math.round(sec)));
  if (!pomodoroRunning && pomodoroMode === "rest") {
    pomodoroRemainingSec = pomodoroPhaseDurationSec("rest");
  }
  saveSettings();
  broadcastPomodoroState();
}

const DEFAULT_SIZE = 100;
const PET_SIZE_OPTIONS = [60, 80, 100, 120, 140, 160, 200, 240];
// 윈도우 너비는 캐릭터 주변 여유와 말풍선 폭을 함께 담을 만큼 확보한다.
const WINDOW_WIDTH_RATIO = 2;
const MIN_WINDOW_WIDTH = 500;
const WINDOW_EXTRA_RIGHT_PX = 2;
let lastPetDragAt = 0;
let currentPetSize = DEFAULT_SIZE;
let currentPetPosition = null;

function windowDims(charSize, widthRatio = WINDOW_WIDTH_RATIO) {
  return {
    width: Math.max(MIN_WINDOW_WIDTH, charSize * widthRatio + WINDOW_EXTRA_RIGHT_PX),
    height: Math.round(charSize * STRETCH_RATIO),
  };
}

function defaultPetPosition(display, width, height) {
  const bounds = display.bounds;
  return {
    x: bounds.x + bounds.width - width - 80,
    y: bounds.y + bounds.height - height - 100,
  };
}

function petPositionIsVisible(position, width, height) {
  if (!position) return false;
  return screen.getAllDisplays().some((display) => {
    const bounds = display.bounds;
    return (
      position.x + width > bounds.x + 20 &&
      position.x < bounds.x + bounds.width - 20 &&
      position.y + height > bounds.y + 20 &&
      position.y < bounds.y + bounds.height - 20
    );
  });
}

function resizePetBy(delta) {
  if (!petWin || petWin.isDestroyed()) return;
  if (Date.now() - lastPetDragAt < 500) return;
  const b = petWin.getBounds();
  currentPetSize = normalizePetSize(currentPetSize + delta);
  const { width, height } = windowDims(currentPetSize);
  petWin.setBounds({ x: b.x, y: b.y, width, height });
  currentPetPosition = { x: b.x, y: b.y };
  saveSettings();
}

function setPetSize(size) {
  if (!petWin || petWin.isDestroyed()) return;
  if (Date.now() - lastPetDragAt < 500) return;
  const b = petWin.getBounds();
  currentPetSize = normalizePetSize(size);
  const { width, height } = windowDims(currentPetSize);
  petWin.setBounds({ x: b.x, y: b.y, width, height });
  currentPetPosition = { x: b.x, y: b.y };
  saveSettings();
}

function resetPetSize() {
  if (!petWin || petWin.isDestroyed()) return;
  const b = petWin.getBounds();
  currentPetSize = normalizePetSize(DEFAULT_SIZE);
  const { width, height } = windowDims(currentPetSize);
  petWin.setBounds({ x: b.x, y: b.y, width, height });
  currentPetPosition = { x: b.x, y: b.y };
  saveSettings();
}

function keepWindowOnTop(win) {
  if (!win || win.isDestroyed()) return;
  try {
    win.setAlwaysOnTop(true, IS_MAC ? "screen-saver" : "pop-up-menu");
  } catch {
    win.setAlwaysOnTop(true);
  }
  if (!IS_WINDOWS && typeof win.setVisibleOnAllWorkspaces === "function") {
    try {
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } catch {}
  }
}

function attachWindowDiagnostics(win, label) {
  if (!win || !win.webContents) return;
  win.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    logError(`[Catjang] ${label} failed to load:`, { errorCode, errorDescription, validatedURL });
  });
  win.webContents.on("render-process-gone", (_event, details) => {
    logError(`[Catjang] ${label} render process gone:`, details);
  });
  win.on("unresponsive", () => {
    logWarn(`[Catjang] ${label} window became unresponsive`);
  });
}

function createPetWindow() {
  if (petWin && !petWin.isDestroyed()) return;
  const display = screen.getPrimaryDisplay();
  const { width: W, height: H } = windowDims(currentPetSize);
  const initialPosition = petPositionIsVisible(currentPetPosition, W, H) ?
    currentPetPosition :
    defaultPetPosition(display, W, H);

  petWin = new BrowserWindow({
    width: W,
    height: H,
    x: initialPosition.x,
    y: initialPosition.y,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    hasShadow: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    focusable: true,
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  attachWindowDiagnostics(petWin, "pet");
  keepWindowOnTop(petWin);
  petWin.loadFile(path.join(__dirname, "renderer", "index.html"));
  petWin.webContents.on("did-finish-load", () => {
    broadcastPattern();
    broadcastCatNameSettings();
    broadcastUserNameSettings();
    broadcastFixedMessageSettings();
    broadcastPomodoroState();
    broadcastTaskCompleteSoundVolume();
    broadcastReminders();
    broadcastReminderSettings();
    if (!catNamePromptShown) {
      setTimeout(() => {
        if (!petWin || petWin.isDestroyed() || catNamePromptShown) return;
        petWin.webContents.send("cat-name-edit", catName);
      }, 1000);
    }
  });
  if (!app.isPackaged) petWin.webContents.openDevTools({ mode: "detach" });

  // 60Hz 마우스 위치 폴링 → renderer로 dx/dy 전송
  cursorPollTimer = setInterval(() => {
    if (!petWin || petWin.isDestroyed()) return;
    const cursor = screen.getCursorScreenPoint();
    const b = petWin.getBounds();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    petWin.webContents.send("cursor-pos", {
      dx: cursor.x - cx,
      dy: cursor.y - cy,
    });
  }, 16);

  petWin.on("closed", () => {
    if (cursorPollTimer) clearInterval(cursorPollTimer);
    petWin = null;
  });
}

function createLicenseWindow(initialReason = "") {
  if (licenseWin && !licenseWin.isDestroyed()) {
    licenseWin.focus();
    if (initialReason) licenseWin.webContents.once("did-finish-load", () => {
      licenseWin.webContents.send("license-error", initialReason);
    });
    return;
  }

  licenseWin = new BrowserWindow({
    width: 440,
    height: 420,
    title: t("licenseWindowTitle"),
    icon: APP_ICON_PATH,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    backgroundColor: "#f7f4ef",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  licenseWin.setMenu(null);
  attachWindowDiagnostics(licenseWin, "license");
  licenseWin.webContents.on("before-input-event", (event, input) => {
    const isCommand = input.meta || input.control;
    if (!isCommand || input.type !== "keyDown") return;
    const key = String(input.key || "").toLowerCase();
    if (key === "v") {
      licenseWin.webContents.paste();
      event.preventDefault();
    } else if (key === "c") {
      licenseWin.webContents.copy();
      event.preventDefault();
    } else if (key === "x") {
      licenseWin.webContents.cut();
      event.preventDefault();
    } else if (key === "a") {
      licenseWin.webContents.selectAll();
      event.preventDefault();
    }
  });
  licenseWin.loadFile(path.join(__dirname, "license", "index.html"));
  if (initialReason) {
    licenseWin.webContents.once("did-finish-load", () => {
      licenseWin.webContents.send("license-error", initialReason);
    });
  }
  licenseWin.on("closed", () => {
    licenseWin = null;
    if (!petWin || petWin.isDestroyed()) app.quit();
  });
}

function startLicensedApp() {
  createPetWindow();
  startKeyHook();
  startAgentIntegrations();
  startStretchTimer();
  startReminderTimer();
  if (licenseWin && !licenseWin.isDestroyed()) {
    licenseWin.close();
  }
}

function stopKeyHook() {
  if (keyHookRetryTimer) {
    clearInterval(keyHookRetryTimer);
    keyHookRetryTimer = null;
  }
  if (keyHookStarted) {
    if (uIOhook) {
      try { uIOhook.stop(); } catch {}
    }
    keyHookStarted = false;
  }
}

function returnToLicenseWindow(reason = "invalid") {
  stopKeyHook();
  stopAgentIntegrations();
  if (stretchTimer) {
    clearInterval(stretchTimer);
    stretchTimer = null;
  }
  stopReminderTimer();
  stopPomodoroTimer();
  hideShareCaptureOverlay();
  createLicenseWindow(String(reason || "invalid"));
  if (patternWin && !patternWin.isDestroyed()) patternWin.close();
  if (mappingWin && !mappingWin.isDestroyed()) mappingWin.close();
  if (petWin && !petWin.isDestroyed()) petWin.close();
}

// ── 패턴 에디터 윈도우 ──
function openPatternEditor() {
  if (patternWin && !patternWin.isDestroyed()) {
    patternWin.focus();
    return;
  }
  patternWin = new BrowserWindow({
    width: 860,
    height: 700,
    title: t("patternEditorTitle"),
    backgroundColor: "#1e1e1e",
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  patternWin.setMenu(null);
  patternWin.loadFile(path.join(__dirname, "editor", "index.html"));
  patternWin.on("closed", () => { patternWin = null; });
}

function openMappingEditor() {
  if (mappingWin && !mappingWin.isDestroyed()) {
    mappingWin.focus();
    return;
  }
  mappingWin = new BrowserWindow({
    width: 1180,
    height: 780,
    title: t("mappingEditorTitle"),
    backgroundColor: "#1e1e1e",
    icon: APP_ICON_PATH,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mappingWin.setMenu(null);
  mappingWin.loadFile(path.join(__dirname, "mapping-editor", "index.html"));
  mappingWin.on("closed", () => { mappingWin = null; });
}

function cellMappingsPath() {
  return path.join(__dirname, "renderer", "cell-mappings.js");
}

function serializeCellMappings(mappings) {
  return `/* eslint-disable */\n// 자동 생성 — 모든 cell의 svg pixel 매핑이 명시적으로 기록됨.\n// 각 entry: "cellX,cellY": [[dx1, dy1], [dx2, dy2], ...] (origin 기준 offset)\n// 사용자가 특정 cell의 매핑을 수정하려면 그 entry만 직접 변경하면 됨.\n(function () {\n  const MAPPINGS = ${JSON.stringify(mappings, null, 2)};\n\n  // 특정 cell의 픽셀 좌표 반환 (절대 svg 좌표).\n  // svgName: 'cat-idle-follow-v2', 'press-left' 등. elemId: 'head', 'leg-fl' 등.\n  function getPixelsForCell(svgName, elemId, cellX, cellY) {\n    const key = \`${"${svgName}"}:${"${elemId}"}\`;\n    const m = MAPPINGS[key];\n    if (!m) return null;\n    const cell = m.cells[\`${"${cellX}"},${"${cellY}"}\`];\n    if (!cell) return [];\n    const [ox, oy] = m.origin;\n    return cell.map(([dx, dy]) => ({ x: ox + dx, y: oy + dy }));\n  }\n\n  window.cellMappings = { MAPPINGS, getPixelsForCell };\n})();\n`;
}

function loadCellMappings() {
  const filePath = cellMappingsPath();
  if (!fs.existsSync(filePath)) return null;
  const source = fs.readFileSync(filePath, "utf8");
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: filePath });
  const mappings = sandbox.window && sandbox.window.cellMappings && sandbox.window.cellMappings.MAPPINGS;
  return mappings && typeof mappings === "object" ? mappings : null;
}

// ── IPC: renderer → main ──

// 패턴 — 에디터/펫 윈도우 양방향
ipcMain.handle("pattern-get", () => currentPattern);
ipcMain.handle("pattern-presets-get", () => {
  const builtinPresets = PATTERN_PRESETS.map((preset) => {
    try {
      const raw = fs.readFileSync(patternPresetPath(preset.file), "utf8");
      return {
        id: preset.id,
        label: preset.label,
        source: "builtin",
        image: preset.image,
        pattern: sanitizePattern(JSON.parse(raw)),
      };
    } catch {
      return null;
    }
  }).filter(Boolean);
  const customPresets = loadCustomPatternPresets().map(customPatternPresetPayload);
  return [...builtinPresets, ...customPresets];
});
ipcMain.handle("pattern-custom-preset-save", (_evt, payload) => {
  const name = typeof payload?.name === "string" ? payload.name.trim().slice(0, 60) : "";
  const now = new Date().toISOString();
  const presets = loadCustomPatternPresets();
  const pattern = sanitizePattern(payload?.pattern);
  const patternSignature = JSON.stringify(pattern);
  let preset = null;
  if (typeof payload?.id === "string" && payload.id.startsWith("custom-")) {
    preset = presets.find((item) => item.id === payload.id);
  }
  if (preset) {
    if (name) preset.name = name;
    preset.pattern = pattern;
    preset.updatedAt = now;
  } else {
    preset = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name || "My preset",
      createdAt: now,
      updatedAt: now,
      pattern,
    };
    const duplicate = presets.find((item) => item.name === preset.name && JSON.stringify(item.pattern) === patternSignature);
    if (duplicate) return customPatternPresetPayload(duplicate);
    presets.unshift(preset);
  }
  saveCustomPatternPresets(presets);
  return customPatternPresetPayload(preset);
});
ipcMain.handle("pattern-custom-preset-delete", (_evt, id) => {
  if (typeof id !== "string" || !id.startsWith("custom-")) return { ok: false };
  const presets = loadCustomPatternPresets();
  const next = presets.filter((preset) => preset.id !== id);
  saveCustomPatternPresets(next);
  return { ok: next.length !== presets.length };
});
ipcMain.handle("pattern-custom-preset-rename", (_evt, payload) => {
  const id = typeof payload?.id === "string" ? payload.id : "";
  const name = typeof payload?.name === "string" ? payload.name.trim().slice(0, 60) : "";
  if (!id.startsWith("custom-") || !name) return { ok: false };
  const presets = loadCustomPatternPresets();
  const preset = presets.find((item) => item.id === id);
  if (!preset) return { ok: false };
  preset.name = uniqueCustomPatternPresetName(name, presets.filter((item) => item.id !== id));
  preset.updatedAt = new Date().toISOString();
  saveCustomPatternPresets(presets);
  return { ok: true, preset: customPatternPresetPayload(preset) };
});
ipcMain.handle("pattern-custom-presets-export", async (_evt, id) => {
  const allPresets = loadCustomPatternPresets();
  const presets = typeof id === "string" && id.startsWith("custom-")
    ? allPresets.filter((preset) => preset.id === id)
    : allPresets;
  if (presets.length === 0) return { ok: false, count: 0 };
  const result = await dialog.showSaveDialog(patternWin || petWin || undefined, {
    title: "Export custom presets",
    defaultPath: customPatternPresetExportName(presets.length === 1 ? presets[0].name : ""),
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  const preset = presets[0];
  writeJsonFile(result.filePath, {
    schemaVersion: 2,
    app: "catjang",
    exportedAt: new Date().toISOString(),
    preset: {
      name: preset.name,
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
      pattern: sanitizePattern(preset.pattern),
    },
  });
  return { ok: true, count: 1, filePath: result.filePath };
});
ipcMain.handle("pattern-custom-presets-import", async () => {
  const result = await dialog.showOpenDialog(patternWin || petWin || undefined, {
    title: "Import custom presets",
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (result.canceled || !result.filePaths || !result.filePaths[0]) return { ok: false, canceled: true };
  const data = readJsonFile(result.filePaths[0]);
  const imported = normalizeImportedCustomPresets(data);
  if (imported.length === 0) return { ok: false, imported: 0 };
  const now = new Date().toISOString();
  const existingPresets = loadCustomPatternPresets();
  const namesInUse = [...existingPresets];
  const nextImported = imported.map((preset) => {
    const name = uniqueCustomPatternPresetName(preset.name, namesInUse);
    const nextPreset = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      createdAt: preset.createdAt || now,
      updatedAt: now,
      pattern: preset.pattern,
    };
    namesInUse.push(nextPreset);
    return nextPreset;
  });
  saveCustomPatternPresets([...nextImported, ...existingPresets]);
  return { ok: true, imported: nextImported.length, selectedId: nextImported[0]?.id || null };
});
ipcMain.on("pattern-set", (_evt, pattern) => {
  if (!pattern || typeof pattern !== "object") return;
  currentPattern = sanitizePattern(pattern);
  savePattern();
  broadcastPattern();
});
ipcMain.handle("pattern-confirm-clear-all", async (_evt, message) => {
  const result = await dialog.showMessageBox(patternWin || petWin || undefined, {
    type: "warning",
    title: t("patternEditorTitle"),
    message: typeof message === "string" && message.trim() ? message : "Clear spots from every part?",
    buttons: [t("reset"), t("later")],
    defaultId: 1,
    cancelId: 1,
    icon: nativeImage.createFromPath(APP_ICON_PATH),
  });
  return result.response === 0;
});
ipcMain.handle("pattern-confirm-delete-preset", async (_evt, message) => {
  const result = await dialog.showMessageBox(patternWin || petWin || undefined, {
    type: "warning",
    title: t("patternEditorTitle"),
    message: typeof message === "string" && message.trim() ? message : "Delete this preset?",
    buttons: [t("delete"), t("later")],
    defaultId: 1,
    cancelId: 1,
    icon: nativeImage.createFromPath(APP_ICON_PATH),
  });
  return result.response === 0;
});
ipcMain.handle("pattern-confirm-discard-changes", async (_evt, message) => {
  const result = await dialog.showMessageBox(patternWin || petWin || undefined, {
    type: "warning",
    title: t("patternEditorTitle"),
    message: typeof message === "string" && message.trim() ? message : "Discard unsaved changes?",
    buttons: [t("reset"), t("later")],
    defaultId: 1,
    cancelId: 1,
    icon: nativeImage.createFromPath(APP_ICON_PATH),
  });
  return result.response === 0;
});
ipcMain.on("open-pattern-editor", () => openPatternEditor());
ipcMain.on("open-mapping-editor", () => openMappingEditor());
ipcMain.handle("mapping-load", () => {
  try {
    return loadCellMappings();
  } catch (error) {
    console.warn("[Catjang] failed to load cell mappings:", error && error.message ? error.message : error);
    return null;
  }
});
ipcMain.handle("mapping-save", (_evt, mappings) => {
  if (!mappings || typeof mappings !== "object") return { ok: false, reason: "invalid-mappings" };
  try {
    fs.writeFileSync(cellMappingsPath(), serializeCellMappings(mappings));
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error && error.message ? error.message : "mapping-save-failed" };
  }
});
ipcMain.handle("svg-load", (_evt, svgName) => {
  const safeName = path.basename(String(svgName || "")).replace(/\.svg$/i, "");
  if (!safeName) return null;
  const filePath = path.join(__dirname, "svg", `${safeName}.svg`);
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function shareTargetPointForBounds(bounds) {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + Math.round(bounds.height * 0.24),
  };
}

function shareCropForDisplay(display, targetPoint, petBounds) {
  const { x, y, width, height } = display.bounds;
  const targetAspect = 9 / 16;
  const petWidth = petBounds && petBounds.height ? petBounds.height / STRETCH_RATIO : currentPetSize;
  let cropW = Math.round(petWidth * 4);
  let cropH = Math.round(cropW / targetAspect);
  const maxCropW = width;
  const maxCropH = height;
  if (cropW > maxCropW || cropH > maxCropH) {
    const fitScale = Math.min(maxCropW / cropW, maxCropH / cropH);
    cropW = Math.max(180, Math.round(cropW * fitScale));
    cropH = Math.round(cropW / targetAspect);
  }

  const cropX = clamp(Math.round(targetPoint.x - cropW / 2), x, x + width - cropW);
  const cropY = clamp(Math.round(targetPoint.y - cropH / 2), y, y + height - cropH);
  return {
    x: cropX - x,
    y: cropY - y,
    width: cropW,
    height: cropH,
  };
}

function shareControlsBoundsForCrop(display, crop) {
  const bounds = display.bounds;
  const controlsWidth = 118;
  const controlsHeight = 30;
  const controlsInsetY = 0;
  const controlsX = bounds.x + Math.round(crop.x + crop.width / 2 - controlsWidth / 2);
  const controlsY = bounds.y + crop.y + controlsInsetY;
  return {
    x: clamp(controlsX, bounds.x + 8, bounds.x + bounds.width - controlsWidth - 8),
    y: clamp(controlsY, bounds.y + 8, bounds.y + bounds.height - controlsHeight - 8),
    width: controlsWidth,
    height: controlsHeight,
  };
}

function defaultShareVideoPath(extension) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return path.join(app.getPath("downloads"), `catjang-${stamp}.${extension}`);
}

function hideShareCaptureOverlay() {
  if (shareOverlayWin && !shareOverlayWin.isDestroyed()) {
    shareOverlayWin.close();
  }
  if (shareControlsWin && !shareControlsWin.isDestroyed()) {
    shareControlsWin.close();
  }
  shareOverlayWin = null;
  shareControlsWin = null;
}

function recordShareCropKeyframe(crop, { force = false } = {}) {
  if (!shareCaptureSession || !crop) return;
  const elapsedSec = Math.max(0, (Date.now() - shareCaptureSession.startedAt) / 1000);
  const keyframe = {
    t: Number(elapsedSec.toFixed(3)),
    x: evenInt(crop.x, 0),
    y: evenInt(crop.y, 0),
  };
  const prev = shareCaptureSession.cropKeyframes[shareCaptureSession.cropKeyframes.length - 1];
  if (prev && prev.x === keyframe.x && prev.y === keyframe.y) return;
  if (!force && prev && keyframe.t - prev.t < SHARE_VIDEO_KEYFRAME_INTERVAL_SEC) return;
  shareCaptureSession.cropKeyframes.push(keyframe);
}

function updateShareCaptureOverlay(crop, { forceKeyframe = false } = {}) {
  if (!shareCaptureSession || !crop) return;
  shareCaptureSession.crop = crop;
  recordShareCropKeyframe(crop, { force: forceKeyframe });

  if (shareOverlayWin && !shareOverlayWin.isDestroyed()) {
    const safeCrop = {
      x: Math.max(0, Math.round(crop.x)),
      y: Math.max(0, Math.round(crop.y)),
      width: Math.max(0, Math.round(crop.width)),
      height: Math.max(0, Math.round(crop.height)),
    };
    shareOverlayWin.webContents.send("share-crop-update", safeCrop);
  }

  if (shareControlsWin && !shareControlsWin.isDestroyed()) {
    shareControlsWin.setBounds(shareControlsBoundsForCrop(shareCaptureSession.display, crop), false);
  }
}

function updateShareCaptureForPetBounds(bounds, options = {}) {
  if (!shareCaptureSession || !bounds) return;
  const crop = shareCropForDisplay(
    shareCaptureSession.display,
    shareTargetPointForBounds(bounds),
    bounds
  );
  updateShareCaptureOverlay(crop, options);
}

function showShareCaptureOverlay(display, crop, durationMs) {
  hideShareCaptureOverlay();
  if (!display || !crop) return;

  const bounds = display.bounds;
  const durationSec = Math.max(5, Math.min(30, Math.round((Number(durationMs) || 5000) / 1000)));
  const controlsBounds = shareControlsBoundsForCrop(display, crop);
  const overlay = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "renderer", "share-overlay-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  overlay.setIgnoreMouseEvents(true);
  keepWindowOnTop(overlay);
  overlay.loadFile(path.join(__dirname, "renderer", "share-overlay.html"));
  overlay.webContents.once("did-finish-load", () => {
    const safeCrop = {
      x: Math.max(0, Math.round(crop.x)),
      y: Math.max(0, Math.round(crop.y)),
      width: Math.max(0, Math.round(crop.width)),
      height: Math.max(0, Math.round(crop.height)),
    };
    overlay.webContents.send("share-overlay-init", safeCrop);
  });
  shareOverlayWin = overlay;

  const controls = new BrowserWindow({
    x: controlsBounds.x,
    y: controlsBounds.y,
    width: controlsBounds.width,
    height: controlsBounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "renderer", "share-controls-preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  keepWindowOnTop(controls);
  controls.loadFile(path.join(__dirname, "renderer", "share-controls.html"));
  controls.webContents.once("did-finish-load", () => {
    controls.webContents.send("share-controls-init", { durationSec });
  });
  shareControlsWin = controls;
}

function evenInt(value, fallback) {
  const next = Math.max(0, Math.round(Number(value) || fallback || 0));
  return next % 2 === 0 ? next : next - 1;
}

function ffmpegFilterForShareVideo(crop, output) {
  const sourceW = Math.max(2, evenInt(crop && crop.width, 1080));
  const sourceH = Math.max(2, evenInt(crop && crop.height, 1920));
  const videoW = Math.max(sourceW, evenInt(crop && crop.source && crop.source.width, sourceW));
  const videoH = Math.max(sourceH, evenInt(crop && crop.source && crop.source.height, sourceH));
  const guardX = Math.min(SHARE_VIDEO_CROP_GUARD_X_PX, Math.floor(sourceW / 20));
  const guardTop = Math.min(SHARE_VIDEO_CROP_GUARD_TOP_PX, Math.floor(sourceH / 12));
  const guardBottom = Math.min(SHARE_VIDEO_CROP_GUARD_BOTTOM_PX, Math.floor(sourceH / 20));
  const targetAspect = 9 / 16;
  const usableH = Math.max(2, sourceH - guardTop - guardBottom);
  const cropW = Math.max(2, evenInt(sourceW - guardX * 2, sourceW));
  const cropH = Math.max(2, evenInt(Math.min(usableH, cropW / targetAspect), usableH));
  const xOffset = evenInt((sourceW - cropW) / 2, guardX);
  const yOffset = evenInt(guardTop + (usableH - cropH) / 2, guardTop);
  const maxX = Math.max(0, videoW - cropW);
  const maxY = Math.max(0, videoH - cropH);
  const keyframes = Array.isArray(crop && crop.keyframes) && crop.keyframes.length > 0
    ? crop.keyframes
    : [{ t: 0, x: crop && crop.x, y: crop && crop.y }];
  const cropX = ffmpegCropExpression(keyframes, "x", xOffset, maxX);
  const cropY = ffmpegCropExpression(keyframes, "y", yOffset, maxY);
  const outputW = Math.max(2, evenInt(output && output.width, 1080));
  const outputH = Math.max(2, evenInt(output && output.height, 1920));
  return `crop=${cropW}:${cropH}:${cropX}:${cropY}:exact=1,scale=${outputW}:${outputH}:flags=lanczos,fps=30`;
}

function ffmpegCropExpression(keyframes, axis, offset = 0, maxValue = Number.POSITIVE_INFINITY) {
  const maxEvenValue = Number.isFinite(maxValue) ? evenInt(maxValue, 0) : Number.POSITIVE_INFINITY;
  const normalized = keyframes
    .map((keyframe) => ({
      t: Math.max(0, Number(keyframe.t) || 0),
      value: evenInt(Math.min(maxEvenValue, Math.max(0, evenInt((Number(keyframe[axis]) || 0) + offset, 0))), 0),
    }))
    .sort((a, b) => a.t - b.t);
  if (normalized.length === 0) return "'0'";

  const unique = [];
  for (const keyframe of normalized) {
    const prev = unique[unique.length - 1];
    if (prev && Math.abs(prev.t - keyframe.t) < 0.001) {
      prev.value = keyframe.value;
    } else {
      unique.push(keyframe);
    }
  }

  let expression = String(unique[unique.length - 1].value);
  for (let i = unique.length - 2; i >= 0; i--) {
    const current = unique[i];
    const next = unique[i + 1];
    const duration = Math.max(0.001, next.t - current.t);
    const delta = next.value - current.value;
    const linear = delta === 0
      ? String(current.value)
      : `(${current.value}+${delta}*(t-${current.t.toFixed(3)})/${duration.toFixed(3)})`;
    const evenLinear = `trunc((${linear})/2)*2`;
    expression = `if(lt(t,${next.t.toFixed(3)}),${evenLinear},${expression})`;
  }
  return `'${expression}'`;
}

function fallbackShareCrop(crop) {
  if (!crop) return crop;
  return {
    ...crop,
    keyframes: null,
  };
}

function convertShareVideoToMp4(inputPath, outputPath, options = {}) {
  if (!ffmpegPath) {
    return Promise.reject(new Error("ffmpeg binary is not available."));
  }
  if (!fs.existsSync(ffmpegPath)) {
    return Promise.reject(new Error(`ffmpeg binary does not exist: ${ffmpegPath}`));
  }

  const filter = ffmpegFilterForShareVideo(options.crop, options.output);
  const args = [
    "-y",
    "-i", inputPath,
    "-an",
    "-vf", filter,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    outputPath,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${stderr.trim() || `ffmpeg exited with code ${code}`}\nffmpeg: ${ffmpegPath}\nFilter: ${filter}`));
    });
  });
}

ipcMain.handle("share-capture-options", async (_evt, request = {}) => {
  if (!petWin || petWin.isDestroyed()) return null;
  const durationMs = Math.max(5000, Math.min(30000, Math.round(Number(request.durationMs) || 5000)));
  const b = petWin.getBounds();
  const targetPoint = shareTargetPointForBounds(b);
  const display = screen.getDisplayNearestPoint(targetPoint);
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 0, height: 0 },
  });
  const source = sources.find((s) => String(s.display_id) === String(display.id)) || sources[0];
  if (!source) return null;
  const crop = shareCropForDisplay(display, targetPoint, b);
  shareCaptureSession = {
    display,
    startedAt: Date.now(),
    crop,
    cropKeyframes: [{
      t: 0,
      x: evenInt(crop.x, 0),
      y: evenInt(crop.y, 0),
    }],
  };
  showShareCaptureOverlay(display, crop, durationMs);
  return {
    sourceId: source.id,
    crop,
    displayBounds: display.bounds,
    petBounds: b,
    output: { width: 1080, height: 1920 },
    durationMs,
  };
});

ipcMain.handle("share-capture-overlay-hide", () => {
  hideShareCaptureOverlay();
  return { ok: true };
});

ipcMain.handle("share-capture-started", () => {
  if (shareCaptureSession) {
    shareCaptureSession.startedAt = Date.now();
    shareCaptureSession.cropKeyframes = [{
      t: 0,
      x: evenInt(shareCaptureSession.crop && shareCaptureSession.crop.x, 0),
      y: evenInt(shareCaptureSession.crop && shareCaptureSession.crop.y, 0),
    }];
  }
  return { ok: true };
});

ipcMain.handle("share-error-dialog", async (_evt, message) => {
  await dialog.showMessageBox(petWin || undefined, {
    type: "warning",
    title: t("shareVideoTitle"),
    message: typeof message === "string" && message.trim()
      ? message
      : t("shareRecordingFailed"),
    buttons: ["OK"],
    defaultId: 0,
    cancelId: 0,
    icon: nativeImage.createFromPath(APP_ICON_PATH),
  });
  return { ok: true };
});

ipcMain.on("share-capture-cancel", () => {
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("share-capture-cancel");
  }
  shareCaptureSession = null;
});

ipcMain.handle("share-video-save", async (_evt, payload) => {
  if (!payload || !payload.bytes) return { ok: false, reason: "missing-data" };
  const { canceled, filePath } = await dialog.showSaveDialog(petWin || undefined, {
    title: t("shareVideoSaveTitle"),
    defaultPath: defaultShareVideoPath("mp4"),
    filters: [
      { name: "MP4 Video", extensions: ["mp4"] },
    ],
  });
  if (canceled || !filePath) return { ok: false, canceled: true };

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "catjang-share-"));
  const inputPath = path.join(tempDir, `source.${payload.extension === "mp4" ? "mp4" : "webm"}`);
  try {
    fs.writeFileSync(inputPath, Buffer.from(payload.bytes));
    const scaleX = Number(payload.scale && payload.scale.x) || 1;
    const scaleY = Number(payload.scale && payload.scale.y) || 1;
    if (shareCaptureSession && shareCaptureSession.crop) {
      recordShareCropKeyframe(shareCaptureSession.crop, { force: true });
    }
    const cropKeyframes = shareCaptureSession && Array.isArray(shareCaptureSession.cropKeyframes)
      ? shareCaptureSession.cropKeyframes.map((keyframe) => ({
        t: keyframe.t,
        x: keyframe.x * scaleX,
        y: keyframe.y * scaleY,
      }))
      : null;
    const convertOptions = {
      crop: {
        ...payload.crop,
        source: payload.source,
        keyframes: cropKeyframes,
      },
      output: payload.output,
    };
    try {
      try {
        await convertShareVideoToMp4(inputPath, filePath, convertOptions);
      } catch (primaryError) {
        console.error("Share video conversion failed, retrying with static crop:", primaryError);
        await convertShareVideoToMp4(inputPath, filePath, {
          crop: fallbackShareCrop(convertOptions.crop),
          output: payload.output,
        });
      }
      return { ok: true, filePath };
    } catch (error) {
      console.error("Share video conversion failed:", error);
      return {
        ok: false,
        reason: "conversion-failed",
        message: error && error.message ? error.message : "ffmpeg conversion failed",
      };
    }
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
    shareCaptureSession = null;
  }
});

ipcMain.handle("license-activate", async (_evt, licenseKey) => {
  const license = await activateLicenseKey(licenseKey);
  startLicensedApp();
  return {
    ok: true,
    productName: license.productName || null,
    customerEmail: license.customerEmail || null,
  };
});

ipcMain.handle("license-current", () => {
  const license = loadLicense();
  if (!license) return null;
  return {
    productName: license.productName || null,
    customerEmail: license.customerEmail || null,
    lastValidatedAt: license.lastValidatedAt || null,
  };
});
ipcMain.handle("open-landing-page", () => {
  return { ok: true, removed: true };
});

ipcMain.handle("language-get", () => currentLanguage);
ipcMain.handle("language-set", (_evt, language) => {
  setLanguage(language);
  return currentLanguage;
});
ipcMain.handle("user-name-get", () => ({ name: userName }));
ipcMain.handle("user-name-set", (_evt, value) => setUserName(value));
ipcMain.handle("cat-name-get", () => ({ name: catName, visible: showCatName }));
ipcMain.handle("cat-name-set", (_evt, value) => setCatName(value));
ipcMain.handle("cat-name-visible-set", (_evt, visible) => setShowCatName(visible));
ipcMain.handle("fixed-message-get", () => ({ message: fixedMessage }));
ipcMain.handle("fixed-message-set", (_evt, value) => setFixedMessage(value));
ipcMain.handle("cat-name-prompt-shown", () => {
  markCatNamePromptShown();
  return { ok: true };
});
ipcMain.handle("task-complete-sound-volume-get", () => taskCompleteSoundVolume);
ipcMain.handle("task-complete-sound-volume-set", (_evt, volume) => setTaskCompleteSoundVolume(volume));
ipcMain.handle("reminders-get", () => reminderList());
ipcMain.handle("reminder-add", (_evt, payload) => addReminder(payload));
ipcMain.handle("reminder-update", (_evt, payload) => {
  return updateReminder(String(payload && payload.id || ""), payload);
});
ipcMain.handle("reminder-delete", (_evt, id) => deleteReminder(String(id || "")));
ipcMain.handle("reminder-enabled-set", (_evt, payload) => {
  return setReminderEnabled(String(payload && payload.id || ""), !!(payload && payload.enabled));
});
ipcMain.handle("pomodoro-get", () => pomodoroState());
ipcMain.handle("pomodoro-start", () => {
  startPomodoro();
  return pomodoroState();
});
ipcMain.handle("pomodoro-pause", () => {
  pausePomodoro();
  return pomodoroState();
});
ipcMain.handle("pomodoro-reset", () => {
  resetPomodoro();
  return pomodoroState();
});
ipcMain.handle("pomodoro-focus-set", (_evt, min) => {
  setPomodoroFocusMin(Number(min));
  return pomodoroState();
});

async function checkForUpdatesNow() {
  return { ok: false, reason: "updates-disabled" };
}

ipcMain.handle("update-check", async () => {
  return checkForUpdatesNow({ manual: true, allowOfflineLicense: false });
});
ipcMain.handle("update-download", async () => {
  return { ok: false, reason: "updates-disabled" };
});
function installDownloadedUpdate() {
  return { ok: false, reason: "updates-disabled" };
}
ipcMain.handle("update-install", () => {
  return installDownloadedUpdate();
});

// 윈도우 드래그 (relative pixel delta)
ipcMain.on("drag-window", (_evt, dx, dy) => {
  if (!petWin || petWin.isDestroyed()) return;
  lastPetDragAt = Date.now();
  const b = petWin.getBounds();
  const { width, height } = windowDims(currentPetSize);
  const nextBounds = { x: Math.round(b.x + dx), y: Math.round(b.y + dy), width, height };
  petWin.setBounds(nextBounds);
  currentPetPosition = { x: nextBounds.x, y: nextBounds.y };
  updateShareCaptureForPetBounds(nextBounds, { forceKeyframe: true });
});

ipcMain.on("drag-window-ended", () => {
  if (!petWin || petWin.isDestroyed()) return;
  const b = petWin.getBounds();
  currentPetPosition = { x: b.x, y: b.y };
  saveSettings();
});

ipcMain.on("set-mouse-events-enabled", (_evt, enabled) => {
  if (!petWin || petWin.isDestroyed()) return;
  if (enabled) {
    petWin.setIgnoreMouseEvents(false);
  } else {
    petWin.setIgnoreMouseEvents(true, { forward: true });
  }
});

// Window height ratio — speech bubble and jump poses need extra vertical room.
const STRETCH_RATIO = 4.8;

ipcMain.on("set-stretch-mode", () => {
  // 더 이상 윈도우 사이즈 변경 안 함 (윈도우가 처음부터 stretch 비율) — no-op
});

ipcMain.on("set-hunting-mode", () => {
  // Hunting is an in-SVG animation now. Keep this IPC as a no-op so older
  // renderer calls never trigger BrowserWindow bounds changes on Windows.
});

// 우클릭 컨텍스트 메뉴
ipcMain.on("show-context-menu", () => {
  if (!petWin || petWin.isDestroyed()) return;
  if (Date.now() - lastPetDragAt < 500) return;

  const stretchIntervalMenu = [
    { label: t("off"), type: "radio", checked: stretchIntervalMin === 0, click: () => setStretchInterval(0) },
    { type: "separator" },
    ...(!releaseBuildExcludesDevOptions() ? [{
      label: t("everyMinuteTest"),
      type: "radio",
      checked: stretchIntervalMin === RELEASE_EXCLUDED_STRETCH_INTERVAL_MIN,
      click: () => setStretchInterval(RELEASE_EXCLUDED_STRETCH_INTERVAL_MIN),
    }] : []),
    { label: t("everyMinutes", 10), type: "radio", checked: stretchIntervalMin === 10, click: () => setStretchInterval(10) },
    { label: t("everyMinutes", 15), type: "radio", checked: stretchIntervalMin === 15, click: () => setStretchInterval(15) },
    { label: t("everyMinutes", 20), type: "radio", checked: stretchIntervalMin === 20, click: () => setStretchInterval(20) },
    { label: t("everyMinutes", 30), type: "radio", checked: stretchIntervalMin === 30, click: () => setStretchInterval(30) },
    { label: t("everyMinutes", 45), type: "radio", checked: stretchIntervalMin === 45, click: () => setStretchInterval(45) },
    { label: t("everyHour"), type: "radio", checked: stretchIntervalMin === 60, click: () => setStretchInterval(60) },
    { label: t("everyHourAndHalf"), type: "radio", checked: stretchIntervalMin === 90, click: () => setStretchInterval(90) },
    { label: t("everyTwoHours"), type: "radio", checked: stretchIntervalMin === 120, click: () => setStretchInterval(120) },
  ];

  const menu = Menu.buildFromTemplate([
    { label: `${t("contextTitle")} v${app.getVersion()}`, enabled: false },
    { type: "separator" },
    {
      label: t("fixedMessage"),
      click: () => petWin.webContents.send("fixed-message-edit", fixedMessage),
    },
    {
      label: t("reminders"),
      submenu: [
        {
          label: t("remindersOpen"),
          click: () => petWin.webContents.send("reminder-panel-open"),
        },
        {
          label: t("showReminderButtonOutside"),
          type: "checkbox",
          checked: showReminderButtonOutside,
          click: (item) => setShowReminderButtonOutside(item.checked),
        },
      ],
    },
    {
      label: t("pomodoro"),
      submenu: [
        {
          label: pomodoroRunning ? t("pomodoroPause") : (pomodoroRemainingSec < pomodoroPhaseDurationSec(pomodoroMode) ? t("pomodoroResume") : t("pomodoroStart")),
          click: () => {
            if (pomodoroRunning) pausePomodoro();
            else startPomodoro();
          },
        },
        { label: t("pomodoroReset"), click: () => resetPomodoro() },
        { type: "separator" },
        {
          label: t("pomodoroFocusTime"),
          submenu: [
            ...[15, 20, 25, 30, 40, 45, 50, 60].map((min) => ({
              label: t("pomodoroMinutes", min),
              type: "radio",
              checked: pomodoroFocusMin === min,
              click: () => setPomodoroFocusMin(min),
            })),
            { type: "separator" },
            {
              label: t("pomodoroCustom"),
              click: () => petWin.webContents.send("pomodoro-focus-edit", pomodoroFocusMin),
            },
          ],
        },
        {
          label: t("pomodoroRestTime"),
          submenu: [
            ...[5, 10, 15].map((min) => ({
              label: t("pomodoroMinutes", min),
              type: "radio",
              checked: pomodoroRestSec === min * 60,
              click: () => setPomodoroRestSec(min * 60),
            })),
          ],
        },
      ],
    },
    {
      label: t("stretch"),
      submenu: [
        { label: t("stretchNow"), click: () => triggerStretchSequence() },
        { type: "separator" },
        ...stretchIntervalMenu,
      ],
    },
    ...(!releaseBuildExcludesDevOptions() ? [{
      label: t("jump"),
      submenu: [
        { label: t("jumpNow"), accelerator: "Cmd+J", click: () => triggerJumpSequence() },
      ],
    }] : []),
    { type: "separator" },
    {
      label: t("shareCat"),
      click: () => petWin.webContents.send("share-record"),
    },
    {
      label: t("setUserName"),
      click: () => petWin.webContents.send("user-name-edit", userName),
    },
    {
      label: t("setCatName"),
      click: () => petWin.webContents.send("cat-name-edit", catName),
    },
    {
      label: t("showCatName"),
      type: "checkbox",
      checked: showCatName,
      click: (item) => setShowCatName(item.checked),
    },
    { type: "separator" },
    {
      label: t("patternEditor"),
      click: () => openPatternEditor(),
    },
    ...(!releaseBuildExcludesDevOptions() ? [{
      label: t("mappingEditor"),
      click: () => openMappingEditor(),
    }] : []),
    {
      label: t("taskCompleteSound"),
      submenu: [
        { label: t("soundOff"), type: "radio", checked: taskCompleteSoundVolume === 0, click: () => setTaskCompleteSoundVolume(0) },
        { label: t("soundLow"), type: "radio", checked: taskCompleteSoundVolume === 0.1, click: () => setTaskCompleteSoundVolume(0.1) },
        { label: t("soundNormal"), type: "radio", checked: taskCompleteSoundVolume === 0.6, click: () => setTaskCompleteSoundVolume(0.6) },
        { label: t("soundHigh"), type: "radio", checked: taskCompleteSoundVolume === 0.9, click: () => setTaskCompleteSoundVolume(0.9) },
      ],
    },
    { type: "separator" },
    {
      label: t("size"),
      submenu: [
        ...PET_SIZE_OPTIONS.map((size) => ({
          label: t("petSizePixels", size),
          type: "radio",
          checked: currentPetSize === size,
          click: () => setPetSize(size),
        })),
        { type: "separator" },
        {
          label: t("smaller"),
          click: () => resizePetBy(-20),
        },
        {
          label: t("larger"),
          click: () => resizePetBy(20),
        },
        {
          label: t("resetSize"),
          click: () => resetPetSize(),
        },
      ],
    },
    { type: "separator" },
    {
      label: t("language"),
      submenu: [
        { label: t("english"), type: "radio", checked: currentLanguage === "en", click: () => setLanguage("en") },
        { label: t("korean"), type: "radio", checked: currentLanguage === "ko", click: () => setLanguage("ko") },
        { label: t("japanese"), type: "radio", checked: currentLanguage === "ja", click: () => setLanguage("ja") },
      ],
    },
    { type: "separator" },
    {
      label: t("checkForUpdates"),
      enabled: false,
    },
    { label: t("appMenuQuit"), accelerator: "Cmd+Q", click: () => app.quit() },
  ]);

  menu.popup({ window: petWin });
});

// ── 스트레칭 시퀀스: 윈도우 확대 + 중앙으로 → SVG 애니메이션 → 복원 ──
const STRETCH_DURATION_MS = 3000;
const STRETCH_GROW_MS = 400;       // 확대 transition 시간
const STRETCH_SHRINK_DELAY_MS = 200; // 종료 후 복원까지 여유
const STRETCH_FILL_RATIO = 0.90;    // 화면 높이의 90%를 채우도록 (정사각 윈도우)
let stretchInProgress = false;
let savedStretchBounds = null;
let focusStartInProgress = false;
let savedFocusStartBounds = null;

function triggerStretchSequence() {
  if (!petWin || petWin.isDestroyed() || stretchInProgress) return;
  stretchInProgress = true;
  savedStretchBounds = petWin.getBounds();

  // 캣짱이 현재 있는 디스플레이에서 실행한다. 커서 기준이면 자동 스트레칭이
  // 다른 모니터로 튀어 애니메이션이 안 보이는 것처럼 느껴질 수 있다.
  const display = screen.getDisplayMatching(savedStretchBounds);
  const { x: dispX, y: dispY, width: dispW, height: dispH } = display.workArea;

  // 정사각 큰 윈도우 — 화면 높이 기준 STRETCH_FILL_RATIO
  const targetSize = Math.round(dispH * STRETCH_FILL_RATIO);
  const newX = dispX + Math.round((dispW - targetSize) / 2);
  const newY = dispY + Math.round((dispH - targetSize) / 2);

  petWin.setBounds(
    { x: newX, y: newY, width: targetSize, height: targetSize },
    true
  );

  // 윈도우 확대 transition 후 SVG 애니메이션 시작
  setTimeout(() => {
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send("do-stretch");
    }
  }, STRETCH_GROW_MS);

  // 시퀀스 종료 후 원래 bounds 복원
  setTimeout(() => {
    if (petWin && !petWin.isDestroyed() && savedStretchBounds) {
      petWin.setBounds(savedStretchBounds, true);
    }
    stretchInProgress = false;
  }, STRETCH_GROW_MS + STRETCH_DURATION_MS + STRETCH_SHRINK_DELAY_MS);
}

function triggerPomodoroFocusStartSequence() {
  if (!petWin || petWin.isDestroyed() || focusStartInProgress || stretchInProgress) return;
  focusStartInProgress = true;
  savedFocusStartBounds = petWin.getBounds();
  const display = screen.getDisplayMatching(savedFocusStartBounds);
  const { x: dispX, y: dispY, width: dispW, height: dispH } = display.workArea;
  const targetSize = Math.round(dispH * STRETCH_FILL_RATIO);
  const newX = dispX + Math.round((dispW - targetSize) / 2);
  const newY = dispY + Math.round((dispH - targetSize) / 2);

  petWin.setBounds({ x: newX, y: newY, width: targetSize, height: targetSize }, true);

  setTimeout(() => {
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send("pomodoro-focus-start");
    }
  }, 160);

  setTimeout(() => {
    if (petWin && !petWin.isDestroyed() && savedFocusStartBounds) {
      petWin.setBounds(savedFocusStartBounds, true);
    }
    focusStartInProgress = false;
    savedFocusStartBounds = null;
  }, 1400);
}

function triggerJumpSequence() {
  if (!petWin || petWin.isDestroyed()) return;
  petWin.webContents.send("do-jump");
}

// ── App lifecycle ──

function buildAppMenu() {
  const menu = Menu.buildFromTemplate([
    {
      label: "Catjang",
      submenu: [
        { label: t("appMenuAbout"), role: "about" },
        { type: "separator" },
        {
          label: t("checkForUpdates"),
          enabled: false,
        },
        { label: t("appMenuQuit"), accelerator: "Cmd+Q", click: () => app.quit() },
      ],
    },
    {
      label: t("editMenu"),
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

function handleAgentStateEvent(event) {
  if (!event || typeof event !== "object") return;
  const state = typeof event.state === "string" ? event.state : "";
  if (!state) return;
  const agentId = event.agentId || "agent";
  const sessionId = event.sessionId || agentId;
  const sessionKey = `${agentId}:${sessionId}`;
  const now = Date.now();
  for (const [key, active] of activeAgentSessions) {
    if (!active || now - active.lastActiveAt > AGENT_ACTIVE_TTL_MS) activeAgentSessions.delete(key);
  }
  if (state === "thinking" || state === "working") {
    activeAgentSessions.set(sessionKey, { lastActiveAt: now });
  } else if (state === "complete") {
    if (!activeAgentSessions.has(sessionKey)) {
      console.warn(`[Catjang] ignored agent complete without active task: ${agentId} ${event.event || ""}`);
      return;
    }
    activeAgentSessions.delete(sessionKey);
  } else if (state === "idle" || state === "error") {
    activeAgentSessions.delete(sessionKey);
  }
  if (petWin && !petWin.isDestroyed()) {
    petWin.webContents.send("ai-task-state", {
      agentId,
      sessionId,
      event: event.event || "",
      state,
    });
  }
  if (state === "complete") {
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send("ai-task-complete", {
        agentId,
        sessionId,
        event: event.event || "",
      });
    }
  } else if (state === "notification") {
    if (petWin && !petWin.isDestroyed()) {
      petWin.webContents.send("ai-task-notification", {
        agentId,
        sessionId,
        event: event.event || "",
      });
    }
  }
}

function startAgentStateServer() {
  if (agentStateServer) return;
  agentStateServer = http.createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/agent-state") {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    let body = "";
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size <= 8192) body += chunk;
    });
    req.on("end", () => {
      if (size > 8192) {
        res.writeHead(413);
        res.end("too large");
        return;
      }
      try {
        handleAgentStateEvent(JSON.parse(body || "{}"));
        res.writeHead(200);
        res.end("ok");
      } catch {
        res.writeHead(400);
        res.end("bad json");
      }
    });
  });
  agentStateServer.on("error", (err) => {
    console.warn("[Catjang] agent state server unavailable:", err && err.message);
    agentStateServer = null;
  });
  agentStateServer.listen(AGENT_STATE_PORT, "127.0.0.1", () => {
    console.log(`[Catjang] agent state server listening on 127.0.0.1:${AGENT_STATE_PORT}`);
  });
}

function installClaudeCodeHooks() {
  try {
    const { registerClaudeHooks } = require("./hooks/install");
    const hookDir = path.join(app.getPath("userData"), "hooks");
    fs.mkdirSync(hookDir, { recursive: true });
    for (const file of ["catjang-claude-hook.js", "server-config.js"]) {
      fs.copyFileSync(path.join(__dirname, "hooks", file), path.join(hookDir, file));
    }
    const result = registerClaudeHooks({
      hookScript: path.join(hookDir, "catjang-claude-hook.js"),
    });
    if (result.added || result.updated) {
      console.log(`[Catjang] synced Claude Code hooks (added ${result.added}, updated ${result.updated})`);
    }
  } catch (err) {
    console.warn("[Catjang] failed to sync Claude Code hooks:", err && err.message);
  }
}

function installAntigravityHooks() {
  try {
    const { registerAntigravityHooks } = require("./hooks/install");
    const hookDir = path.join(app.getPath("userData"), "hooks");
    fs.mkdirSync(hookDir, { recursive: true });
    for (const file of ["catjang-antigravity-hook.js", "server-config.js"]) {
      fs.copyFileSync(path.join(__dirname, "hooks", file), path.join(hookDir, file));
    }
    const result = registerAntigravityHooks({
      hookScript: path.join(hookDir, "catjang-antigravity-hook.js"),
    });
    if (result.added || result.updated) {
      console.log(`[Catjang] synced Antigravity hooks (added ${result.added}, updated ${result.updated})`);
    }
  } catch (err) {
    console.warn("[Catjang] failed to sync Antigravity hooks:", err && err.message);
  }
}

function installCursorHooks() {
  try {
    const { registerCursorHooks } = require("./hooks/install");
    const hookDir = path.join(app.getPath("userData"), "hooks");
    fs.mkdirSync(hookDir, { recursive: true });
    for (const file of ["catjang-cursor-hook.js", "server-config.js"]) {
      fs.copyFileSync(path.join(__dirname, "hooks", file), path.join(hookDir, file));
    }
    const result = registerCursorHooks({
      hookScript: path.join(hookDir, "catjang-cursor-hook.js"),
    });
    if (result.added || result.updated) {
      console.log(`[Catjang] synced Cursor hooks (added ${result.added}, updated ${result.updated})`);
    }
  } catch (err) {
    console.warn("[Catjang] failed to sync Cursor hooks:", err && err.message);
  }
}

function startCodexMonitor() {
  if (codexMonitor) return;
  try {
    const CodexLogMonitor = require("./agents/codex-log-monitor");
    codexMonitor = new CodexLogMonitor(handleAgentStateEvent);
    codexMonitor.start();
  } catch (err) {
    console.warn("[Catjang] Codex log monitor unavailable:", err && err.message);
  }
}

function startKiroMonitor() {
  if (kiroMonitor) return;
  try {
    const KiroLogMonitor = require("./agents/kiro-log-monitor");
    kiroMonitor = new KiroLogMonitor(handleAgentStateEvent);
    kiroMonitor.start();
  } catch (err) {
    console.warn("[Catjang] Kiro log monitor unavailable:", err && err.message);
  }
}

function startCursorAgentMonitor() {
  if (cursorAgentMonitor) return;
  try {
    const CursorLogMonitor = require("./agents/cursor-log-monitor");
    cursorAgentMonitor = new CursorLogMonitor(handleAgentStateEvent);
    cursorAgentMonitor.start();
  } catch (err) {
    console.warn("[Catjang] Cursor log monitor unavailable:", err && err.message);
  }
}

function startAgentIntegrations() {
  startAgentStateServer();
  installClaudeCodeHooks();
  installAntigravityHooks();
  installCursorHooks();
  startCodexMonitor();
  startKiroMonitor();
  startCursorAgentMonitor();
}

function stopAgentIntegrations() {
  activeAgentSessions.clear();
  if (codexMonitor) {
    codexMonitor.stop();
    codexMonitor = null;
  }
  if (kiroMonitor) {
    kiroMonitor.stop();
    kiroMonitor = null;
  }
  if (cursorAgentMonitor) {
    cursorAgentMonitor.stop();
    cursorAgentMonitor = null;
  }
  if (agentStateServer) {
    try { agentStateServer.close(); } catch {}
    agentStateServer = null;
  }
}

function registerGlobalShortcuts() {
  globalShortcut.unregister("CommandOrControl+-");
  globalShortcut.unregister("CommandOrControl+=");
  globalShortcut.unregister("CommandOrControl+0");
  globalShortcut.unregister("CommandOrControl+J");
  const shortcuts = [
    ...(!releaseBuildExcludesDevOptions() ? [["CommandOrControl+J", () => triggerJumpSequence()]] : []),
  ];
  for (const [accelerator, handler] of shortcuts) {
    if (!globalShortcut.register(accelerator, handler)) {
      console.warn(`[Catjang] failed to register shortcut: ${accelerator}`);
    }
  }
}

function openMacPrivacyPane(anchor) {
  if (!IS_MAC) return;
  shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${anchor}`).catch(() => {});
}

function requestAccessibilityPermission() {
  if (!IS_MAC) return true;
  try {
    return systemPreferences.isTrustedAccessibilityClient(true);
  } catch (err) {
    console.warn("[Catjang] accessibility permission check failed:", err && err.message);
    return false;
  }
}

function showAccessibilityPermissionGuideOnce() {
  if (!IS_MAC || accessibilityPermissionGuideShown) return;
  accessibilityPermissionGuideShown = true;
  setTimeout(async () => {
    try {
      const result = await dialog.showMessageBox({
        type: "info",
        title: t("accessibilityPermissionTitle"),
        message: t("accessibilityPermissionMessage"),
        detail: t("accessibilityPermissionDetail"),
        buttons: [t("openAccessibility"), t("later")],
        defaultId: 0,
        cancelId: 1,
      });
      if (result.response === 0) openMacPrivacyPane("Privacy_Accessibility");
    } catch {}
  }, 800);
}

function showInputPermissionGuideOnce() {
  if (!IS_MAC || inputPermissionGuideShown) return;
  inputPermissionGuideShown = true;
  setTimeout(async () => {
    try {
      const result = await dialog.showMessageBox({
        type: "info",
        title: t("inputPermissionTitle"),
        message: t("inputPermissionMessage"),
        detail: t("inputPermissionDetail"),
        buttons: [t("openInputMonitoring"), t("later")],
        defaultId: 0,
        cancelId: 1,
      });
      if (result.response === 0) openMacPrivacyPane("Privacy_ListenEvent");
    } catch {}
  }, 800);
}

function showGlobalInputPermissionGuideOnce() {
  if (IS_MAC || inputPermissionGuideShown) return;
  inputPermissionGuideShown = true;
  setTimeout(async () => {
    try {
      await dialog.showMessageBox({
        type: "info",
        title: t("globalInputPermissionTitle"),
        message: t("globalInputPermissionMessage"),
        detail: t("globalInputPermissionDetail"),
        buttons: [t("later")],
        defaultId: 0,
        cancelId: 0,
        icon: nativeImage.createFromPath(APP_ICON_PATH),
      });
    } catch {}
  }, 800);
}

function startKeyHook() {
  if (keyHookStarted) return;
  if (!uIOhook) {
    console.warn("[Catjang] global input hook unavailable: uiohook-napi is not loaded");
    showGlobalInputPermissionGuideOnce();
    return;
  }
  try {
    const accessibilityTrusted = requestAccessibilityPermission();
    if (!accessibilityTrusted) showAccessibilityPermissionGuideOnce();
    if (!keyHookListenersAttached) {
      uIOhook.on("keydown", () => {
        if (!petWin || petWin.isDestroyed()) return;
        petWin.webContents.send("key-pressed");
      });
      uIOhook.on("wheel", (event) => {
        if (!petWin || petWin.isDestroyed()) return;
        petWin.webContents.send("mouse-wheel", {
          rotation: event && typeof event.rotation === "number" ? event.rotation : 0,
        });
      });
      keyHookListenersAttached = true;
    }
    uIOhook.start();
    keyHookStarted = true;
    if (keyHookRetryTimer) {
      clearInterval(keyHookRetryTimer);
      keyHookRetryTimer = null;
    }
    console.log("[Catjang] global input hook started");
  } catch (err) {
    // Global input hooks may fail when OS permissions or security policy blocks native hooks.
    console.warn("[Catjang] global key hook unavailable:", err && err.message);
    if (IS_MAC) {
      if (requestAccessibilityPermission()) showInputPermissionGuideOnce();
      else showAccessibilityPermissionGuideOnce();
    } else {
      showGlobalInputPermissionGuideOnce();
    }
    if (!keyHookRetryTimer) {
      keyHookRetryTimer = setInterval(() => {
        if (!keyHookStarted) startKeyHook();
      }, 5000);
    }
  }
}

function sendUpdateState(state) {
  if (!petWin || petWin.isDestroyed()) return;
  petWin.webContents.send("update-state", state);
}

function isVersionNewer(candidate, current) {
  const next = String(candidate || "").replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const base = String(current || "").replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(next.length, base.length, 3); i += 1) {
    if ((next[i] || 0) > (base[i] || 0)) return true;
    if ((next[i] || 0) < (base[i] || 0)) return false;
  }
  return false;
}

function sendAvailableUpdateState(kind, info) {
  const version = info && info.version ? info.version : null;
  if (!isVersionNewer(version, app.getVersion())) {
    sendUpdateState({ state: pendingManualUpdateCheck ? "none" : "idle" });
    pendingManualUpdateCheck = false;
    return;
  }
  sendUpdateState({ state: kind, version });
  pendingManualUpdateCheck = false;
}

function setupAutoUpdater() {
}

async function checkLicenseValidityNow(options = {}) {
  if (!loadLicense()) return { ok: false, reason: "missing" };
  const result = await validateSavedLicense(options);
  if (result.ok || result.network) return result;
  returnToLicenseWindow(result.reason || "invalid");
  return result;
}

async function regular_check() {
  if (regularCheckRunning) return;
  regularCheckRunning = true;
  try {
    await checkForUpdatesNow({ validateLicense: false });
    await checkLicenseValidityNow();
  } finally {
    regularCheckRunning = false;
  }
}

function scheduleRegularChecks() {
  if (!app.isPackaged) return;
  if (regularCheckTimer) clearInterval(regularCheckTimer);
  setTimeout(() => regular_check().catch(() => {}), 10_000);
  regularCheckTimer = setInterval(() => {
    regular_check().catch(() => {});
  }, REGULAR_CHECK_INTERVAL_MS);
}

app.whenReady().then(async () => {
  try {
    logInfo("[Catjang] starting", {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      node: process.versions.node,
      logPath: STARTUP_LOG_PATH,
      smokeTest: IS_SMOKE_TEST,
    });
    if (IS_SMOKE_TEST) {
      logInfo("[Catjang] smoke test passed");
      app.quit();
      return;
    }
    app.setName("Catjang");
    if (app.dock && fs.existsSync(APP_ICON_PATH)) {
      app.dock.setIcon(nativeImage.createFromPath(APP_ICON_PATH));
    }
    currentLanguage = defaultLanguage();
    loadSettings();
    loadPattern();
    buildAppMenu();
    registerGlobalShortcuts();
    const licenseState = await validateSavedLicense();
    if (licenseState.ok) {
      startLicensedApp();
    } else {
      createLicenseWindow(licenseState.reason === "missing" ? "" : String(licenseState.reason || ""));
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length > 0) return;
      validateSavedLicense()
        .then((state) => {
          if (state.ok) startLicensedApp();
          else createLicenseWindow(state.reason === "missing" ? "" : String(state.reason || ""));
        })
        .catch((error) => {
          logError("[Catjang] failed to activate window:", error);
          createLicenseWindow(error && error.message ? error.message : "");
        });
    });
  } catch (error) {
    logError("[Catjang] startup failed:", error);
    try {
      dialog.showErrorBox("Catjang failed to start", error && error.message ? error.message : String(error || "Unknown error"));
    } catch {}
  }
});

app.on("will-quit", () => {
  stopKeyHook();
  if (stretchTimer) {
    clearInterval(stretchTimer);
    stretchTimer = null;
  }
  stopReminderTimer();
  stopPomodoroTimer();
  stopAgentIntegrations();
  if (regularCheckTimer) {
    clearInterval(regularCheckTimer);
    regularCheckTimer = null;
  }
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (!IS_MAC) app.quit();
});
