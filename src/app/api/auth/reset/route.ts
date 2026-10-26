import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, rateLimit } from "@/lib/http";

export async function POST(req: Request) {
  try {
    rateLimit("reset", 8);
    const body = z
      .object({ token: z.string().min(20), password: z.string().min(10) })
      .parse(await req.json());
    const row = await prisma.passwordReset.findFirst({
      where: { token: body.token, usedAt: null, expiresAt: { gt: new Date() } }
    });
    if (!row) {
      return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash: await hashPassword(body.password) }
      }),
      prisma.passwordReset.update({
        where: { id: row.id },
        data: { usedAt: new Date() }
      })
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
