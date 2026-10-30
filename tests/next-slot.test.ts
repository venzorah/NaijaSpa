import { describe, expect, it } from "vitest";
import { findNextSlot, nextLabelFor } from "../src/lib/next-slot";

const now = new Date("2026-11-02T08:00:00Z"); // Monday 09:00 Lagos
const slot = { weekday: 1, startMin: 540, endMin: 1080, bufferMin: 15, staffId: null };
const input = { durationMin: 60, staffIds: ["a"], hasAssignedStaff: true, slots: [slot], bookings: [], timeOff: [] };
const window = (staffId: string | null, start: string, end: string) => ({ staffId, startsAt: new Date(start), endsAt: new Date(end) });
describe("schedule-based next appointments", () => {
  it("never invents availability when working hours are missing", () => {
    expect(findNextSlot({ ...input, slots: [] }, now)).toBeNull();
    expect(nextLabelFor(null, now)).toBeUndefined();
  });
  it("rounds forward to a future quarter-hour in Lagos", () => {
    const next = findNextSlot(input, now);
    expect(next?.toISOString()).toBe("2026-11-02T08:15:00.000Z");
    expect(nextLabelFor(next, now)).toBe("Next: Today, 9:15 AM");
  });
  it("respects therapist-specific days instead of falling back on closed days", () => {
    expect(findNextSlot({ ...input, slots: [slot, { ...slot, weekday: 2, staffId: "a" }] }, now)?.toISOString()).toBe("2026-11-03T08:00:00.000Z");
  });
  it("skips time off, or selects another eligible therapist", () => {
    const busy = [window("a", "2026-11-02T08:00Z", "2026-11-02T10:00Z")];
    expect(findNextSlot({ ...input, timeOff: busy }, now)?.toISOString()).toBe("2026-11-02T10:00:00.000Z");
    expect(findNextSlot({ ...input, staffIds: ["a", "b"], timeOff: busy }, now)?.toISOString()).toBe("2026-11-02T08:15:00.000Z");
  });
  it("honours booking buffers on both sides of an appointment", () => {
    const bookings = [window("a", "2026-11-02T09:00Z", "2026-11-02T10:00Z")];
    expect(findNextSlot({ ...input, bookings }, now)?.toISOString()).toBe("2026-11-02T10:15:00.000Z");
  });
  it("blocks unassigned bookings for every therapist but allows parallel staff", () => {
    const busy = window("b", "2026-11-02T08:00Z", "2026-11-02T10:00Z");
    expect(findNextSlot({ ...input, bookings: [busy] }, now)?.toISOString()).toBe("2026-11-02T08:15:00.000Z");
    expect(findNextSlot({ ...input, bookings: [{ ...busy, staffId: null }] }, now)?.toISOString()).toBe("2026-11-02T10:15:00.000Z");
  });
  it("does not advertise an appointment longer than working hours", () => {
    expect(findNextSlot({ ...input, durationMin: 600 }, now)).toBeNull();
  });
  it("does not treat inactive assigned therapists as shared capacity", () => {
    expect(findNextSlot({ ...input, staffIds: [] }, now)).toBeNull();
    expect(findNextSlot({ ...input, staffIds: [], hasAssignedStaff: false }, now)).not.toBeNull();
  });
  it("formats tomorrow relative to Lagos midnight", () => {
    expect(nextLabelFor(new Date("2026-11-02T08:00Z"), new Date("2026-11-01T22:50Z"))).toBe("Next: Tomorrow, 9:00 AM");
    expect(nextLabelFor(new Date("2026-11-02T08:00Z"), new Date("2026-11-01T23:05Z"))).toBe("Next: Today, 9:00 AM");
  });
});
