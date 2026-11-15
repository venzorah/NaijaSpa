export const KOBO = 100;
export const CURRENCY = "NGN";

export function nairaFromKobo(kobo: number): number {
  return Math.round(kobo) / KOBO;
}

export function koboFromNaira(naira: number): number {
  return Math.round(naira * KOBO);
}

export function formatNgn(kobo: number, locale = "en"): string {
  return new Intl.NumberFormat(locale === "en" ? "en-NG" : locale, {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(nairaFromKobo(kobo));
}

export function formatNgnCompact(kobo: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(nairaFromKobo(kobo));
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-NG").format(n);
}

export function applyBps(amountKobo: number, bps: number): number {
  return Math.round((amountKobo * bps) / 10_000);
}

export function clampCommissionBps(bps: number) {
  if (!Number.isFinite(bps)) return 0;
  return Math.max(0, Math.min(10_000, Math.round(bps)));
}

/** Whole or one-decimal percent from basis points, e.g. 1000 → "10", 1250 → "12.5". */
export function formatCommissionPercent(bps: number) {
  const pct = Math.round((clampCommissionBps(bps) / 100) * 10) / 10;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}
