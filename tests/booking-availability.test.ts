import { describe, expect, it } from "vitest";
import { appointmentWindow, matchingAvailability } from "../src/lib/booking-availability";

describe("Lagos appointment hours", () => {
  it("uses Lagos wall time independently of the server timezone", () => {
    expect(appointmentWindow(new Date("2099-01-05T09:00:00Z"), new Date("2099-01-05T10:00:00Z")))
      .toMatchObject({ startMin: 600, endMin: 660 });
  });
  it("rejects appointments that cross midnight", () => {
    expect(() => appointmentWindow(new Date("2099-01-05T22:30:00Z"), new Date("2099-01-05T23:30:00Z"))).toThrow(/same day/);
  });
  it("does not fall back to business hours on a therapist's day off", () => {
    const slots = [
      { staffId: null, weekday: 1, startMin: 540, endMin: 1200, bufferMin: 15 },
      { staffId: "staff", weekday: 2, startMin: 540, endMin: 1200, bufferMin: 15 }
    ];
    expect(matchingAvailability(slots, "staff", { weekday: 1, startMin: 600, endMin: 660 })).toBeUndefined();
    expect(matchingAvailability(slots, "other", { weekday: 1, startMin: 600, endMin: 660 })).toBe(slots[0]);
  });
});
