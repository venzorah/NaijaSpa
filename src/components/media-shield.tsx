"use client";

import { useEffect } from "react";

function isProtectedTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("img, picture, video, canvas, [data-protected-media]"));
}

export function MediaShield() {
  useEffect(() => {
    const block = (event: Event) => {
      if (isProtectedTarget(event.target)) event.preventDefault();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen") event.preventDefault();
    };
    document.addEventListener("contextmenu", block, { capture: true });
    document.addEventListener("dragstart", block, { capture: true });
    document.addEventListener("copy", block, { capture: true });
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      document.removeEventListener("contextmenu", block, { capture: true });
      document.removeEventListener("dragstart", block, { capture: true });
      document.removeEventListener("copy", block, { capture: true });
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, []);
  return null;
}
