const DAY_MS = 86_400_000;

export function calendarDaysUntil(endsAt: Date, now = new Date()) {
  const end = Date.UTC(endsAt.getUTCFullYear(), endsAt.getUTCMonth(), endsAt.getUTCDate());
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((end - start) / DAY_MS);
}

/** Days-before-end when we remind the vendor, by package length. */
export function renewalNoticeDays(durationDays: number): number[] {
  if (durationDays <= 8) return [2, 1, 0];
  if (durationDays <= 45) return [7, 3, 1];
  return [30, 14, 7, 1];
}

export function renewalNoticeTitle(subscriptionId: string, daysLeft: number) {
  return `Plan renewal · ${subscriptionId} · ${daysLeft}d`;
}

export function lapseNoticeTitle(subscriptionId: string) {
  return `Plan ended · ${subscriptionId}`;
}

export function paidUntilMs(endsAt: Date, graceUntil: Date | null | undefined, graceDays: number) {
  if (graceUntil) return graceUntil.getTime();
  return endsAt.getTime() + Math.max(0, graceDays) * DAY_MS;
}
