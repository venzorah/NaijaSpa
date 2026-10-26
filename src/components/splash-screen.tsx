"use client";

import { useEffect, useState } from "react";

const KEY = "naijaspa-splash";

function markSession() {
  try {
    sessionStorage.setItem(KEY, "1");
  } catch {
    /* private mode */
  }
  try {
    window.name = KEY;
  } catch {
    /* ignore */
  }
}

function alreadyInSession() {
  try {
    if (sessionStorage.getItem(KEY)) return true;
  } catch {
    /* ignore */
  }
  try {
    if (window.name === KEY) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** True only on a cold open of the site or installed app — not on in-app clicks. */
function isAppOpen() {
  if (typeof window === "undefined") return false;
  if (alreadyInSession()) {
    markSession();
    return false;
  }
  markSession();
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === "reload" || nav?.type === "back_forward") return false;
    if (document.referrer.startsWith(window.location.origin)) return false;
  } catch {
    return false;
  }
  return true;
}

export function SplashScreen() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAppOpen()) return;
    setVisible(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => setVisible(false), reduce ? 400 : 1400);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-bg" role="img" aria-label="NaijaSpa">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/splash-logo.png" alt="NaijaSpa" className="w-[min(72vw,18rem)] dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-horizontal-dark.png"
        alt="NaijaSpa"
        className="hidden w-[min(72vw,18rem)] drop-shadow-[0_1px_10px_rgba(212,175,55,0.3)] dark:block"
      />
    </div>
  );
}
