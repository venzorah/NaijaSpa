"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { persistLivePlace } from "@/components/place-sync";
import {
  DEFAULT_MARKETPLACE_HUBS,
  hubLabelForPlace,
  hubToPlace,
  type MarketplaceHub
} from "@/lib/hubs";
import { PLACE_COOKIE, parsePlaceCookie, type LivePlace } from "@/lib/nigeria";
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
  const [open, setOpen] = useState(false);
  const [hubs, setHubs] = useState<MarketplaceHub[]>(DEFAULT_MARKETPLACE_HUBS);
  const [place, setPlace] = useState<LivePlace | null>(null);

  useEffect(() => {
    setPlace(readStoredPlace());
  }, []);

  useEffect(() => {
    if (!open) return;
    fetch("/api/hubs")
      .then((r) => r.json())
      .then((data: { hubs?: MarketplaceHub[] }) => {
        if (Array.isArray(data.hubs) && data.hubs.length) setHubs(data.hubs);
      })
      .catch(() => undefined);
  }, [open]);

  const label = hubLabelForPlace(place, hubs);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-10 max-w-[42vw] items-center gap-1 rounded-full border border-line bg-card px-2.5 text-[13px] font-semibold text-ink shadow-sm hover:bg-elev sm:max-w-none"
        aria-label={`Location: ${label}. Change location`}
      >
        <MapPin className="h-3.5 w-3.5 shrink-0 text-leaf" aria-hidden />
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink2" aria-hidden />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Choose your city">
        <ul className="space-y-2">
          {hubs.map((hub) => {
            const selected = hubLabelForPlace(place, hubs) === hub.label;
            return (
              <li key={hub.id}>
                <button
                  type="button"
                  onClick={() => {
                    const next = hubToPlace(hub);
                    persistLivePlace(next);
                    setPlace(next);
                    setOpen(false);
                    router.push(inHref(next));
                    router.refresh();
                  }}
                  className={`flex min-h-[56px] w-full items-center justify-between rounded-2xl border px-4 text-left font-semibold ${
                    selected ? "border-gold/60 bg-gold/10 text-ink" : "border-line bg-card text-ink"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-leaf" aria-hidden />
                    {hub.label}
                  </span>
                  {selected ? <Check className="h-5 w-5 text-goldink" aria-hidden /> : null}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-ink2">Lagos, Abuja, Port Harcourt, Delta and Anambra are live. Admin can add more states from Commercial.</p>
      </BottomSheet>
    </>
  );
}
