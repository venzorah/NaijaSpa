import { describe, expect, it } from "vitest";
import {
  bookingReference,
  guestPlaceholderEmail,
  isGuestPlaceholderEmail,
  maskNgPhone,
  normalizeNgPhone,
  paystackEmailFor
} from "../src/lib/phone";

describe("guest booking helpers", () => {
  it("masks Nigerian numbers for OTP screens", () => {
    expect(maskNgPhone("08031234567")).toBe("0803 *** **67");
    expect(maskNgPhone("+234 803 123 4567")).toBe("0803 *** **67");
  });

  it("normalizes Nigerian mobile numbers", () => {
    expect(normalizeNgPhone("08031234567")).toBe("2348031234567");
    expect(normalizeNgPhone("+234 803 123 4567")).toBe("2348031234567");
    expect(normalizeNgPhone("8031234567")).toBe("2348031234567");
    expect(normalizeNgPhone("12345")).toBe("");
  });

  it("builds a stable booking reference from the booking id", () => {
    expect(bookingReference("clxxxxxxxxABCDEF12")).toBe("NS-ABCDEF12");
  });

  it("maps placeholder guest emails for Paystack", () => {
    const email = guestPlaceholderEmail("2348031234567");
    expect(isGuestPlaceholderEmail(email)).toBe(true);
    expect(paystackEmailFor(email)).toBe("guest.2348031234567@naijaspa.com");
    expect(paystackEmailFor("ada@example.com")).toBe("ada@example.com");
  });
});
