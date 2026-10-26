import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth";
import { hashResetOtp, normalizeResetOtp, RESET_OTP_LENGTH } from "@/lib/auth-reset";
import { prisma } from "@/lib/db";
import { jsonError, rateLimit } from "@/lib/http";

export async function POST(req: Request) {
  try {
    rateLimit("reset", 12);
    const body = z
      .object({
        email: z.string().email(),
        otp: z.string().min(RESET_OTP_LENGTH),
        password: z.string().min(10)
      })
      .parse(await req.json());
    const email = body.email.toLowerCase();
    rateLimit(`reset:${email}`, 8);
    const otp = normalizeResetOtp(body.otp);
    if (otp.length !== RESET_OTP_LENGTH) {
      return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
    }
    const user = await prisma.user.findUnique({ where: { email } });
    const token = user ? hashResetOtp(user.id, otp) : "";
    const row = user
      ? await prisma.passwordReset.findFirst({
          where: { userId: user.id, token, usedAt: null, expiresAt: { gt: new Date() } }
        })
      : null;
    if (!row) {
      return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
    }
    const passwordHash = await hashPassword(body.password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash }
      }),
      prisma.passwordReset.updateMany({
        where: { userId: row.userId, usedAt: null },
        data: { usedAt: new Date() }
      })
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/Authentication failed|Can't reach database|P1000|P1001/i.test(message)) {
      return NextResponse.json({ error: "Could not reset password. Try again." }, { status: 503 });
    }
    return jsonError(e);
  }
}
