import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn(), exchange: vi.fn(), signIn: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: mock.get, delete: mock.delete }) }));
vi.mock("../src/lib/google-auth", async (original) => ({
  ...await original<typeof import("../src/lib/google-auth")>(),
  exchangeGoogleCode: mock.exchange,
  signInWithGoogle: mock.signIn
}));
import { GET } from "../src/app/api/auth/google/callback/route";
import { signOauthState } from "../src/lib/google-auth";

beforeEach(() => {
  vi.stubEnv("APP_URL", "https://naijaspa.com");
  vi.clearAllMocks();
  mock.get.mockReturnValue({ value: "nonce" });
  mock.exchange.mockResolvedValue({ googleId: "google", email: "vendor@example.com", name: "Vendor" });
  mock.signIn.mockResolvedValue({ isNew: false, home: "/vendor/dashboard" });
});
afterEach(() => vi.unstubAllEnvs());

function request(query = "", host = "naijaspa.com") {
  return new Request(`https://localhost:3100/api/auth/google/callback${query}`, {
    headers: { host, "x-forwarded-proto": "https" }
  });
}
async function state() {
  return signOauthState({ portal: "vendor", next: "/vendor/dashboard", n: "nonce",
    redirectUri: "https://naijaspa.com/api/auth/google/callback", returnPath: "/login/vendor" });
}
it("redirects expired sign-in to the public site behind Nginx", async () => {
  const result = await GET(request());
  const location = new URL(result.headers.get("location")!);
  expect(location.origin).toBe("https://naijaspa.com");
  expect(location.searchParams.get("error")).toContain("expired");
  expect(mock.exchange).not.toHaveBeenCalled();
});
it("keeps cancelled vendor sign-in on the public vendor login", async () => {
  const result = await GET(request(`?error=access_denied&state=${await state()}`));
  expect(new URL(result.headers.get("location")!).pathname).toBe("/login/vendor");
  expect(new URL(result.headers.get("location")!).origin).toBe("https://naijaspa.com");
});
it("redirects successful vendor sign-in to the public dashboard", async () => {
  const result = await GET(request(`?code=test-code&state=${await state()}`));
  expect(result.headers.get("location")).toBe("https://naijaspa.com/vendor/dashboard");
  expect(mock.exchange).toHaveBeenCalledWith("test-code", "https://naijaspa.com/api/auth/google/callback");
  expect(mock.signIn).toHaveBeenCalledWith(expect.any(Object), "vendor", "login");
});

it("takes account creation intent only from signed state, not callback query parameters", async () => {
  await GET(request(`?code=test-code&from=register&state=${await state()}`));
  expect(mock.signIn).toHaveBeenCalledWith(expect.any(Object), "vendor", "login");
});
it("preserves registration query parameters when displaying an account error", async () => {
  const token = await signOauthState({ portal: "vendor", next: "/vendor/onboarding", n: "nonce", redirectUri: "https://naijaspa.com/api/auth/google/callback", returnPath: "/register?asVendor=1", intent: "register" });
  mock.signIn.mockRejectedValueOnce(new Error("An account already exists. Sign in instead."));
  const response = await GET(request(`?code=test-code&state=${token}`));
  const location = new URL(response.headers.get("location")!);
  expect(location.pathname).toBe("/register"); expect(location.searchParams.get("asVendor")).toBe("1");
  expect(location.searchParams.get("error")).toContain("already exists");
  expect(mock.signIn).toHaveBeenCalledWith(expect.any(Object), "vendor", "register");
});
it("rejects a forged forwarded host as a redirect destination", async () => {
  const req = request();
  req.headers.set("x-forwarded-host", "attacker.example");
  expect(new URL((await GET(req)).headers.get("location")!).origin).toBe("https://naijaspa.com");
});
it("preserves local development redirects on the allowed local origin", async () => {
  const req = new Request("http://localhost:3000/api/auth/google/callback");
  expect(new URL((await GET(req)).headers.get("location")!).origin).toBe("http://localhost:3000");
});
