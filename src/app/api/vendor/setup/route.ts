import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const { token, password } = z.object({ token: z.string(), password: z.string().min(10) }).parse(await req.json());
    const invite = await prisma.vendorInvite.findUnique({ where: { token }, include: { vendor: { include: { owner: true } } } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date() || !invite.vendor) {
      return NextResponse.json({ error: "Invite is invalid or expired" }, { status: 400 });
    }
    const owner = invite.vendor.owner;
    await prisma.user.update({ where: { id: owner.id }, data: { passwordHash: await hashPassword(password), status: "active" } });
    await prisma.vendorInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });
    await createSession({
      id: owner.id,
      email: owner.email,
      name: owner.name,
      role: owner.role as never,
      locale: owner.locale,
      theme: owner.theme,
      vendorId: invite.vendorId
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
