"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { detectBrowserIpPlace, detectGpsPlace, detectServerIpPlace } from "@/components/detect-live-place";
import { persistLivePlace, PLACE_EVENT } from "@/components/place-sync";
import { formatPlaceLabel, PLACE_COOKIE, parsePlaceCookie, type LivePlace } from "@/lib/nigeria";
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

export function LocationHubPicker() {
  const router = useRouter();
  const [place, setPlace] = useState<LivePlace | null>(null);
  const [detecting, setDetecting] = useState(true);

  useEffect(() => {
    const stored = readStoredPlace();
    if (stored) {
      setPlace(stored);
      setDetecting(false);
    }
    const onPlace = (event: Event) => {
      const next = (event as CustomEvent<LivePlace>).detail;
      if (next) {
        setPlace(next);
        setDetecting(false);
      }
    };
    window.addEventListener(PLACE_EVENT, onPlace);
    return () => window.removeEventListener(PLACE_EVENT, onPlace);
  }, []);

  const label = detecting && !placeHasLocation(place) ? "Locating…" : formatPlaceLabel(place);

  async function refreshDetected() {
    if (detecting) return;
    setDetecting(true);
    try {
      const next = (await detectGpsPlace()) || (await detectBrowserIpPlace()) || (await detectServerIpPlace());
      if (!next) return;
      persistLivePlace(next);
      setPlace(next);
      router.push(inHref(next));
    } finally {
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
