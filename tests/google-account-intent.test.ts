import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ find: vi.fn(), findEmail: vi.fn(), create: vi.fn(), update: vi.fn(), vendor: vi.fn(), session: vi.fn(), verify: vi.fn(), mail: vi.fn(), queue: vi.fn(), tx: vi.fn() }));
vi.mock("../src/lib/db", () => ({ prisma: {
  user: { findFirst: mock.find, findUnique: mock.findEmail, create: mock.create, update: mock.update }, vendor: { create: mock.vendor },
  $transaction: mock.tx
} }));
vi.mock("../src/lib/auth", () => ({ createSession: mock.session, verifyPassword: mock.verify }));
vi.mock("../src/lib/admin-role-store", () => ({ getRoleAccess: async (role: string) => ({ role }) }));
vi.mock("../src/lib/mail", () => ({ sendWelcomeEmail: mock.mail, queueMail: mock.queue }));
vi.mock("../src/lib/http", () => ({ rateLimit: vi.fn(), clientAddress: () => "test", jsonError: (e: Error & { status?: number }) => Response.json({ error: e.message }, { status: e.status || 400 }) }));
import { signInWithGoogle } from "../src/lib/google-auth";
import { POST as passwordLogin } from "../src/app/api/auth/login/route";
const profile = { googleId: "verified-google-id", email: "verified@example.invalid", name: "Verified User" };
const account = (role = "customer") => ({ id: "user", role, status: "active", googleId: profile.googleId, email: profile.email, name: profile.name, emailVerifiedAt: new Date(), locale: "en", theme: "light", passwordHash: "hash", vendorOwned: role === "vendor_owner" ? { id: "business" } : null, staffMemberships: [] });
beforeEach(() => {
  vi.clearAllMocks(); mock.find.mockResolvedValue(null); mock.findEmail.mockResolvedValue(null);
  mock.create.mockImplementation(async ({ data }) => ({ ...account(data.role), vendorOwned: null }));
  mock.vendor.mockResolvedValue({ id: "business" }); mock.verify.mockResolvedValue(true);
  mock.tx.mockImplementation(async fn => fn({ user: { create: mock.create }, vendor: { create: mock.vendor } }));
});
for (const portal of ["customer", "vendor"] as const) {
  it(`${portal} Google sign-in cannot create an account or session for an unregistered email`, async () => {
    await expect(signInWithGoogle(profile, portal)).rejects.toMatchObject({ status: 401 });
    expect(mock.create).not.toHaveBeenCalled(); expect(mock.vendor).not.toHaveBeenCalled(); expect(mock.session).not.toHaveBeenCalled(); expect(mock.queue).not.toHaveBeenCalled(); expect(mock.tx).not.toHaveBeenCalled();
  });
  it(`explicit ${portal} Google registration creates only the selected account type`, async () => {
    const result = await signInWithGoogle(profile, portal, "register");
    expect(result.isNew).toBe(true); expect(mock.tx).toHaveBeenCalledTimes(1);
    expect(mock.create.mock.calls[0][0].data.role).toBe(portal === "vendor" ? "vendor_owner" : "customer");
    expect(mock.session).toHaveBeenCalledWith(expect.objectContaining({ role: portal === "vendor" ? "vendor_owner" : "customer", ...(portal === "vendor" ? { vendorId: "business" } : {}) }));
    expect(mock.vendor).toHaveBeenCalledTimes(portal === "vendor" ? 1 : 0);
  });
  it(`password ${portal} login rejects an unregistered email without creating data`, async () => {
    const response = await passwordLogin(new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ email: profile.email, password: "not-a-real-password", expect: portal }) }));
    expect(response.status).toBe(401); expect(mock.session).not.toHaveBeenCalled(); expect(mock.create).not.toHaveBeenCalled();
  });
}
it("existing customer and vendor accounts still sign in without creating duplicate accounts", async () => {
  for (const [portal, role] of [["customer", "customer"], ["vendor", "vendor_owner"]] as const) {
    mock.find.mockResolvedValue(account(role));
    expect((await signInWithGoogle(profile, portal, "login")).isNew).toBe(false);
  }
  expect(mock.session).toHaveBeenCalledTimes(2); expect(mock.create).not.toHaveBeenCalled();
});
it("registration of an existing account asks the user to sign in", async () => {
  mock.find.mockResolvedValue(account());
  await expect(signInWithGoogle(profile, "customer", "register")).rejects.toMatchObject({ status: 409 });
  expect(mock.create).not.toHaveBeenCalled(); expect(mock.session).not.toHaveBeenCalled();
});
it("a customer account cannot become a vendor by choosing vendor sign-in", async () => {
  mock.find.mockResolvedValue(account());
  await expect(signInWithGoogle(profile, "vendor", "login")).rejects.toMatchObject({ status: 403 });
  expect(mock.vendor).not.toHaveBeenCalled(); expect(mock.update).not.toHaveBeenCalled(); expect(mock.session).not.toHaveBeenCalled();
});
it("Google registration cannot create administrator accounts", async () => {
  await expect(signInWithGoogle(profile, "admin", "register")).rejects.toMatchObject({ status: 403 });
  expect(mock.tx).not.toHaveBeenCalled(); expect(mock.session).not.toHaveBeenCalled();
});
it("disabled and differently linked accounts cannot establish sessions", async () => {
  mock.find.mockResolvedValue({ ...account(), status: "suspended" });
  await expect(signInWithGoogle(profile, "customer")).rejects.toMatchObject({ status: 403 });
  mock.find.mockResolvedValue({ ...account(), googleId: "different-google-id" });
  await expect(signInWithGoogle(profile, "customer")).rejects.toMatchObject({ status: 403 });
  expect(mock.session).not.toHaveBeenCalled();
});
it("failed vendor provisioning does not establish a partial vendor session", async () => {
  mock.vendor.mockRejectedValue(new Error("Database unavailable"));
  await expect(signInWithGoogle(profile, "vendor", "register")).rejects.toThrow("Database unavailable");
  expect(mock.tx).toHaveBeenCalled(); expect(mock.session).not.toHaveBeenCalled(); expect(mock.queue).not.toHaveBeenCalled();
});
it("a concurrent registration conflict returns a sign-in message without creating a session", async () => {
  mock.create.mockRejectedValue({ code: "P2002" });
  await expect(signInWithGoogle(profile, "customer", "register")).rejects.toMatchObject({ status: 409 });
  expect(mock.session).not.toHaveBeenCalled();
});
it("password login still authenticates existing customers and vendors", async () => {
  for (const [portal, role] of [["customer", "customer"], ["vendor", "vendor_owner"]] as const) {
    mock.findEmail.mockResolvedValue(account(role));
    const response = await passwordLogin(new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ email: profile.email, password: "valid-test-password", expect: portal }) }));
    expect(response.status).toBe(200);
  }
  expect(mock.session).toHaveBeenCalledTimes(2); expect(mock.create).not.toHaveBeenCalled();
});
it("password login rejects wrong passwords without creating a session", async () => {
  mock.findEmail.mockResolvedValue(account()); mock.verify.mockResolvedValue(false);
  expect((await passwordLogin(new Request("http://localhost/api/auth/login", { method: "POST", body: JSON.stringify({ email: profile.email, password: "wrong-password", expect: "customer" }) }))).status).toBe(401);
  expect(mock.session).not.toHaveBeenCalled();
});
