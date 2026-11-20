export type BeforeInstall = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export const INSTALL_DISMISS_KEY = "naijaspa-install-dismissed";
export const INSTALL_DISMISS_AT_KEY = "naijaspa-install-dismissed-at";
export const INSTALL_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
export const INSTALL_SHOW_DELAY_MS = 4000;
export const NAIJASPA_CAN_INSTALL = "naijaspa-can-install";

declare global {
  interface Window {
    __naijaspaDeferredInstall?: BeforeInstall | null;
    __naijaspaInstallCaptureBound?: boolean;
  }
}

export function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)").matches;
  const ios = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || ios;
}

export function isAppleMobile() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

export function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  return /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|Snapchat|WhatsApp/i.test(navigator.userAgent);
}

export function isSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Android/i.test(ua);
  return isSafari || (isAppleMobile() && !/CriOS|FxiOS|EdgiOS/i.test(ua) && !isInAppBrowser());
}

export function isInstallDismissed(now = Date.now(), storage?: Storage | null) {
  const store = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!store) return false;
  try {
    if (store.getItem(INSTALL_DISMISS_KEY) === "1") return true;
    const at = Number(store.getItem(INSTALL_DISMISS_AT_KEY) || 0);
    return Boolean(at && now - at < INSTALL_COOLDOWN_MS);
  } catch {
    return false;
  }
}

export function markInstallDismissed(now = Date.now(), storage?: Storage | null) {
  const store = storage ?? (typeof localStorage === "undefined" ? null : localStorage);
  if (!store) return;
  try {
    store.setItem(INSTALL_DISMISS_AT_KEY, String(now));
    store.removeItem(INSTALL_DISMISS_KEY);
  } catch {
    /* private mode */
  }
}

export function bindInstallPromptCapture() {
  if (typeof window === "undefined" || window.__naijaspaInstallCaptureBound) return;
  window.__naijaspaInstallCaptureBound = true;
  window.addEventListener(
    "beforeinstallprompt",
    (event) => {
      event.preventDefault();
      window.__naijaspaDeferredInstall = event as BeforeInstall;
      window.dispatchEvent(new Event(NAIJASPA_CAN_INSTALL));
    },
    true
  );
  window.addEventListener("appinstalled", () => {
    window.__naijaspaDeferredInstall = null;
  });
}

export function peekInstallPrompt() {
  if (typeof window === "undefined") return null;
  return window.__naijaspaDeferredInstall ?? null;
}

export function takeInstallPrompt() {
  const event = peekInstallPrompt();
  if (typeof window !== "undefined") window.__naijaspaDeferredInstall = null;
  return event;
}
