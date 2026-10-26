import { afterEach, describe, expect, it } from "vitest";
import {
  googleCallbackUrlFor,
  googleReturnPath,
  requestOrigin
} from "../src/lib/google-auth";

const originalApp = process.env.APP_URL;

afterEach(() => {
  process.env.APP_URL = originalApp;
});

describe("Gmail OAuth helpers", () => {
  it("keeps production and localhost callback URLs on the same origin", () => {
    process.env.APP_URL = "https://www.naijaspa.com";
    expect(googleCallbackUrlFor("https://www.naijaspa.com")).toBe(
      "https://www.naijaspa.com/api/auth/google/callback"
    );
    expect(googleCallbackUrlFor("https://naijaspa.ng")).toBe("https://naijaspa.ng/api/auth/google/callback");
    expect(googleCallbackUrlFor("http://localhost:3000")).toBe("http://localhost:3000/api/auth/google/callback");
    expect(googleCallbackUrlFor("https://evil.example")).toBe("https://www.naijaspa.com/api/auth/google/callback");
  });

  it("reads forwarded host for Vercel and sends register errors back to register", () => {
    const req = new Request("https://internal/api/auth/google?portal=customer", {
      headers: {
        "x-forwarded-host": "www.naijaspa.com",
        "x-forwarded-proto": "https"
      }
    });
    expect(requestOrigin(req)).toBe("https://www.naijaspa.com");
    expect(googleReturnPath("customer", "register")).toBe("/register");
    expect(googleReturnPath("vendor", "register")).toBe("/register?asVendor=1");
    expect(googleReturnPath("customer", "login")).toBe("/login");
  });
});
