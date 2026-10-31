"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { persistLivePlace } from "@/components/place-sync";
import { DEFAULT_LIVE_PLACE, isDefaultLivePlace, normalizePlace, PLACE_COOKIE, parsePlaceCookie, type LivePlace } from "@/lib/nigeria";
import { inHref, placeHasLocation } from "@/lib/place-urls";

function readStoredPlace(): LivePlace | null {
  try {
    const fromStorage = parsePlaceCookie(localStorage.getItem(PLACE_COOKIE));
    if (fromStorage) return fromStorage;
    const cookie = document.cookie.split("; ").find((row) => row.startsWith(`${PLACE_COOKIE}=`));
    if (!cookie) return null;
    return parsePlaceCookie(decodeURIComponent(cookie.split("=").slice(1).join("=")));
  } catch {
    return null;
  }
}

async function geolocationGranted() {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return false;
  try {
    if (!navigator.permissions?.query) return false;
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state === "granted";
  } catch {
    return false;
  }
}

export function LocationGate() {
  const router = useRouter();
  const pathname = usePathname();
  const attemptedLocation = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Explicit place URLs already have a location; account/auth routes do not need one.
    if (pathname !== "/" && pathname !== "/explore") return;
    let cancelled = false;
    const controller = new AbortController();

    const stored = readStoredPlace();
    if (!stored) persistLivePlace(DEFAULT_LIVE_PLACE);
    const placeKey = (place: LivePlace | null) => [place?.state, place?.city, place?.neighbourhood].map(normalizePlace).join("|");
    const originalPlace = placeKey(stored ?? DEFAULT_LIVE_PLACE);
    const cancel = () => { cancelled = true; controller.abort(); };
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href);
      if (destination.origin === window.location.origin && (destination.pathname !== window.location.pathname || destination.search !== window.location.search)) cancel();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", cancel, true);
    window.addEventListener("popstate", cancel);

    const applyPlace = (place: LivePlace) => {
      if (cancelled) return;
      // A manual location choice takes priority over an older device lookup.
      if (placeKey(readStoredPlace()) !== originalPlace) return;
      const changed = placeKey(place) !== originalPlace;
      persistLivePlace(place);
      const path = window.location.pathname;
      if (path.startsWith("/explore")) {
        if (changed) router.refresh();
        return;
      }
      try {
        if (sessionStorage.getItem("naijaspa-locate-explore")) {
          if (changed) router.refresh();
          return;
        }
      } catch {
        /* continue */
      }
      if (placeHasLocation(place)) {
        const next = inHref(place);
        if (path === "/" || (path.startsWith("/in/") && path !== next)) {
          router.replace(next);
          return;
        }
      }
      if (changed) router.refresh();
    };

    const locate = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          try {
            const res = await fetch(`/api/geo/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`, { signal: controller.signal });
            const json = (await res.json()) as LivePlace & { error?: string };
            if (!res.ok || json.error) return;
            applyPlace({
              state: json.state || "",
              city: json.city || "",
              neighbourhood: json.neighbourhood || ""
            });
          } catch {
            /* keep Abuja default */
          }
        },
        () => undefined,
        { enableHighAccuracy: false, timeout: 12000, maximumAge: 15 * 60 * 1000 }
      );
    };

    void geolocationGranted().then((granted) => {
      if (cancelled) return;
      if (granted && isDefaultLivePlace(stored) && !attemptedLocation.current) {
        attemptedLocation.current = true;
        locate();
        return;
      }
      if (!stored) applyPlace(DEFAULT_LIVE_PLACE);
    });
    return () => {
      cancel();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", cancel, true);
      window.removeEventListener("popstate", cancel);
    };
  }, [router, pathname]);

  return null;
}
