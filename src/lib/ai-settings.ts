import { z } from "zod";

export const AI_PROVIDERS = ["gemini", "openai", "local"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];
const modelName = z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, "Enter a model ID, not a URL");
export const AiSettingsSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  models: z.object({ openai: modelName, gemini: modelName }).strict()
}).strict();
export type AiSettings = z.infer<typeof AiSettingsSchema>;
export const AI_CONFIG_KEYS = ["ai.provider", "ai.model.openai", "ai.model.gemini"];

export function defaultAiSettings(): AiSettings {
  const provider = z.enum(AI_PROVIDERS).safeParse(process.env.AI_PROVIDER);
  return {
    provider: provider.success ? provider.data : "openai",
    models: {
      openai: modelName.safeParse(process.env.OPENAI_MODEL).success ? process.env.OPENAI_MODEL!.trim() : "gpt-4o-mini",
      gemini: modelName.safeParse(process.env.GEMINI_MODEL).success ? process.env.GEMINI_MODEL!.trim() : "gemini-3.5-flash-lite"
    }
  };
}

export function resolveAiSettings(values: Record<string, string>): AiSettings {
  const defaults = defaultAiSettings();
  const parsed = AiSettingsSchema.safeParse({
    provider: values["ai.provider"] ?? defaults.provider,
    models: { openai: values["ai.model.openai"] ?? defaults.models.openai, gemini: values["ai.model.gemini"] ?? defaults.models.gemini }
  });
  return parsed.success ? parsed.data : defaults;
}

export async function getAiSettings(): Promise<AiSettings> {
  try {
    const { prisma } = await import("./db");
    const rows = await prisma.systemConfig.findMany({ where: { key: { in: AI_CONFIG_KEYS } } });
    return resolveAiSettings(Object.fromEntries(rows.map((r) => [r.key, r.value])));
  } catch {
    return defaultAiSettings();
  }
}

export function aiProviderStatus() {
  return {
    gemini: Boolean(process.env.GEMINI_API_KEY?.trim()),
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    local: true
  };
}
