"use client";

import { useEffect } from "react";

function isMediaTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("img, picture, video, canvas, [data-protected-media]"));
}

export function MediaShield() {
  useEffect(() => {
    const blockSave = (event: Event) => {
      if (isMediaTarget(event.target)) event.preventDefault();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen") event.preventDefault();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && isMediaTarget(event.target)) {
        event.preventDefault();
      }
    };
    document.addEventListener("contextmenu", blockSave, { capture: true });
    document.addEventListener("dragstart", blockSave, { capture: true });
    document.addEventListener("copy", blockSave, { capture: true });
    document.addEventListener("cut", blockSave, { capture: true });
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      document.removeEventListener("contextmenu", blockSave, { capture: true });
      document.removeEventListener("dragstart", blockSave, { capture: true });
      document.removeEventListener("copy", blockSave, { capture: true });
      document.removeEventListener("cut", blockSave, { capture: true });
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, []);
  return null;
}
