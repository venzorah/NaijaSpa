import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { jsonError, rateLimit } from "@/lib/http";

export async function POST(req: Request) {
  try {
    rateLimit(`login:${req.headers.get("x-forwarded-for") || "local"}`, 10, 60_000);
    const body = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() }, include: { vendorOwned: true } });
    if (!user || user.status !== "active" || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as never,
      locale: user.locale,
      theme: user.theme,
      vendorId: user.vendorOwned?.id
    });
    return NextResponse.json({ ok: true, role: user.role });
  } catch (e) {
    return jsonError(e);
  }
}
