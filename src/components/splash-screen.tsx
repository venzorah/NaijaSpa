"use client";

import { useEffect } from "react";
import { SPLASH_MAX_MS, SPLASH_REDUCED_MS } from "@/lib/pwa-splash";

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
    const hide = () => root.classList.remove("ns-splash");
    const t = window.setTimeout(hide, reduce ? SPLASH_REDUCED_MS : SPLASH_MAX_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div id="ns-splash" className="ns-splash-layer" role="img" aria-label="NaijaSpa">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/splash-logo.png" alt="" width={320} height={360} />
    </div>
  );
}
