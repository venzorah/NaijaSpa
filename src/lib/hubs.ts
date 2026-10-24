import { mapNigeriaState, NIGERIA_STATES, normalizePlace, type LivePlace } from "./nigeria";

export const MARKETPLACE_HUBS_KEY = "marketplaceHubs";

export type MarketplaceHub = {
  id: string;
  label: string;
  state: string;
  city: string;
  locked?: boolean;
};

/** Always shown. Admin may append other Nigerian states. */
export const DEFAULT_MARKETPLACE_HUBS: MarketplaceHub[] = [
  { id: "lagos", label: "Lagos", state: "Lagos", city: "", locked: true },
  { id: "abuja", label: "Abuja", state: "FCT", city: "Abuja", locked: true },
  { id: "port-harcourt", label: "Port Harcourt", state: "Rivers", city: "Port Harcourt", locked: true },
  { id: "delta", label: "Delta", state: "Delta", city: "", locked: true },
  { id: "anambra", label: "Anambra", state: "Anambra", city: "", locked: true }
];

function hubId(state: string, city: string) {
  return [state, city].filter(Boolean).join("-").toLowerCase().replace(/\s+/g, "-");
}

export function extraHubFromState(raw: string): MarketplaceHub | null {
  const state = mapNigeriaState(raw);
  if (!state) return null;
  if (DEFAULT_MARKETPLACE_HUBS.some((h) => h.state === state)) return null;
  const label = state === "FCT" ? "Abuja" : state;
  return { id: hubId(state, ""), label, state, city: "", locked: false };
}

export function parseMarketplaceHubs(raw?: string | null): MarketplaceHub[] {
  const extras: MarketplaceHub[] = [];
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const list = Array.isArray(parsed) ? parsed : [];
      for (const item of list) {
        if (typeof item === "string") {
          const hub = extraHubFromState(item);
          if (hub && !extras.some((e) => e.state === hub.state)) extras.push(hub);
          continue;
        }
        if (!item || typeof item !== "object") continue;
        const rec = item as Record<string, unknown>;
        const state = mapNigeriaState(String(rec.state || rec.label || ""));
        if (!state) continue;
        if (DEFAULT_MARKETPLACE_HUBS.some((h) => h.state === state)) continue;
        if (extras.some((e) => e.state === state)) continue;
        extras.push({
          id: String(rec.id || hubId(state, String(rec.city || ""))),
          label: String(rec.label || (state === "FCT" ? "Abuja" : state)),
          state,
          city: String(rec.city || ""),
          locked: false
        });
      }
    } catch {
      /* keep defaults */
    }
  }
  return [...DEFAULT_MARKETPLACE_HUBS, ...extras];
}

export function hubToPlace(hub: MarketplaceHub): LivePlace {
  return { state: hub.state, city: hub.city, neighbourhood: "" };
}

export function hubLabelForPlace(place?: LivePlace | null, hubs: MarketplaceHub[] = DEFAULT_MARKETPLACE_HUBS) {
  if (!place) return hubs[0]?.label ?? "Lagos";
  const hit =
    hubs.find((h) => h.state === place.state && normalizePlace(h.city) === normalizePlace(place.city) && h.city) ||
    hubs.find((h) => h.state === place.state) ||
    hubs.find((h) => normalizePlace(h.label) === normalizePlace(place.city));
  if (hit) return hit.label;
  if (place.city) return place.city;
  if (place.state === "FCT") return "Abuja";
  return place.state || hubs[0]?.label || "Lagos";
}

export function addableHubStates(hubs: MarketplaceHub[] = DEFAULT_MARKETPLACE_HUBS) {
  const taken = new Set(hubs.map((h) => h.state));
  return NIGERIA_STATES.filter((s) => !taken.has(s));
}
