"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { persistLivePlace, PLACE_EVENT } from "@/components/place-sync";
import { hubLabelForPlace, hubToPlace, nigeriaStateHubs, type MarketplaceHub } from "@/lib/hubs";
import { formatPlaceLabel, PLACE_COOKIE, parsePlaceCookie, type LivePlace } from "@/lib/nigeria";
import { inHref } from "@/lib/place-urls";

const STATE_HUBS = nigeriaStateHubs();

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
  const [open, setOpen] = useState(false);
  const [hubs] = useState<MarketplaceHub[]>(STATE_HUBS);
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

  const label = detecting && !place ? "Locating…" : hubLabelForPlace(place);

  function choose(next: LivePlace, source: LivePlace["source"] = "manual") {
    const stored = { ...next, source };
    persistLivePlace(stored);
    setPlace(stored);
    setOpen(false);
    router.push(inHref(next));
  }

  async function useDetected() {
    setDetecting(true);
    try {
      const res = await fetch("/api/geo/ip", { cache: "no-store" });
      const json = (await res.json()) as LivePlace & { error?: string };
      if (!res.ok || json.error) return;
      choose(
        {
          country: json.country || "",
          state: json.state || "",
          city: json.city || "",
          neighbourhood: json.neighbourhood || ""
        },
        "ip"
      );
    } finally {
      setDetecting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 max-w-[42vw] items-center gap-1 rounded-full border border-line bg-card px-2.5 text-[13px] font-semibold text-ink shadow-sm hover:bg-elev sm:max-w-none"
        aria-label={`${label}. Change city`}
        aria-busy={detecting && !place}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink2" aria-hidden />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Your location">
        {place ? <p className="mb-3 text-xs text-ink2">Current: {formatPlaceLabel(place)}</p> : null}
        <button
          type="button"
          onClick={() => void useDetected()}
          className="mb-3 flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-leaf/40 bg-leaf/10 px-4 text-sm font-semibold text-ink"
        >
          Use detected location
        </button>
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {hubs.map((hub) => {
            const selected = Boolean(place?.state === hub.state);
            return (
              <li key={hub.id}>
                <button
                  type="button"
                  onClick={() => choose({ ...hubToPlace(hub), country: "NG" })}
                  className={`flex min-h-[56px] w-full items-center justify-between rounded-2xl border px-4 text-left font-semibold ${
                    selected ? "border-gold/60 bg-gold/10 text-ink" : "border-line bg-card text-ink"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-leaf" aria-hidden />
                    {formatPlaceLabel({ ...hubToPlace(hub), country: "NG" })}
                  </span>
                  {selected ? <Check className="h-5 w-5 text-goldink" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-ink2">We set this from your network location. Pick a state only if you want to browse somewhere else.</p>
      </BottomSheet>
    </>
  );
}
