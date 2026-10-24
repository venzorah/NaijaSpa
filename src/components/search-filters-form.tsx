"use client";

import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { NIGERIA_STATES, PLACE_COOKIE, nigeriaStateLabel, parsePlaceCookie, type LivePlace } from "@/lib/nigeria";
import { exploreHref, inHref } from "@/lib/place-urls";
import { persistLivePlace } from "@/components/place-sync";

function fieldClass() {
  return "box-border min-h-12 w-full min-w-0 max-w-full appearance-none rounded-2xl border-2 border-forest/25 bg-white px-3 text-base leading-normal text-ink outline-none placeholder:text-ink2 focus:border-forest dark:bg-elev";
}

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

export function SearchFiltersForm({
  values,
  compact,
  locateTo = "explore"
}: {
  values?: {
    q?: string;
    state?: string;
    city?: string;
    neighbourhood?: string;
    gender?: string;
    location?: string;
  };
  compact?: boolean;
  locateTo?: "home" | "explore";
}) {
  const router = useRouter();
  const [locating, setLocating] = useState(false);
  const [hint, setHint] = useState("");
  const [place, setPlace] = useState({
    state: values?.state || "",
    city: values?.city || "",
    neighbourhood: values?.neighbourhood || ""
  });

  useEffect(() => {
    setPlace({
      state: values?.state || "",
      city: values?.city || "",
      neighbourhood: values?.neighbourhood || ""
    });
  }, [values?.state, values?.city, values?.neighbourhood]);

  useEffect(() => {
    if (values?.state || values?.city || values?.neighbourhood) return;
    const stored = readStoredPlace();
    if (!stored) return;
    setPlace({
      state: stored.state,
      city: stored.city,
      neighbourhood: stored.neighbourhood
    });
    if (stored.city || stored.neighbourhood || stored.state) {
      setHint([stored.neighbourhood, stored.city, stored.state].filter(Boolean).join(", "));
    }
  }, [values?.state, values?.city, values?.neighbourhood]);

  function go(next: { state: string; city: string; neighbourhood: string }, extra?: { q?: string; gender?: string; location?: string }) {
    persistLivePlace(next);
    if (locateTo === "home") {
      router.push(inHref(next));
      router.refresh();
      return;
    }
    router.push(
      exploreHref(next, {
        q: extra?.q || values?.q,
        location: extra?.location || values?.location
      })
    );
  }

  async function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setHint("Location is not available on this device.");
      return;
    }
    setLocating(true);
    setHint("Finding therapists near you…");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`/api/geo/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`);
          const json = (await res.json()) as LivePlace & { error?: string };
          if (!res.ok) {
            setHint(json.error || "Could not read your location.");
            return;
          }
          const next = { state: json.state || "", city: json.city || "", neighbourhood: json.neighbourhood || "" };
          setPlace(next);
          setHint([next.neighbourhood, next.city, next.state].filter(Boolean).join(", ") || "Location saved.");
          go(next);
        } catch {
          setHint("Could not read your location.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setHint("Allow location to see therapists in your state, closest first.");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60_000 }
    );
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const next = {
      state: String(fd.get("state") || ""),
      city: String(fd.get("city") || ""),
      neighbourhood: ""
    };
    if (next.state || next.city) persistLivePlace({ ...place, ...next });
    router.push(
      exploreHref(next, {
        q: String(fd.get("q") || "") || undefined,
        location: String(fd.get("location") || "") || undefined
      })
    );
  }

  return (
    <form
      action="/explore"
      onSubmit={onSubmit}
      className="mt-5 w-full min-w-0 max-w-full overflow-x-clip rounded-[1.75rem] border-2 border-forest bg-white p-4 shadow-[0_16px_40px_rgba(6,78,59,0.14)] dark:bg-card sm:p-5"
    >
      <div className="mb-4 flex min-w-0 flex-col gap-3">
        <div className="min-w-0">
          <p className="font-display text-2xl leading-tight text-forest dark:text-gold">Find a therapist</p>
          <p className="mt-1 text-sm leading-snug text-ink2">{hint || "Search a state to see every therapist there. Your area is used to sort."}</p>
        </div>
        <button
          type="button"
          onClick={() => void useMyLocation()}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border-2 border-gold bg-gold/15 px-4 text-base font-bold text-forest dark:text-gold sm:w-auto"
        >
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="min-w-0 md:col-span-2 lg:col-span-2">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-forest">Treatment or therapist</span>
          <input name="q" defaultValue={values?.q} placeholder="Nuru, Swedish, couples…" className={fieldClass()} />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-forest">State</span>
          <select name="state" value={place.state} onChange={(e) => setPlace((p) => ({ ...p, state: e.target.value }))} className={fieldClass()}>
            <option value="">All states</option>
            {NIGERIA_STATES.map((state) => (
              <option key={state} value={state}>
                {nigeriaStateLabel(state)}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-forest">City</span>
          <input
            name="city"
            value={place.city}
            onChange={(e) => setPlace((p) => ({ ...p, city: e.target.value }))}
            placeholder="e.g. Lagos"
            className={fieldClass()}
          />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-forest">Where</span>
          <select name="location" defaultValue={values?.location || ""} className={fieldClass()}>
            <option value="">Spa, hotel or home</option>
            <option value="spa">Spa/Office</option>
            <option value="hotel">Hotel</option>
            <option value="home">Home</option>
          </select>
        </label>
        <div className="flex min-w-0 items-end md:col-span-2 lg:col-span-1">
          <button type="submit" className="min-h-12 w-full rounded-full bg-gold text-base font-bold text-ongold">
            Search
          </button>
        </div>
      </div>
    </form>
  );
}
