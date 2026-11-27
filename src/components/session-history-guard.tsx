"use client";

import { useEffect } from "react";

/**
 * Browsers can restore a protected page from their back/forward cache after
 * logout. Reloading a restored page makes the server validate the revoked
 * session before any account content is used again.
 */
export function SessionHistoryGuard() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
