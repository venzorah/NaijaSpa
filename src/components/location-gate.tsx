"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  canApplyDetectedPlace,
  detectBrowserIpPlace,
  detectGpsPlace,
  detectServerIpPlace
} from "@/components/detect-live-place";
import { persistLivePlace } from "@/components/place-sync";
import { isUntrustedNetworkPlace } from "@/lib/geo-ip";
import { normalizePlace, PLACE_COOKIE, parsePlaceCookie, type LivePlace } from "@/lib/nigeria";
import { inHref, needsLocationResolve, placeHasLocation } from "@/lib/place-urls";

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

export function LocationGate() {
  const router = useRouter();
  const pathname = usePathname();
  const attempted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!needsLocationResolve(pathname)) return;
    let cancelled = false;
    const controller = new AbortController();

    const stored = readStoredPlace();
    const placeKey = (place: LivePlace | null) =>
      [place?.country, place?.state, place?.city, place?.neighbourhood, place?.source].map(normalizePlace).join("|");
    const originalPlace = placeKey(stored);
    const cancel = () => {
      cancelled = true;
      controller.abort();
    };
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
      const latest = readStoredPlace();
      if (!canApplyDetectedPlace(latest, place)) return;
      persistLivePlace(place);
      const path = window.location.pathname;
      if (path.startsWith("/explore")) {
        if (placeKey(place) !== originalPlace) router.refresh();
        return;
      }
      if (placeHasLocation(place)) {
        const next = inHref(place);
        if (path === "/" || (path.startsWith("/in/") && path !== next)) {
          router.replace(next);
          return;
        }
      }
      if (placeKey(place) !== originalPlace) router.refresh();
    };

    const detect = async () => {
      if (attempted.current) return;
      const current = readStoredPlace();
      if (current?.source === "manual") return;
      attempted.current = true;

      if (isUntrustedNetworkPlace(current) && (current?.state || current?.city)) {
        persistLivePlace({ country: "NG", state: "", city: "", neighbourhood: "", source: "ip" });
      }

      const gps = await detectGpsPlace(controller.signal);
      if (gps) {
        applyPlace(gps);
        return;
      }
      if (cancelled || current?.source === "gps") return;
      const ip = (await detectBrowserIpPlace(controller.signal)) || (await detectServerIpPlace(controller.signal));
      if (ip) applyPlace(ip);
    };

    void detect();
    return () => {
      cancel();
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", cancel, true);
      window.removeEventListener("popstate", cancel);
    };
  }, [router, pathname]);

  return null;
}
