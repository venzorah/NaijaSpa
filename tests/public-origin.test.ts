import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { appUrl, publicOriginFromRequest } from "../src/lib/public-origin";
import { middleware } from "../src/middleware";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("public site origin", () => {
  it("ignores a localhost APP_URL in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    expect(appUrl()).toBe("https://naijaspa.com");
  });

  it("keeps localhost in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_URL", "http://localhost:3000");
    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("uses the forwarded public host behind Nginx", () => {
    const req = new Request("http://127.0.0.1:3100/", {
      headers: { host: "naijaspa.com", "x-forwarded-host": "naijaspa.com", "x-forwarded-proto": "https" }
    });
    expect(publicOriginFromRequest(req)).toBe("https://naijaspa.com");
  });
});

describe("homepage middleware", () => {
  it("does not send visitors from naijaspa.com to the Node listen address", async () => {
    const req = new NextRequest("http://127.0.0.1:3100/", {
      headers: {
        host: "naijaspa.com",
        "x-forwarded-host": "naijaspa.com",
        "x-forwarded-proto": "https"
      }
    });
    const res = await middleware(req);
    expect(res.headers.get("location")).toBe("https://naijaspa.com/in/fct/abuja");
  });
});
