export const MEMBERSHIP_INTERVALS = ["monthly", "yearly"] as const;
export type MembershipInterval = (typeof MEMBERSHIP_INTERVALS)[number];

export function parseBenefits(raw: string) {
  const t = raw.trim();
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t) as unknown;
      if (Array.isArray(arr)) return arr.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      /* fall through */
    }
  }
  return t
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function serializeBenefits(lines: string[]) {
  return lines.map((s) => s.trim()).filter(Boolean).join("\n");
}

export function planCodeFromName(name: string, interval: string) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  const suffix = interval === "yearly" ? "YEARLY" : "MONTHLY";
  return base ? `${base}_${suffix}` : suffix;
}

export function monthlyRecurringKobo(priceKobo: number, interval: string) {
  if (interval === "yearly") return Math.round(priceKobo / 12);
  return priceKobo;
}
