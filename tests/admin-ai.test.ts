import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  admin: vi.fn(), upsert: vi.fn(), audit: vi.fn(), transaction: vi.fn(),
  getSettings: vi.fn(), parse: vi.fn()
}));
vi.mock("../src/lib/admin-auth", () => ({ requireAdmin: mocks.admin }));
vi.mock("../src/lib/db", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("../src/lib/ai-settings", async (original) => ({ ...await original<object>(), getAiSettings: mocks.getSettings }));
vi.mock("../src/lib/ai-search", () => ({ loadAiCategories: async () => [], parseWithLlm: mocks.parse, parseQueryLocal: () => ({ city: "Lagos" }) }));
import { GET, PUT } from "../src/app/api/admin/ai/route";
import { POST } from "../src/app/api/admin/ai/test/route";
const settings = { provider: "gemini", models: { openai: "gpt-4o-mini", gemini: "gemini-3.5-flash-lite" } };
const req = (body = settings) => new Request("http://localhost/api/admin/ai", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.admin.mockResolvedValue({ id: crypto.randomUUID() });
  mocks.getSettings.mockResolvedValue(settings);
  mocks.transaction.mockImplementation(async (fn) => fn({ systemConfig: { upsert: mocks.upsert }, auditLog: { create: mocks.audit } }));
  mocks.parse.mockResolvedValue({ city: "Lagos" });
});
describe("admin AI configuration", () => {
  it("allows analytics readers to read settings but no secrets", async () => {
    const result = await GET();
    expect(result.status).toBe(200);
    expect(mocks.admin).toHaveBeenCalledWith(["ai.manage", "analytics.view"]);
    expect(await result.json()).toEqual({ settings, configured: { gemini: false, openai: false, local: true } });
  });
  it("persists selection and model IDs with an audit entry in one transaction", async () => {
    expect((await PUT(req())).status).toBe(200);
    expect(mocks.admin).toHaveBeenCalledWith("ai.manage");
    expect(mocks.upsert).toHaveBeenCalledTimes(3);
    expect(mocks.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "ai.settings.update", afterJson: JSON.stringify(settings) }) });
  });
  it("blocks settings changes and provider calls without AI management permission", async () => {
    mocks.admin.mockRejectedValue(Object.assign(new Error("Forbidden"), { status: 403 }));
    expect((await PUT(req())).status).toBe(403);
    expect((await POST(req())).status).toBe(403);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.parse).not.toHaveBeenCalled();
  });
  it("rejects settings that try to store an API key", async () => {
    const response = await PUT(req({ ...settings, apiKey: "secret" } as typeof settings));
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("tests the requested provider strictly instead of claiming fallback success", async () => {
    mocks.parse.mockRejectedValue(new Error("Gemini request failed (429). Check quota."));
    const result = await POST(req());
    expect(result.status).toBe(400);
    expect(mocks.parse).toHaveBeenCalledWith(expect.any(String), {}, [], settings, true);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
