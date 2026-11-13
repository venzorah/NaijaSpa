export const TICKER_CONFIG_KEY = "site.topbarTicker";
export const TICKER_SLOT_COUNT = 3;
export const TICKER_TEXT_MAX = 140;

export type TickerSlot = {
  id: 1 | 2 | 3;
  text: string;
  href: string;
  active: boolean;
};

export type TickerItem = {
  id: 1 | 2 | 3;
  text: string;
  href: string;
};

export function emptyTickerSlots(): TickerSlot[] {
  return [
    { id: 1, text: "", href: "", active: false },
    { id: 2, text: "", href: "", active: false },
    { id: 3, text: "", href: "", active: false }
  ];
}

export function sanitizeTickerHref(raw: string) {
  const value = raw.trim().slice(0, 200);
  if (!value) return "";
  if (value.startsWith("/") && !value.startsWith("//") && !/[\\\s]/.test(value) && !value.toLowerCase().startsWith("/\\")) {
    return value;
  }
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && (url.hostname === "naijaspa.com" || url.hostname === "www.naijaspa.com")) {
      return url.pathname + url.search;
    }
  } catch {
    return "";
  }
  return "";
}

export function parseTickerSlots(raw: string | null | undefined): TickerSlot[] {
  const base = emptyTickerSlots();
  if (!raw?.trim()) return base;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const rows = Array.isArray(parsed) ? parsed : Array.isArray((parsed as { slots?: unknown }).slots) ? (parsed as { slots: unknown[] }).slots : [];
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const rec = row as { id?: unknown; text?: unknown; href?: unknown; active?: unknown };
      const id = Number(rec.id);
      if (id !== 1 && id !== 2 && id !== 3) continue;
      base[id - 1] = {
        id,
        text: String(rec.text || "").trim().slice(0, TICKER_TEXT_MAX),
        href: sanitizeTickerHref(String(rec.href || "")),
        active: Boolean(rec.active)
      };
    }
  } catch {
    return base;
  }
  return base;
}

export function activeTickerItems(slots: TickerSlot[]): TickerItem[] {
  return slots
    .filter((slot) => slot.active && slot.text)
    .map((slot) => ({ id: slot.id, text: slot.text, href: slot.href }));
}
