import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  findUnique: vi.fn(),
  issue: vi.fn(),
  invalidate: vi.fn(),
  send: vi.fn(),
  mailConfigured: vi.fn(() => true)
}));

vi.mock("../src/lib/db", () => ({ prisma: { user: { findUnique: mock.findUnique } } }));
vi.mock("../src/lib/password-reset", () => ({
  issuePasswordReset: mock.issue,
  invalidatePasswordReset: mock.invalidate
}));
vi.mock("../src/lib/mail", () => ({
  mailConfigured: () => mock.mailConfigured(),
  sendPasswordResetEmail: mock.send
}));
vi.mock("../src/lib/auth-reset", () => ({
  assertOtpSecurityConfigured: () => undefined
}));
vi.mock("../src/lib/http", () => ({
  rateLimit: async () => undefined,
  clientAddress: () => "127.0.0.1",
  jsonError: (error: unknown) => {
    const message = error instanceof Error ? error.message : "Request failed";
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
}));

import { POST } from "../src/app/api/auth/forgot/route";

beforeEach(() => {
  vi.clearAllMocks();
  mock.mailConfigured.mockReturnValue(true);
  mock.findUnique.mockResolvedValue({ id: "u1", email: "ada@example.com", status: "active", accountKind: "registered" });
  mock.issue.mockResolvedValue({ id: "c1", code: "482913" });
  mock.send.mockResolvedValue(undefined);
});

describe("password reset email", () => {
  it("emails a 6-digit code over SMTP/Resend, never SMS", async () => {
    const res = await POST(new Request("http://localhost/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "Ada@example.com" })
    }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.channel).toBe("email");
    expect(mock.send).toHaveBeenCalledWith({ to: "ada@example.com", code: "482913" });
  });

  it("fails visibly when SMTP is missing in production", async () => {
    mock.mailConfigured.mockReturnValue(false);
    vi.stubEnv("NODE_ENV", "production");
    const res = await POST(new Request("http://localhost/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "ada@example.com" })
    }));
    expect(res.status).toBe(503);
    expect(mock.send).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
