import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ systemConfig: { findMany: vi.fn() }, aiSearchLog: { create: vi.fn() } }));
vi.mock("../src/lib/db", () => ({ prisma: db }));
import { AiSettingsSchema, aiProviderStatus, defaultAiSettings, getAiSettings, resolveAiSettings, type AiSettings } from "../src/lib/ai-settings";
import { generateFilterJson } from "../src/lib/ai-providers";
import { askNaijaSpa, parseWithLlm } from "../src/lib/ai-search";

const settings: AiSettings = { provider: "gemini", models: { openai: "gpt-4o-mini", gemini: "gemini-3.5-flash-lite" } };
const categories = [{ slug: "massage", name: "Massage" }];
function gemini(text: string, finishReason = "STOP") {
  return { ok: true, json: async () => ({ candidates: [{ finishReason, content: { parts: [{ text }] } }] }) };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("AI_PROVIDER", "gemini");
  vi.stubEnv("GEMINI_API_KEY", "gemini-test-secret");
  vi.stubEnv("OPENAI_API_KEY", "openai-test-secret");
  vi.stubEnv("OPENAI_MODEL", "gpt-4o-mini");
  vi.stubEnv("GEMINI_MODEL", "gemini-3.5-flash-lite");
  vi.stubEnv("USE_DEMO_LISTINGS", "true");
  db.systemConfig.findMany.mockResolvedValue([]);
  vi.stubGlobal("fetch", vi.fn(async () => gemini('{"category":"massage","city":"Lagos"}')));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("AI settings", () => {
  it("uses environment defaults and saved admin selections take precedence", () => {
    expect(defaultAiSettings()).toEqual(settings);
    expect(resolveAiSettings({ "ai.provider": "openai", "ai.model.openai": "custom-model" }))
      .toEqual({ provider: "openai", models: { openai: "custom-model", gemini: settings.models.gemini } });
  });
  it("reads the selection afresh so admin changes apply to the next search", async () => {
    db.systemConfig.findMany.mockResolvedValueOnce([{ key: "ai.provider", value: "local" }]).mockResolvedValueOnce([{ key: "ai.provider", value: "openai" }]);
    expect((await getAiSettings()).provider).toBe("local");
    expect((await getAiSettings()).provider).toBe("openai");
  });
  it("rejects unsupported providers, endpoint URLs and secret fields", () => {
    expect(AiSettingsSchema.safeParse({ ...settings, provider: "arbitrary" }).success).toBe(false);
    expect(AiSettingsSchema.safeParse({ ...settings, models: { ...settings.models, gemini: "https://evil.example/model" } }).success).toBe(false);
    expect(AiSettingsSchema.safeParse({ ...settings, apiKey: "secret" }).success).toBe(false);
    expect(resolveAiSettings({ "ai.provider": "arbitrary" })).toEqual(settings);
  });
  it("publishes only credential readiness", () => {
    expect(aiProviderStatus()).toEqual({ gemini: true, openai: true, local: true });
    expect(JSON.stringify(aiProviderStatus())).not.toContain("test-secret");
  });
});

describe("provider requests and grounded parsing", () => {
  it("uses Gemini's fixed endpoint and header authentication, with JSON output", async () => {
    await generateFilterJson(settings, "extract JSON", "massage");
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent");
    expect(url).not.toContain("gemini-test-secret");
    expect(init?.headers).toMatchObject({ "x-goog-api-key": "gemini-test-secret" });
    expect(JSON.parse(init?.body as string)).toMatchObject({
      systemInstruction: { parts: [{ text: "extract JSON" }] },
      generationConfig: { responseMimeType: "application/json" }
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
  it("routes OpenAI separately and preserves its JSON parsing path", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ finish_reason: "stop", message: { content: '{"city":"Lagos"}' } }] }) } as Response);
    expect(await parseWithLlm("Massage in Lagos", {}, categories, { ...settings, provider: "openai" })).toMatchObject({ city: "Lagos" });
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("https://api.openai.com/v1/chat/completions");
    expect(vi.mocked(fetch).mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer openai-test-secret" });
  });
  it("uses the saved provider for search and logs live parsing only on success", async () => {
    const result = await askNaijaSpa("Massage in Lagos");
    expect(result.usedFallback).toBe(false);
    expect(db.aiSearchLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ usedFallback: false }) });
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("generativelanguage.googleapis.com");
  });
  it("keeps search working when the selected provider reaches its free-tier quota", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 429 } as Response);
    const result = await askNaijaSpa("Massage in Lagos");
    expect(result.usedFallback).toBe(true);
    expect(result.filters.city).toBe("Lagos");
    expect(result.results.every((hit) => hit.vendor.businessName)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("does not switch to OpenAI when Gemini fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("timeout"));
    expect(await parseWithLlm("Massage", {}, categories, settings)).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("makes no network request in local mode or when the chosen key is missing", async () => {
    expect(await parseWithLlm("Massage", {}, categories, { ...settings, provider: "local" })).toBeNull();
    vi.stubEnv("GEMINI_API_KEY", "");
    expect(await parseWithLlm("Massage", {}, categories, settings)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["not JSON", "[]", '{"minRating":"invalid"}'])("rejects malformed provider filters (%s)", async (text) => {
    vi.mocked(fetch).mockResolvedValue(gemini(text) as Response);
    expect(await parseWithLlm("Massage", {}, categories, settings)).toBeNull();
    await expect(parseWithLlm("Massage", {}, categories, settings, true)).rejects.toThrow("invalid search filters");
  });
  it("rejects blocked or truncated Gemini responses", async () => {
    vi.mocked(fetch).mockResolvedValue(gemini("{}", "MAX_TOKENS") as Response);
    expect(await parseWithLlm("Massage", {}, categories, settings)).toBeNull();
  });
  it("reports quota failure to admin tests without leaking provider error bodies", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 429, text: async () => "echo gemini-test-secret" } as Response);
    await expect(parseWithLlm("Massage", {}, categories, settings, true)).rejects.toThrow("quota");
    await expect(parseWithLlm("Massage", {}, categories, settings, true)).rejects.not.toThrow("gemini-test-secret");
  });
  it("discards invented listing fields and normalizes categories against the catalog", async () => {
    vi.mocked(fetch).mockResolvedValue(gemini('{"category":"unknown","vendorId":"invented","price":1}') as Response);
    expect(await parseWithLlm("Massage", {}, categories, settings)).toEqual({ category: "massage" });
  });
  it("preserves explicit location filters when a provider omits them", async () => {
    vi.mocked(fetch).mockResolvedValue(gemini('{"category":"massage"}') as Response);
    expect(await parseWithLlm("Massage in Lagos", {}, categories, settings)).toMatchObject({ city: "Lagos", state: "Lagos" });
  });
  it("clears an old neighbourhood before merging a new location", async () => {
    vi.mocked(fetch).mockResolvedValue(gemini("{}") as Response);
    const result = await parseWithLlm("Massage in Abuja", { city: "Lagos", neighbourhood: "Ikeja" }, categories, settings);
    expect(result?.city).toBe("Abuja");
    expect(result?.neighbourhood).toBeUndefined();
  });
});
