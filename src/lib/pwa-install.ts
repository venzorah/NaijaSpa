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
