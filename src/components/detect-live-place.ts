"use client";

import { canApplyDetectedPlace, livePlaceFromIpFields } from "@/lib/geo-ip";
import { placeFromCoordinates } from "@/lib/ng-coordinates";
import { mapNigeriaState, type LivePlace } from "@/lib/nigeria";

export { canApplyDetectedPlace };

function asPlace(json: LivePlace & { error?: string }, source: LivePlace["source"]): LivePlace | null {
  if (json.error) return null;
  if (source === "ip") {
    const place = livePlaceFromIpFields({ countryCode: json.country, region: json.state, city: json.city });
    if (!place.country && !place.state && !place.city) return null;
    return place;
  }
  const ng = mapNigeriaState(json.state) || mapNigeriaState(json.city);
  const place: LivePlace = {
    country: json.country || (ng ? "NG" : ""),
    state: ng || json.state || "",
    city: json.city || "",
    neighbourhood: json.neighbourhood || "",
    source
  };
  if (!place.country && !place.state && !place.city) return null;
  return place;
}

export async function reverseGpsPlace(lat: number, lng: number, signal?: AbortSignal): Promise<LivePlace | null> {
  try {
    const res = await fetch(`/api/geo/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`, {
      signal,
      cache: "no-store"
    });
    const json = (await res.json()) as LivePlace & { error?: string };
    if (res.ok) {
      const place = asPlace(json, "gps");
      if (place?.state || place?.city) return place;
    }
  } catch {
    /* fall through to coordinate boxes */
  }
  return placeFromCoordinates(lat, lng);
}

export async function detectGpsPlace(signal?: AbortSignal): Promise<LivePlace | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) return null;
  try {
    const status = await navigator.permissions?.query({ name: "geolocation" });
    if (status?.state === "denied") return null;
  } catch {
    /* Safari / Firefox may not expose this permission. */
  }
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60_000
      });
    });
    if (signal?.aborted) return null;
    return reverseGpsPlace(pos.coords.latitude, pos.coords.longitude, signal);
  } catch {
    return null;
  }
}

export async function detectBrowserIpPlace(signal?: AbortSignal): Promise<LivePlace | null> {
  try {
    const res = await fetch("https://ipwho.is/", { signal, cache: "no-store" });
    const data = (await res.json()) as {
      success?: boolean;
      country_code?: string;
      region?: string;
      city?: string;
    };
    if (!res.ok || data.success === false) return null;
    const place = livePlaceFromIpFields({ countryCode: data.country_code, region: data.region, city: data.city });
    if (!place.country && !place.state && !place.city) return null;
    return place;
  } catch {
    return null;
  }
}

export async function detectServerIpPlace(signal?: AbortSignal): Promise<LivePlace | null> {
  try {
    const res = await fetch("/api/geo/ip", { signal, cache: "no-store" });
    const json = (await res.json()) as LivePlace & { error?: string };
    if (!res.ok) return null;
    return asPlace(json, "ip");
  } catch {
    return null;
  }
}
