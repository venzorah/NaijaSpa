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
import { normalizePlace, PLACE_COOKIE, parsePlaceCookie, stateBrowsePlace, type LivePlace } from "@/lib/nigeria";
import { canAutoOpenPlaceHub, inHref, needsLocationResolve, placeHasLocation } from "@/lib/place-urls";

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
    const applyPlace = (place: LivePlace) => {
      const latest = readStoredPlace();
      if (!canApplyDetectedPlace(latest, place)) return;
      persistLivePlace(place);
      const path = window.location.pathname;
      if (path.startsWith("/explore")) {
        if (placeKey(place) !== originalPlace) router.refresh();
        return;
      }
      if (placeHasLocation(place) && canAutoOpenPlaceHub(path)) {
        const next = inHref(place);
        if (path !== next) {
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
      if (current?.source === "gps" && current.neighbourhood) return;
      if (current?.source === "gps" && (current.state || current.city)) {
        const hub = stateBrowsePlace(current);
        attempted.current = true;
        if (hub && (hub.city !== current.city || hub.state !== current.state)) applyPlace(hub);
        return;
      }
      attempted.current = true;

      const gps = await detectGpsPlace(controller.signal);
      const hub = gps ? stateBrowsePlace(gps) : null;
      if (hub && (hub.state || hub.city)) {
        applyPlace(hub);
        return;
      }
      if (cancelled || current?.source === "gps") return;
      const ip = (await detectBrowserIpPlace(controller.signal)) || (await detectServerIpPlace(controller.signal));
      if (ip && (ip.state || ip.city) && !isUntrustedNetworkPlace(ip)) applyPlace(ip);
    };

    void detect();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [router, pathname]);

  return null;
}
