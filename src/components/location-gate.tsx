"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { persistLivePlace } from "@/components/place-sync";
import { DEFAULT_LIVE_PLACE, isDefaultLivePlace, PLACE_COOKIE, parsePlaceCookie, type LivePlace } from "@/lib/nigeria";
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = readStoredPlace();
    if (!stored) persistLivePlace(DEFAULT_LIVE_PLACE);

    const applyPlace = (place: LivePlace) => {
      persistLivePlace(place);
      const path = window.location.pathname;
      if (path.startsWith("/explore")) {
        router.refresh();
        return;
      }
      try {
        if (sessionStorage.getItem("naijaspa-locate-explore")) {
          router.refresh();
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
      router.refresh();
    };

    const locate = () => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(`/api/geo/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
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
      if (granted && isDefaultLivePlace(stored)) {
        locate();
        return;
      }
      if (!stored) applyPlace(DEFAULT_LIVE_PLACE);
    });
  }, [router, pathname]);

  return null;
}
