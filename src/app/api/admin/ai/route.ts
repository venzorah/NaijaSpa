import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AiSettingsSchema, aiProviderStatus, getAiSettings } from "@/lib/ai-settings";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin(["ai.manage", "analytics.view"]);
    return NextResponse.json({ settings: await getAiSettings(), configured: aiProviderStatus() });
  } catch (error) { return jsonError(error); }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireAdmin("ai.manage");
    const settings = AiSettingsSchema.parse(await req.json());
    const before = await getAiSettings();
    await prisma.$transaction(async (tx) => {
      const entries = { "ai.provider": settings.provider, "ai.model.openai": settings.models.openai, "ai.model.gemini": settings.models.gemini };
      for (const [key, value] of Object.entries(entries)) {
        await tx.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } });
      }
      await tx.auditLog.create({ data: {
        actorId: actor.id, action: "ai.settings.update", entityType: "SystemConfig", entityId: "ai",
        beforeJson: JSON.stringify(before), afterJson: JSON.stringify(settings)
      } });
    });
    return NextResponse.json({ settings, configured: aiProviderStatus() });
  } catch (error) { return jsonError(error); }
}
