import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin("cms.manage");
    const body = z.object({ question: z.string().min(4), answer: z.string().min(4) }).parse(await req.json());
    const last = await prisma.faq.aggregate({ _max: { sortOrder: true } });
    const faq = await prisma.faq.create({
      data: { question: body.question, answer: body.answer, sortOrder: (last._max.sortOrder ?? 0) + 1 }
    });
    await audit({ actorId: actor.id, action: "faq.create", entityType: "Faq", entityId: faq.id, after: faq });
    return NextResponse.json({ faq });
  } catch (e) {
    return jsonError(e);
  }
}
