import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, rateLimit } from "@/lib/http";

export async function POST(req: Request) {
  try {
    rateLimit("forgot", 5);
    const { email } = z.object({ email: z.string().email() }).parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.passwordReset.create({
        data: { userId: user.id, token, expiresAt: new Date(Date.now() + 3600_000) }
      });
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "Password reset",
          body: `Use this reset token on /reset: ${token}`
        }
      });
    }
    return NextResponse.json({ ok: true, message: "If that email exists, a reset was created. Check notifications in development." });
  } catch (e) {
    return jsonError(e);
  }
}
