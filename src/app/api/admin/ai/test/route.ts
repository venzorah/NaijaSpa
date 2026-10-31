import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { AiSettingsSchema } from "@/lib/ai-settings";
import { loadAiCategories, parseQueryLocal, parseWithLlm } from "@/lib/ai-search";
import { jsonError, rateLimit } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin("ai.manage");
    await rateLimit(`ai-provider-test:${actor.id}`, 5);
    const settings = AiSettingsSchema.parse(await req.json());
    const categories = await loadAiCategories();
    const query = "Massage in Lagos under ₦20000";
    const filters = settings.provider === "local" ? parseQueryLocal(query, {}, categories)
      : await parseWithLlm(query, {}, categories, settings, true);
    return NextResponse.json({ ok: true, provider: settings.provider, filters });
  } catch (error) {
    return jsonError(error instanceof Error && !("status" in error)
      ? Object.assign(error, { status: 400 }) : error);
  }
}
