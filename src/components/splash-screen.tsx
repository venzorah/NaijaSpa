"use client";

import { useEffect, useState } from "react";

const KEY = "naijaspa-splash";

function isAppOpen() {
  try {
    if (sessionStorage.getItem(KEY)) return false;
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === "reload") return false;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const fromThisSite = document.referrer.startsWith(window.location.origin);
    if (!standalone && fromThisSite) return false;
    sessionStorage.setItem(KEY, "1");
    return true;
  } catch {
    return false;
  }
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
    <div className="fixed inset-0 z-[200] grid place-items-center bg-white" role="img" aria-label="NaijaSpa">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/splash-logo.png" alt="NaijaSpa" className="w-[min(72vw,18rem)]" />
    </div>
  );
}
