"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { persistLivePlace } from "@/components/place-sync";
import { type LivePlace } from "@/lib/nigeria";
import { inHref, placeHasLocation } from "@/lib/place-urls";

const ASKED = "naijaspa-place-asked";

export function LocationGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    if (pathname.startsWith("/in/")) return;
    try {
      if (sessionStorage.getItem(ASKED)) return;
      sessionStorage.setItem(ASKED, "1");
    } catch {
      /* continue */
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/geo/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          const json = (await res.json()) as LivePlace & { error?: string };
          if (!res.ok || json.error) return;
          const place = {
            state: json.state || "",
            city: json.city || "",
            neighbourhood: json.neighbourhood || ""
          };
          persistLivePlace(place);
          const path = window.location.pathname;
          if (path.startsWith("/explore")) return;
          try {
            if (sessionStorage.getItem("naijaspa-locate-explore")) return;
          } catch {
            /* continue */
          }
          if (path === "/" && placeHasLocation(place)) {
            router.replace(inHref(place));
            return;
          }
          router.refresh();
        } catch {
          /* keep unfiltered feed */
        }
      },
      () => {
        try {
          sessionStorage.setItem(ASKED, "denied");
        } catch {
          /* ignore */
        }
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 15 * 60 * 1000 }
    );
  }, [router, pathname]);

  return null;
}
