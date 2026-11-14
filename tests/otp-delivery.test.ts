import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendGuestBookingOtpEmail = vi.fn();

vi.mock("../src/lib/mail", () => ({
  sendGuestBookingOtpEmail: (...args: unknown[]) => sendGuestBookingOtpEmail(...args)
}));

describe("deliverBookingOtp", () => {
  beforeEach(() => {
    vi.stubEnv("TERMII_BASE_URL", "");
    vi.stubEnv("TERMII_CHANNEL", "");
  });
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

  it("uses the account's base URL, approved sender and configured SMS channel", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("TERMII_API_KEY", "fixture-key");
    vi.stubEnv("TERMII_BASE_URL", "https://v3.api.termii.com/");
    vi.stubEnv("TERMII_SENDER_ID", "ApprovedID");
    vi.stubEnv("TERMII_CHANNEL", "dnd");
    const { deliverBookingOtp } = await import("../src/lib/otp-delivery");
    await expect(deliverBookingOtp({ phoneNormalized: "2348031234567", code: "123456", via: "sms" })).resolves.toEqual({ channel: "sms" });
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://v3.api.termii.com/api/sms/send");
    expect(JSON.parse(String(options.body))).toMatchObject({ api_key: "fixture-key", from: "ApprovedID", channel: "dnd", to: "2348031234567" });
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(options.redirect).toBe("error");
  });

  it("rejects unsafe configuration before transmitting the API key", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("TERMII_API_KEY", "fixture-key");
    vi.stubEnv("TERMII_BASE_URL", "http://api.ng.termii.com");
    const { deliverBookingOtp } = await import("../src/lib/otp-delivery");
    await expect(deliverBookingOtp({ phoneNormalized: "2348031234567", code: "123456", via: "sms" })).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
