import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma, setConfig } from "@/lib/db";
import { jsonError } from "@/lib/http";

const KEYS = ["settings.defaultLocale", "settings.supportEmail", "settings.pwaName"] as const;

export async function GET() {
  try {
    await requireAdmin("roles.manage");
    const rows = await prisma.systemConfig.findMany({ where: { key: { in: [...KEYS] } } });
    return NextResponse.json({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireAdmin("roles.manage");
    const body = z
      .object({
        defaultLocale: z.enum(["en", "pcm"]).optional(),
        supportEmail: z.string().email().optional(),
        pwaName: z.string().min(2).max(40).optional()
      })
      .parse(await req.json());
    if (body.defaultLocale) await setConfig("settings.defaultLocale", body.defaultLocale);
    if (body.supportEmail) await setConfig("settings.supportEmail", body.supportEmail);
    if (body.pwaName) await setConfig("settings.pwaName", body.pwaName);
    await audit({ actorId: actor.id, action: "settings.update", entityType: "SystemConfig", entityId: "settings", after: body });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
