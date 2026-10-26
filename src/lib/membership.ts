/** Customer booking club is retired from the public product. Vendor listing plans are separate. */
export const CUSTOMER_MEMBERSHIP_ENABLED = false;

export const MEMBERSHIP_INTERVALS = ["none", "weekly", "monthly", "yearly"] as const;
export type MembershipInterval = (typeof MEMBERSHIP_INTERVALS)[number];

export const LIVE_MEMBERSHIP_PLANS = [
  {
    code: "FREE",
    name: "Free",
    interval: "none" as const,
    priceKobo: 0,
    benefits: ["No weekly, monthly or annual fee", "Standard booking rates"]
  },
  {
    code: "SILVER_MONTHLY",
    name: "Silver",
    interval: "weekly" as const,
    priceKobo: 500_000,
    benefits: ["5% off bookings", "Free rescheduling"]
  },
  {
    code: "GOLD_MONTHLY",
    name: "Gold",
    interval: "monthly" as const,
    priceKobo: 1_200_000,
    benefits: ["10% off bookings", "Waived home surcharge once a month", "Priority support"]
  },
  {
    code: "PLATINUM_YEARLY",
    name: "Platinum",
    interval: "yearly" as const,
    priceKobo: 12_000_000,
    benefits: ["15% off bookings", "All surcharges waived", "Birthday treatment credit ₦20,000"]
  }
] as const;

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

export function serializeBenefits(lines: readonly string[]) {
  return lines.map((s) => s.trim()).filter(Boolean).join("\n");
}

export function planCodeFromName(name: string, interval: string) {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  if (interval === "none" || (!interval && name.trim().toLowerCase() === "free")) {
    return base || "FREE";
  }
  const suffix = interval === "yearly" ? "YEARLY" : interval === "weekly" ? "WEEKLY" : "MONTHLY";
  return base ? `${base}_${suffix}` : suffix;
}

export function membershipIntervalLabel(interval: string, priceKobo = 1) {
  if (interval === "none" || priceKobo <= 0) return "No subscription fee";
  if (interval === "weekly") return "Weekly";
  if (interval === "yearly") return "Yearly";
  if (interval === "monthly") return "Monthly";
  return interval;
}

export function monthlyRecurringKobo(priceKobo: number, interval: string) {
  if (interval === "none" || priceKobo <= 0) return 0;
  if (interval === "yearly") return Math.round(priceKobo / 12);
  if (interval === "weekly") return Math.round((priceKobo * 52) / 12);
  return priceKobo;
}

export function membershipPerks(benefits: string) {
  const text = parseBenefits(benefits).join("\n").toLowerCase();
  const pct = text.match(/(\d+)\s*%\s*off/);
  return {
    bookingPercentOff: pct ? Math.min(100, Number(pct[1])) : 0,
    waiveAllSurcharges: /all surcharges waived/.test(text),
    waiveHomeMonthly: /waived home surcharge/.test(text)
  };
}
