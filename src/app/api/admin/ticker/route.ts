import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/rbac";
import { prisma, setConfig } from "@/lib/db";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import {
  TICKER_CONFIG_KEY,
  TICKER_SLOT_COUNT,
  TICKER_TEXT_MAX,
  parseTickerSlots,
  sanitizeTickerHref
} from "@/lib/ticker";

const slotSchema = z.object({
  id: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text: z.string().trim().max(TICKER_TEXT_MAX),
  href: z.string().trim().max(200).optional(),
  active: z.boolean()
});

export async function GET() {
  try {
    const actor = await requireAdmin("cms.manage");
    const row = await prisma.systemConfig.findUnique({ where: { key: TICKER_CONFIG_KEY } });
    return NextResponse.json({
      canEdit: hasPermission(actor, "cms.manage"),
      slots: parseTickerSlots(row?.value)
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireAdmin("cms.manage");
    const body = z.object({ slots: z.array(slotSchema).length(TICKER_SLOT_COUNT) }).parse(await req.json());
    const ids = body.slots.map((s) => s.id);
    if (new Set(ids).size !== TICKER_SLOT_COUNT) {
      return NextResponse.json({ error: "Save all three ticker slots." }, { status: 400 });
    }
    const before = parseTickerSlots((await prisma.systemConfig.findUnique({ where: { key: TICKER_CONFIG_KEY } }))?.value);
    const slots = body.slots
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((slot) => ({
        id: slot.id,
        text: slot.text,
        href: sanitizeTickerHref(slot.href || ""),
        active: slot.active && Boolean(slot.text)
      }));
    await setConfig(TICKER_CONFIG_KEY, JSON.stringify(slots));
    await audit({
      actorId: actor.id,
      action: "ticker.update",
      entityType: "SystemConfig",
      entityId: TICKER_CONFIG_KEY,
      before,
      after: slots
    });
    return NextResponse.json({ slots });
  } catch (e) {
    return jsonError(e);
  }
}
