import { applyBps } from "@/lib/money";

export function subscriptionSavings(
  bookings: { status: string; basePriceKobo: number; commissionKobo: number }[],
  freeCommissionBps: number
) {
  return bookings.filter(booking => booking.status === "completed").reduce((summary, booking) => ({
    revenueKobo: summary.revenueKobo + booking.basePriceKobo,
    savedKobo: summary.savedKobo + Math.max(0, applyBps(booking.basePriceKobo, freeCommissionBps) - booking.commissionKobo),
    count: summary.count + 1
  }), { revenueKobo: 0, savedKobo: 0, count: 0 });
}

export function subscriptionPeriodLabel(durationDays: number, priceKobo: number) {
  if (priceKobo <= 0 || durationDays >= 3650) return "forever";
  if (durationDays === 7) return "per week";
  if (durationDays === 30) return "per month";
  if (durationDays === 365) return "per year";
  return `per ${durationDays} days`;
}
