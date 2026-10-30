import { matchingAvailability } from "./booking-availability";

export const RESERVING_BOOKING_STATES = ["pending", "awaiting_payment", "confirmed", "in_progress", "cancellation_requested"];
export const AVAILABILITY_DAYS = 14;
const MINUTE = 60_000;
const DAY = 1440 * MINUTE;
const LAGOS_OFFSET = 60 * MINUTE;
export type WorkingSlot = { weekday: number; startMin: number; endMin: number; bufferMin: number; staffId: string | null };
type BusyWindow = { staffId: string | null; startsAt: Date; endsAt: Date };

/** Find a base-service appointment; booking still rechecks availability on submit. */
export function findNextSlot(input: {
  durationMin: number; staffIds: string[]; hasAssignedStaff: boolean;
  slots: WorkingSlot[]; bookings: BusyWindow[]; timeOff: BusyWindow[];
}, now = new Date()): Date | null {
  if (!Number.isFinite(input.durationMin) || input.durationMin <= 0 || !input.slots.length) return null;
  const candidates: (string | null)[] = input.staffIds.length ? input.staffIds : input.hasAssignedStaff ? [] : [null];
  if (!candidates.length) return null;
  const shifted = new Date(now.getTime() + LAGOS_OFFSET);
  const midnight = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - LAGOS_OFFSET;
  const buffer = Math.max(0, ...input.slots.map((s) => s.bufferMin)) * MINUTE;
  for (let day = 0; day < AVAILABILITY_DAYS; day++) {
    const base = midnight + day * DAY;
    const weekday = new Date(base + LAGOS_OFFSET).getUTCDay();
    const firstMinute = Math.max(0, Math.ceil((now.getTime() + 1 - base) / (15 * MINUTE)) * 15);
    for (let startMin = firstMinute; startMin + input.durationMin < 1440; startMin += 15) {
      const startsAt = base + startMin * MINUTE;
      const endsAt = startsAt + input.durationMin * MINUTE;
      for (const staffId of candidates) {
        if (!matchingAvailability(input.slots, staffId, { weekday, startMin, endMin: startMin + input.durationMin })) continue;
        if (staffId && input.timeOff.some((off) => off.staffId === staffId && off.startsAt.getTime() < endsAt && off.endsAt.getTime() > startsAt)) continue;
        if (input.bookings.some((booking) => (!staffId || !booking.staffId || booking.staffId === staffId)
          && booking.startsAt.getTime() < endsAt + buffer && booking.endsAt.getTime() > startsAt - buffer)) continue;
        return new Date(startsAt);
      }
    }
  }
  return null;
}

export function nextLabelFor(startsAt: Date | null, now = new Date()): string | undefined {
  if (!startsAt || startsAt <= now) return undefined;
  const date = (value: Date) => new Date(value.getTime() + LAGOS_OFFSET).toISOString().slice(0, 10);
  const day = date(startsAt) === date(now) ? "Today" : date(startsAt) === date(new Date(now.getTime() + DAY)) ? "Tomorrow"
    : new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short" }).format(startsAt);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Lagos", hour: "numeric", minute: "2-digit", hour12: true }).format(startsAt);
  return `Next: ${day}, ${time}`;
}
