"use strict";

const form = document.getElementById("license-form");
const input = document.getElementById("license-key");
const button = document.getElementById("activate-button");
const statusMessage = document.getElementById("status-message");
const languageButtons = document.querySelectorAll(".language-option");
const stepLicense = document.getElementById("step-license");
const stepSetup = document.getElementById("step-setup");
const mascotCards = document.querySelectorAll(".mascot-card");
const choiceButtons = document.querySelectorAll(".choice-button");
const startButton = document.getElementById("start-button");

const I18N = {
  en: {
    language: "Language",
    intro: "Enter a prototype key to activate Catjang. Default keys are listed in the project README.",
    licenseKey: "License key",
    activate: "Activate",
    missingKey: "Please enter a license key.",
    activating: "Activating...",
    activated: "Activated successfully!",
    genericError: "We could not activate this license key.",
    setupTitle: "Initial Setup",
    setupSubtitle: "Customize your companion before starting.",
    chooseMascotTitle: "1. Choose your starting pet",
    catLabel: "Kitten 🐱",
    schnauzerLabel: "Schnauzer 🐶",
    chisiLabel: "Toy Poodle 🐩",
    miloLabel: "Mixed-breed 🐕",
    musubiLabel: "Tabby Cat 🐱",
    peruperroLabel: "Peruvian Hairless 🐕",
    aiConnectTitle: "2. Connect your AI agents?",
    aiConnectDesc: "Allows your pet to react with animations when using Gemini, Claude, or Cursor.",
    aiYesTitle: "Yes, connect now",
    aiYesSubtitle: "Opens the agent connection & testing window",
    aiNoTitle: "No, maybe later",
    aiNoSubtitle: "Start directly without AI test prompts",
    startButton: "Start Catjang",
  },
  es: {
    language: "Idioma",
    intro: "Introduce una clave del prototipo para activar Catjang. Las claves predeterminadas aparecen en el README del proyecto.",
    licenseKey: "Clave de licencia",
    activate: "Activar",
    missingKey: "Introduce una clave de licencia.",
    activating: "Activando...",
    activated: "¡Activado con éxito!",
    genericError: "No se pudo activar esta clave de licencia.",
    setupTitle: "Configuración Inicial",
    setupSubtitle: "Personaliza a tu compañero antes de comenzar.",
    chooseMascotTitle: "1. Elige tu mascota inicial",
    catLabel: "Gatito 🐱",
    schnauzerLabel: "Schnauzer 🐶",
    chisiLabel: "Caniche Toy 🐩",
    miloLabel: "Mestizo 🐕",
    musubiLabel: "Atigrado 🐱",
    peruperroLabel: "Perro Peruano 🐕",
    aiConnectTitle: "2. ¿Deseas conectar tus agentes de IA?",
    aiConnectDesc: "Permite que tu mascota reaccione con animaciones cuando uses Gemini, Claude o Cursor.",
    aiYesTitle: "Sí, conectar ahora",
    aiYesSubtitle: "Abre la ventana de pruebas y conexión",
    aiNoTitle: "No, más tarde",
    aiNoSubtitle: "Iniciar directamente sin pruebas de IA",
    startButton: "Comenzar",
  },
  ko: {
    language: "언어",
    intro: "프로토타입 키를 입력해 Catjang을 활성화하세요. 기본 키는 프로젝트 README에 적혀 있어요.",
    licenseKey: "라이선스 키",
    activate: "인증하기",
    missingKey: "라이선스 키를 입력해 주세요.",
    activating: "인증 중입니다...",
    activated: "성공적으로 인증되었습니다!",
    genericError: "라이선스를 인증할 수 없습니다.",
    setupTitle: "초기 설정",
    setupSubtitle: "시작하기 전에 데스크톱 동반자를 설정하세요.",
    chooseMascotTitle: "1. 시작할 반려동물을 선택하세요",
    catLabel: "고양이 🐱",
    schnauzerLabel: "슈나우저 🐶",
    chisiLabel: "토이푸들 🐩",
    miloLabel: "믹스견 🐕",
    musubiLabel: "고등어 태비 🐱",
    peruperroLabel: "페루 무모견 🐕",
    aiConnectTitle: "2. AI 에이전트를 연결할까요?",
    aiConnectDesc: "Gemini, Claude 또는 Cursor를 사용할 때 펫이 애니메이션으로 반응할 수 있게 됩니다.",
    aiYesTitle: "네, 지금 연결할게요",
    aiYesSubtitle: "연결 및 테스트 창을 엽니다",
    aiNoTitle: "나중에 할게요",
    aiNoSubtitle: "AI 테스트 창 없이 바로 시작합니다",
    startButton: "Catjang 시작하기",
  },
  ja: {
    language: "言語",
    intro: "プロトタイプキーを入力して Catjang を有効化してください。既定キーはプロジェクトの README に記載されています。",
    licenseKey: "ライセンスキー",
    activate: "有効化",
    missingKey: "ライセンスキーを入力してください。",
    activating: "有効化しています...",
    activated: "有効化に成功しました！",
    genericError: "ライセンスを有効化できませんでした。",
    setupTitle: "初期設定",
    setupSubtitle: "始める前にデスクトップの仲間をカスタマイズしましょう。",
    chooseMascotTitle: "1. 最初のペットを選択してください",
    catLabel: "子猫 🐱",
    schnauzerLabel: "シュナウザー 🐶",
    chisiLabel: "トイプードル 🐩",
    miloLabel: "ミックス犬 🐕",
    musubiLabel: "キジトラ 🐱",
    peruperroLabel: "ペルー犬 🐕",
    aiConnectTitle: "2. AI エージェントを接続しますか？",
    aiConnectDesc: "Gemini、Claude、Cursor を使用したときにペットがアニメーションで反応するようになります。",
    aiYesTitle: "はい、今すぐ接続する",
    aiYesSubtitle: "接続とテスト画面を開きます",
    aiNoTitle: "いいえ、後で",
    aiNoSubtitle: "AI テストなしで直接開始します",
    startButton: "Catjang を開始",
  },
};

let currentLanguage = "es";
let selectedMascot = "cat";
let wantsAiAgents = true;

function t(key) {
  return (I18N[currentLanguage] && I18N[currentLanguage][key]) || I18N.en[key] || key;
}

function applyLanguage(language) {
  currentLanguage = I18N[language] ? language : "es";
  document.documentElement.lang = currentLanguage;
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll("[data-i18n-aria-label]")) {
    el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  }
  for (const btn of languageButtons) {
    btn.classList.toggle("is-active", btn.dataset.language === currentLanguage);
  }
}

function setStatus(message, ok = false) {
  statusMessage.textContent = message || "";
  statusMessage.classList.toggle("is-ok", ok);
}

function normalizeError(error) {
  if (!error) return t("genericError");
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return t("genericError");
}

// ── PASO 1: ACTIVACIÓN ──
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const licenseKey = input.value.trim();
  if (!licenseKey) {
    setStatus(t("missingKey"));
    input.focus();
    return;
  }

  button.disabled = true;
  input.disabled = true;
  setStatus(t("activating"));

  try {
    await window.electronAPI.licenseActivate(licenseKey);
    setStatus(t("activated"), true);

    // Transición suave a la pantalla de configuración inicial
    setTimeout(() => {
      if (stepLicense) stepLicense.style.display = "none";
      if (stepSetup) stepSetup.style.display = "block";
      applyLanguage(currentLanguage);
    }, 450);
  } catch (error) {
    setStatus(normalizeError(error));
    button.disabled = false;
    input.disabled = false;
    input.focus();
  }
});

// ── PASO 2: CONFIGURACIÓN INICIAL ──
for (const card of mascotCards) {
  card.addEventListener("click", () => {
    selectedMascot = card.dataset.mascot || "cat";
    for (const c of mascotCards) {
      const isThis = c.dataset.mascot === selectedMascot;
      c.classList.toggle("is-selected", isThis);
      c.setAttribute("aria-checked", isThis ? "true" : "false");
    }
  });
}

for (const btn of choiceButtons) {
  btn.addEventListener("click", () => {
    wantsAiAgents = btn.dataset.choice === "yes";
    for (const b of choiceButtons) {
      const isThis = (b.dataset.choice === "yes") === wantsAiAgents;
      b.classList.toggle("is-active", isThis);
      b.setAttribute("aria-checked", isThis ? "true" : "false");
    }
  });
}

if (startButton) {
  startButton.addEventListener("click", async () => {
    startButton.disabled = true;
    document.body.classList.add("is-launching");
    try {
      await window.electronAPI.licenseStart({
        mascot: selectedMascot,
        connectAgents: wantsAiAgents,
      });
    } catch (error) {
      document.body.classList.remove("is-launching");
      startButton.disabled = false;
      setStatus(normalizeError(error));
    }
  });
}

window.electronAPI.onLicenseError((message) => {
  if (message) setStatus(message);
});

window.electronAPI.onLanguageChanged((language) => {
  applyLanguage(language);
});

for (const btn of languageButtons) {
  btn.addEventListener("click", async () => {
    const language = await window.electronAPI.languageSet(btn.dataset.language);
    applyLanguage(language);
    setStatus("");
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  applyLanguage(await window.electronAPI.languageGet());
  input.focus();
});
