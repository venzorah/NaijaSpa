import type { AiSettings } from "./ai-settings";

const filterJsonSchema = {
  type: "object", additionalProperties: false,
  properties: {
    q: { type: "string" }, state: { type: "string" }, city: { type: "string" }, neighbourhood: { type: "string" },
    gender: { type: "string", enum: ["male", "female"] }, category: { type: "string" },
    maxPriceNaira: { type: "number" }, minRating: { type: "number" }, verified: { type: "boolean" },
    durationMin: { type: "number" }, locationType: { type: "string", enum: ["spa", "hotel", "home"] },
    publicContact: { type: "boolean" }, sort: { type: "string", enum: ["relevance", "price", "rating", "availability"] },
    includeSurchargeInBudget: { type: "boolean" }
  }
};

/** Fixed provider endpoints keep API credentials on their intended servers. */
export async function generateFilterJson(settings: AiSettings, system: string, user: string): Promise<string> {
  if (settings.provider === "local") throw new Error("Local search does not call an AI provider");
  const gemini = settings.provider === "gemini";
  const key = (gemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY)?.trim();
  const name = gemini ? "Gemini" : "OpenAI";
  if (!key) throw new Error(`${name} API key is not configured on this server`);
  const model = settings.models[settings.provider];
  let response: Response;
  try {
    response = await fetch(gemini
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
      : "https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: gemini ? { "x-goog-api-key": key, "Content-Type": "application/json" }
        : { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify(gemini ? {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json", responseJsonSchema: filterJsonSchema, maxOutputTokens: 1024 }
      } : {
        model, temperature: 0, response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }]
      })
    });
  } catch {
    throw new Error(`${name} could not be reached or timed out. Search can still use the local fallback.`);
  }
  if (!response.ok) {
    const hint = response.status === 429 ? "Check the project's quota and rate limits."
      : [401, 403].includes(response.status) ? "Check the API key and model permissions."
      : response.status === 404 ? "Check the selected model ID." : "Try again or check the provider status.";
    // Provider errors can echo request/key details; never expose their raw body.
    throw new Error(`${name} request failed (${response.status}). ${hint}`);
  }
  const data = await response.json();
  if (gemini) {
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason !== "STOP") throw new Error("Gemini did not return a complete JSON response");
    const parts = candidate.content?.parts;
    const text = Array.isArray(parts) ? parts.filter((p: { thought?: boolean; text?: string }) => !p.thought && typeof p.text === "string").map((p: { text: string }) => p.text).join("") : "";
    if (!text.trim()) throw new Error("Gemini returned no search filters");
    return text;
  }
  const choice = data.choices?.[0];
  if (choice?.finish_reason !== "stop" || typeof choice.message?.content !== "string" || !choice.message.content.trim()) {
    throw new Error("OpenAI did not return a complete JSON response");
  }
  return choice.message.content;
}
