"use strict";

const form = document.getElementById("license-form");
const input = document.getElementById("license-key");
const button = document.getElementById("activate-button");
const statusMessage = document.getElementById("status-message");
const languageButtons = document.querySelectorAll(".language-option");

const I18N = {
  en: {
    language: "Language",
    intro: "Enter a prototype key to activate Catjang. Default keys are listed in the project README.",
    licenseKey: "License key",
    activate: "Activate",
    missingKey: "Please enter a license key.",
    activating: "Activating...",
    activated: "Activated. Starting Catjang.",
    genericError: "We could not activate this license key.",
  },
  es: {
    language: "Idioma",
    intro: "Introduce una clave del prototipo para activar Catjang. Las claves predeterminadas aparecen en el README del proyecto.",
    licenseKey: "Clave de licencia",
    activate: "Activar",
    missingKey: "Introduce una clave de licencia.",
    activating: "Activando...",
    activated: "Activado. Iniciando Catjang.",
    genericError: "No se pudo activar esta clave de licencia.",
  },
  ko: {
    language: "언어",
    intro: "프로토타입 키를 입력해 Catjang을 활성화하세요. 기본 키는 프로젝트 README에 적혀 있어요.",
    licenseKey: "라이선스 키",
    activate: "인증하기",
    missingKey: "라이선스 키를 입력해 주세요.",
    activating: "인증 중입니다...",
    activated: "인증되었습니다. Catjang을 시작합니다.",
    genericError: "라이선스를 인증할 수 없습니다.",
  },
  ja: {
    language: "言語",
    intro: "プロトタイプキーを入力して Catjang を有効化してください。既定キーはプロジェクトの README に記載されています。",
    licenseKey: "ライセンスキー",
    activate: "有効化",
    missingKey: "ライセンスキーを入力してください。",
    activating: "有効化しています...",
    activated: "有効化しました。Catjang を起動します。",
    genericError: "ライセンスを有効化できませんでした。",
  },
};

let currentLanguage = "es";

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
    document.body.classList.add("is-launching");
    // Previously the main process closed this window before the success state
    // could be painted. Keep the license theme visible during the hand-off.
    setTimeout(async () => {
      try {
        await window.electronAPI.licenseStart();
      } catch (error) {
        document.body.classList.remove("is-launching");
        setStatus(normalizeError(error));
        button.disabled = false;
        input.disabled = false;
        input.focus();
      }
    }, 420);
  } catch (error) {
    setStatus(normalizeError(error));
    button.disabled = false;
    input.disabled = false;
    input.focus();
  }
});

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
