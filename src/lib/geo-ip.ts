import type { LivePlace } from "./nigeria";
import { mapNigeriaRegionCode, mapNigeriaState } from "./nigeria";

function decodeHeader(raw?: string | null) {
  if (!raw) return "";
  try {
    return decodeURIComponent(raw.replace(/\+/g, " ")).trim();
  } catch {
    return raw.trim();
  }
}

const cache = new Map<string, { place: LivePlace; expiresAt: number }>();
const CACHE_MS = 15 * 60 * 1000;
const MAX_CACHE = 2000;

function isPublicIp(ip: string) {
  const value = ip.trim();
  if (!value || value === "unknown") return false;
  if (value.includes(":")) {
    const lower = value.toLowerCase();
    return lower !== "::1" && !lower.startsWith("fc") && !lower.startsWith("fd") && !lower.startsWith("fe80");
  }
  const parts = value.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0 || a === 169) return false;
  if (a === 192 && b === 168) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  return true;
}

function remember(ip: string, place: LivePlace) {
  if (cache.size >= MAX_CACHE) {
    const now = Date.now();
    for (const [key, row] of cache) if (row.expiresAt <= now) cache.delete(key);
    if (cache.size >= MAX_CACHE) cache.clear();
  }
  cache.set(ip, { place, expiresAt: Date.now() + CACHE_MS });
}

export function livePlaceFromIpFields(input: {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
}) {
  const country = (input.countryCode || input.country || "").trim().toUpperCase();
  const region = (input.region || "").trim();
  const city = (input.city || "").trim();
  const ng = mapNigeriaState(city) || mapNigeriaRegionCode(region) || mapNigeriaState(region);
  if (ng) {
    return {
      country: "NG",
      state: ng,
      city: ng === "FCT" ? "Abuja" : ng === "Lagos" ? "Lagos" : city || ng,
      neighbourhood: "",
      source: "ip" as const
    } satisfies LivePlace;
  }
  return {
    country: country === "UK" ? "GB" : country,
    state: region,
    city,
    neighbourhood: "",
    source: "ip" as const
  } satisfies LivePlace;
}

async function lookupIpwho(ip: string, signal: AbortSignal) {
  const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
    headers: { Accept: "application/json" },
    signal,
    cache: "no-store"
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    success?: boolean;
    country_code?: string;
    region?: string;
    city?: string;
  };
  if (data.success === false || (!data.country_code && !data.region && !data.city)) return null;
  return livePlaceFromIpFields({ countryCode: data.country_code, region: data.region, city: data.city });
}

async function lookupIpinfo(ip: string, token: string, signal: AbortSignal) {
  const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${encodeURIComponent(token)}`, {
    headers: { Accept: "application/json" },
    signal,
    cache: "no-store"
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { country?: string; region?: string; city?: string; bogon?: boolean };
  if (data.bogon) return null;
  if (!data.country && !data.region && !data.city) return null;
  return livePlaceFromIpFields({ countryCode: data.country, region: data.region, city: data.city });
}

async function lookupIpapi(ip: string, signal: AbortSignal) {
  const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
    headers: { Accept: "application/json", "User-Agent": "NaijaSpa/1.0 (concierge@naijaspa.com)" },
    signal,
    cache: "no-store"
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { country_code?: string; region?: string; city?: string; error?: boolean };
  if (data.error || (!data.country_code && !data.region && !data.city)) return null;
  return livePlaceFromIpFields({ countryCode: data.country_code, region: data.region, city: data.city });
}

export async function lookupPlaceFromIp(ip: string, timeoutMs = 1800): Promise<LivePlace | null> {
  if (!isPublicIp(ip)) return null;
  const hit = cache.get(ip);
  if (hit && hit.expiresAt > Date.now()) return hit.place;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const token = process.env.IPINFO_TOKEN?.trim() || process.env.IPINFO_API_TOKEN?.trim() || "";
    const place =
      (await lookupIpwho(ip, controller.signal)) ||
      (token ? await lookupIpinfo(ip, token, controller.signal) : null) ||
      (await lookupIpapi(ip, controller.signal));
    if (place && (place.country || place.state || place.city)) {
      remember(ip, place);
      return place;
    }
  } catch {
    /* VPN, timeout, or provider outage — caller keeps the last known place. */
  } finally {
    clearTimeout(timer);
  }
  return null;
}

export function requestClientIp(headers: Headers) {
  const vercel = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "";
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const real = headers.get("x-real-ip")?.trim() || "";
  const cf = headers.get("cf-connecting-ip")?.trim() || "";
  const candidates = [vercel, forwarded, real, cf];
  return candidates.find((ip) => isPublicIp(ip)) || candidates.find(Boolean) || "";
}

/** Prefer the CDN/edge geo for this request (Vercel, Cloudflare). Do not look up the function's own IP. */
export function placeFromEdgeHeaders(headers: Headers): LivePlace | null {
  const country = decodeHeader(headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry"));
  const region = decodeHeader(headers.get("x-vercel-ip-country-region") || headers.get("x-vercel-ip-region"));
  const city = decodeHeader(headers.get("x-vercel-ip-city"));
  if (!country && !region && !city) return null;
  const place = livePlaceFromIpFields({ countryCode: country, region, city });
  if (!place.country && !place.state && !place.city) return null;
  return place;
}

export function placeLockedByUser(place?: LivePlace | null) {
  return place?.source === "manual" || place?.source === "gps";
}

export function canApplyDetectedPlace(stored: LivePlace | null | undefined, next: LivePlace) {
  if (stored?.source === "manual") return false;
  if (stored?.source === "gps" && next.source !== "gps") return false;
  return Boolean(next.country || next.state || next.city || next.neighbourhood);
}

export async function lookupPlaceFromRequest(headers: Headers, timeoutMs = 1800) {
  const edge = placeFromEdgeHeaders(headers);
  if (edge) return edge;
  return lookupPlaceFromIp(requestClientIp(headers), timeoutMs);
}
