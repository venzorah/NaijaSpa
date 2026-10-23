"use client";

import { useEffect, useState, type RefObject } from "react";

export function useAutoScroll(ref: RefObject<HTMLElement | null>, intervalMs = 4200) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      const el = ref.current;
      if (!el) return;
      const step = Math.min(el.clientWidth * 0.72, 320);
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 12;
      if (atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
      else el.scrollBy({ left: step, behavior: "smooth" });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [paused, intervalMs, ref]);

  return {
    paused,
    pause: () => setPaused(true),
    resume: () => setPaused(false)
  };
}
