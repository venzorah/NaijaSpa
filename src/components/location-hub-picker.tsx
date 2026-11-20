"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { detectBrowserIpPlace, detectGpsPlace, detectServerIpPlace } from "@/components/detect-live-place";
import { persistLivePlace, PLACE_EVENT } from "@/components/place-sync";
import { navPlaceLabel, PLACE_COOKIE, parsePlaceCookie, stateBrowsePlace, type LivePlace } from "@/lib/nigeria";
import { inHref } from "@/lib/place-urls";

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

export function LocationHubPicker() {
  const router = useRouter();
  const [place, setPlace] = useState<LivePlace | null>(null);
  const [detecting, setDetecting] = useState(true);
  const inFlight = useRef(false);

  useEffect(() => {
    const stored = readStoredPlace();
    if (stored && (stored.state || stored.city) && stored.source === "gps") {
      setPlace(stored.neighbourhood ? stored : stateBrowsePlace(stored) ?? stored);
      setDetecting(false);
    }
    const onPlace = (event: Event) => {
      const next = (event as CustomEvent<LivePlace>).detail;
      if (next?.state || next?.city) {
        setPlace(next);
        setDetecting(false);
      }
    };
    window.addEventListener(PLACE_EVENT, onPlace);
    if (stored?.source === "gps" && (stored.state || stored.city)) {
      if (!stored.neighbourhood) {
        const hub = stateBrowsePlace(stored);
        if (hub && (hub.city !== stored.city || hub.state !== stored.state)) {
          persistLivePlace(hub);
          setPlace(hub);
          router.replace(inHref(hub));
        }
      }
      return () => window.removeEventListener(PLACE_EVENT, onPlace);
    }
    void (async () => {
      if (inFlight.current) return;
      if (stored?.source === "manual") return;
      inFlight.current = true;
      setDetecting(true);
      try {
        const next = stateBrowsePlace(await detectGpsPlace());
        if (!next || (!next.state && !next.city)) return;
        persistLivePlace(next);
        setPlace(next);
        router.replace(inHref(next));
      } finally {
        inFlight.current = false;
        setDetecting(false);
      }
    })();
    return () => window.removeEventListener(PLACE_EVENT, onPlace);
  }, [router]);

  const label = detecting ? "Locating…" : navPlaceLabel(place);

  async function refreshDetected() {
    if (inFlight.current) return;
    inFlight.current = true;
    setDetecting(true);
    try {
      const next = stateBrowsePlace((await detectGpsPlace()) || (await detectBrowserIpPlace()) || (await detectServerIpPlace()));
      if (!next || (!next.state && !next.city)) return;
      persistLivePlace(next);
      setPlace(next);
      router.push(inHref(next));
    } finally {
      inFlight.current = false;
      setDetecting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void refreshDetected()}
      className="flex h-10 max-w-[42vw] items-center gap-1 rounded-full border border-line bg-card px-2.5 text-[13px] font-semibold text-ink shadow-sm hover:bg-elev sm:max-w-none"
      aria-label={label}
      aria-busy={detecting}
      title="Refresh detected location"
    >
      <MapPin className="h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}
