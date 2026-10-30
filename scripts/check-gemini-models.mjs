import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const key = process.env.GEMINI_API_KEY?.trim();
if (!key) throw new Error("GEMINI_API_KEY is missing");
try {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
    headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(20000)
  });
  const result = await response.json();
  const models = (result.models || []).filter((m) => m.supportedGenerationMethods?.includes("generateContent") && /gemini.*flash/i.test(m.name))
    .map((m) => m.name.replace(/^models\//, ""));
  console.log(JSON.stringify({ check: "gemini-model-access", ok: response.ok, httpStatus: response.status,
    configuredModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite", models,
    ...(!response.ok ? { providerStatus: result.error?.status } : {}) }));
  if (!response.ok) process.exitCode = 1;
  if (response.ok && process.argv.includes("--generate")) {
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
    const generated = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: 'Return JSON search filters for Massage in Lagos, with city and category fields.' }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 512 } }),
      signal: AbortSignal.timeout(20000)
    });
    const body = await generated.json();
    console.log(JSON.stringify({ check: "gemini-direct-generation", ok: generated.ok, httpStatus: generated.status,
      finishReason: body.candidates?.[0]?.finishReason,
      ...(!generated.ok ? { providerStatus: body.error?.status, detail: String(body.error?.message || "").split(key).join("[redacted]").slice(0, 350) } : {}) }));
    if (!generated.ok) process.exitCode = 1;
  }
} catch (error) {
  process.exitCode = 1;
  console.log(JSON.stringify({ check: "gemini-model-access", ok: false, code: error.cause?.code || error.code || error.name }));
}
