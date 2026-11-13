"use client";

import { useEffect } from "react";

function isMediaTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("img, picture, video, canvas, [data-protected-media]"));
}

function isChatPhotoTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("[data-protected-media], canvas"));
}

export function MediaShield() {
  useEffect(() => {
    const blockSave = (event: Event) => {
      if (isMediaTarget(event.target)) event.preventDefault();
    };
    const blockCopy = (event: Event) => {
      if (isChatPhotoTarget(event.target)) event.preventDefault();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen") event.preventDefault();
    };
    document.addEventListener("contextmenu", blockSave, { capture: true });
    document.addEventListener("dragstart", blockSave, { capture: true });
    document.addEventListener("copy", blockCopy, { capture: true });
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      document.removeEventListener("contextmenu", blockSave, { capture: true });
      document.removeEventListener("dragstart", blockSave, { capture: true });
      document.removeEventListener("copy", blockCopy, { capture: true });
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, []);
  return null;
}
