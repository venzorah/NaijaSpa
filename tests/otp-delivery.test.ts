import { afterEach, describe, expect, it, vi } from "vitest";

const sendGuestBookingOtpEmail = vi.fn();

vi.mock("../src/lib/mail", () => ({
  sendGuestBookingOtpEmail: (...args: unknown[]) => sendGuestBookingOtpEmail(...args)
}));

describe("deliverBookingOtp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    sendGuestBookingOtpEmail.mockReset();
  });

  it("sends only email when via is email", async () => {
    sendGuestBookingOtpEmail.mockResolvedValue(undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("TERMII_API_KEY", "termii-key");
    const { deliverBookingOtp } = await import("../src/lib/otp-delivery");
    await expect(
      deliverBookingOtp({ phoneNormalized: "2348031234567", email: "ada@example.com", code: "123456", via: "email" })
    ).resolves.toEqual({ channel: "email" });
    expect(sendGuestBookingOtpEmail).toHaveBeenCalledWith({ to: "ada@example.com", code: "123456" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still sends SMS if the extra email copy fails", async () => {
    sendGuestBookingOtpEmail.mockRejectedValue(new Error("smtp down"));
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("TERMII_API_KEY", "termii-key");
    const { deliverBookingOtp } = await import("../src/lib/otp-delivery");
    await expect(
      deliverBookingOtp({ phoneNormalized: "2348031234567", email: "ada@example.com", code: "123456", via: "auto" })
    ).resolves.toEqual({ channel: "sms" });
    expect(fetchMock).toHaveBeenCalled();
  });
});
