import { formatPlaceLabel, mapNigeriaState, NIGERIA_STATES, type LivePlace } from "./nigeria";

export const MARKETPLACE_HUBS_KEY = "marketplaceHubs";

export type MarketplaceHub = {
  id: string;
  label: string;
  state: string;
  city: string;
  locked?: boolean;
};

/** No preset marketplace cities. Location comes from IP/edge geo; visitors may pick any Nigerian state. */
export const DEFAULT_MARKETPLACE_HUBS: MarketplaceHub[] = [];

function hubId(state: string, city: string) {
  return [state, city].filter(Boolean).join("-").toLowerCase().replace(/\s+/g, "-");
}

export function nigeriaStateHubs(): MarketplaceHub[] {
  return NIGERIA_STATES.map((state) => ({
    id: hubId(state, ""),
    label: state === "FCT" ? "Abuja" : state,
    state,
    city: state === "FCT" ? "Abuja" : state === "Lagos" ? "Lagos" : "",
    locked: false
  }));
}

export function extraHubFromState(raw: string): MarketplaceHub | null {
  const state = mapNigeriaState(raw);
  if (!state) return null;
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
      /* ignore broken admin JSON */
    }
  }
  return extras;
}

export function hubToPlace(hub: MarketplaceHub): LivePlace {
  return { state: hub.state, city: hub.city, neighbourhood: "", country: "NG" };
}

export function hubLabelForPlace(place?: LivePlace | null) {
  return formatPlaceLabel(place);
}

export function addableHubStates(hubs: MarketplaceHub[] = []) {
  const taken = new Set(hubs.map((h) => h.state));
  return NIGERIA_STATES.filter((s) => !taken.has(s));
}
