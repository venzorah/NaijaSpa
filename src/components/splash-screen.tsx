"use client";

import { useEffect } from "react";

const KEY = "naijaspa-splash";

export function SplashScreen() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains("ns-splash")) return;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* private mode */
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => root.classList.remove("ns-splash"), reduce ? 400 : 1600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div id="ns-splash" className="ns-splash-layer" role="img" aria-label="NaijaSpa">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/splash-logo.png" alt="" width={288} height={288} />
    </div>
  );
}
