import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    const body = z
      .object({
        name: z.string().min(2).max(80).optional(),
        phone: z.string().max(32).optional(),
        locale: z.enum(["en", "fr", "de", "es"]).optional(),
        city: z.string().max(80).optional(),
        neighbourhood: z.string().max(120).optional(),
        deleteAccount: z.boolean().optional()
      })
      .parse(await req.json());
    if (body.deleteAccount) {
      await prisma.user.update({ where: { id: user.id }, data: { deletionRequestedAt: new Date() } });
      return NextResponse.json({ ok: true, deletionRequested: true });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.locale ? { locale: body.locale } : {})
      }
    });
    if (body.city !== undefined || body.neighbourhood !== undefined) {
      await prisma.customerProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, city: body.city || null, neighbourhood: body.neighbourhood || null },
        update: {
          ...(body.city !== undefined ? { city: body.city || null } : {}),
          ...(body.neighbourhood !== undefined ? { neighbourhood: body.neighbourhood || null } : {})
        }
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
