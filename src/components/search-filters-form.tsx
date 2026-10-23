"use client";

import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { NIGERIA_STATES, PLACE_COOKIE, parsePlaceCookie, type LivePlace } from "@/lib/nigeria";
import { exploreHref, inHref } from "@/lib/place-urls";
import { persistLivePlace } from "@/components/place-sync";

function fieldClass() {
  return "min-h-12 w-full rounded-2xl border-2 border-forest/25 bg-white px-3 text-sm text-ink outline-none placeholder:text-ink2 focus:border-forest dark:bg-elev";
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
        gender: extra?.gender || values?.gender,
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
        setHint("Allow location to see therapists in your city first.");
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
      neighbourhood: String(fd.get("neighbourhood") || "")
    };
    if (next.state || next.city || next.neighbourhood) persistLivePlace(next);
    router.push(
      exploreHref(next, {
        q: String(fd.get("q") || "") || undefined,
        gender: String(fd.get("gender") || "") || undefined,
        location: String(fd.get("location") || "") || undefined
      })
    );
  }

  return (
    <form
      action="/explore"
      onSubmit={onSubmit}
      className={`mt-5 rounded-[1.75rem] border-2 border-forest bg-white p-4 shadow-[0_16px_40px_rgba(6,78,59,0.14)] dark:bg-card sm:p-5 ${compact ? "" : ""}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl leading-none text-forest dark:text-gold">Find a therapist</p>
          <p className="mt-1 text-sm text-ink2">{hint || "Search by state, city, area and preferred gender."}</p>
        </div>
        <button
          type="button"
          onClick={() => void useMyLocation()}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-gold bg-gold/15 px-4 text-sm font-bold text-forest dark:text-gold"
        >
          <MapPin className="h-4 w-4" aria-hidden />
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>
      <div className={`grid gap-3 ${compact ? "sm:grid-cols-2" : "md:grid-cols-3 lg:grid-cols-4"}`}>
        <label className={compact ? "sm:col-span-2" : "md:col-span-2"}>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-forest">Treatment or therapist</span>
          <input name="q" defaultValue={values?.q} placeholder="Nuru, Swedish, couples…" className={fieldClass()} />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-forest">State</span>
          <select name="state" value={place.state} onChange={(e) => setPlace((p) => ({ ...p, state: e.target.value }))} className={fieldClass()}>
            <option value="">All states</option>
            {NIGERIA_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-forest">City</span>
          <input
            name="city"
            value={place.city}
            onChange={(e) => setPlace((p) => ({ ...p, city: e.target.value }))}
            placeholder="e.g. Lagos"
            className={fieldClass()}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-forest">Location / area</span>
          <input
            name="neighbourhood"
            value={place.neighbourhood}
            onChange={(e) => setPlace((p) => ({ ...p, neighbourhood: e.target.value }))}
            placeholder="e.g. Lekki"
            className={fieldClass()}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-forest">Preferred gender</span>
          <select name="gender" defaultValue={values?.gender || ""} className={fieldClass()}>
            <option value="">Any</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </label>
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-forest">Where</span>
          <select name="location" defaultValue={values?.location || ""} className={fieldClass()}>
            <option value="">Spa, hotel or home</option>
            <option value="spa">Spa/Office</option>
            <option value="hotel">Hotel</option>
            <option value="home">Home</option>
          </select>
        </label>
        <div className="flex items-end">
          <button className="min-h-12 w-full rounded-full bg-gold text-base font-bold text-ongold">Search</button>
        </div>
      </div>
    </form>
  );
}
