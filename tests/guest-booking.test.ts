import { describe, expect, it } from "vitest";
import {
  bookingReference,
  emailOtpDest,
  guestOtpTarget,
  guestPlaceholderEmail,
  isGuestPlaceholderEmail,
  maskEmail,
  maskNgPhone,
  normalizeGuestEmail,
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

  it("normalizes and masks guest checkout emails for OTP", () => {
    expect(normalizeGuestEmail(" Ada@Example.com ")).toBe("ada@example.com");
    expect(normalizeGuestEmail(guestPlaceholderEmail("2348031234567"))).toBe("");
    expect(normalizeGuestEmail("not-an-email")).toBe("");
    expect(maskEmail("ada@example.com")).toBe("a***@example.com");
    expect(emailOtpDest("Ada@Example.com")).toBe("email:ada@example.com");
  });

  it("accepts phone or email for guest OTP, not both", () => {
    expect(guestOtpTarget({ phone: "08031234567" })).toEqual({
      kind: "phone",
      phone: "2348031234567",
      dest: "2348031234567",
      rawPhone: "08031234567"
    });
    expect(guestOtpTarget({ email: "Ada@Example.com" })).toEqual({
      kind: "email",
      email: "ada@example.com",
      dest: "email:ada@example.com"
    });
    expect(() => guestOtpTarget({ phone: "08031234567", email: "ada@example.com" })).toThrow(/not both/);
    expect(() => guestOtpTarget({ phone: "123" })).toThrow(/valid Nigerian/);
    expect(() => guestOtpTarget({ email: guestPlaceholderEmail("2348031234567") })).toThrow(/email used at guest checkout/);
  });
});
