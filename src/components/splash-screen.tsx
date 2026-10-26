"use client";

import { useEffect } from "react";
import { SPLASH_MAX_MS, SPLASH_REDUCED_MS } from "@/lib/pwa-splash";
import { isStandaloneDisplay } from "@/lib/pwa-install";

const KEY = "naijaspa-splash";

export function SplashScreen() {
  useEffect(() => {
    const root = document.documentElement;
    const hide = () => root.classList.remove("ns-splash");
    if (isStandaloneDisplay()) {
      hide();
      return;
    }
    if (!root.classList.contains("ns-splash")) return;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* private mode */
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cap = reduce ? SPLASH_REDUCED_MS : SPLASH_MAX_MS;
    const started = Number(root.getAttribute("data-splash-at") || Date.now());
    const remaining = cap - (Date.now() - started);
    if (remaining <= 0) {
      hide();
      return;
    }
    const t = window.setTimeout(hide, remaining);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div id="ns-splash" className="ns-splash-layer" role="img" aria-label="NaijaSpa">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/splash-logo.png" alt="" width={240} height={240} decoding="async" />
    </div>
  );
}
