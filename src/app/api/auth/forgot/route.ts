import { NextResponse } from "next/server";
import { z } from "zod";
import { generateResetOtp, hashResetOtp, RESET_OTP_MINUTES } from "@/lib/auth-reset";
import { prisma } from "@/lib/db";
import { jsonError, rateLimit } from "@/lib/http";
import { sendPasswordResetEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    rateLimit("forgot", 8);
    const { email } = z.object({ email: z.string().email() }).parse(await req.json());
    const normalized = email.toLowerCase();
    rateLimit(`forgot:${normalized}`, 3);
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (user) {
      const otp = generateResetOtp();
      await prisma.passwordReset.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() }
      });
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: hashResetOtp(user.id, otp),
          expiresAt: new Date(Date.now() + RESET_OTP_MINUTES * 60_000)
        }
      });
      try {
        await sendPasswordResetEmail({ to: user.email, code: otp });
      } catch (err) {
        console.error("[mail] password reset OTP failed", err);
      }
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "Password reset",
          body: "We emailed a 6-digit code from noreply@naijaspa.ng. Enter it in the app. It expires in 15 minutes."
        }
      });
    }
    return NextResponse.json({
      ok: true,
      message: "If that email is on NaijaSpa, we sent a 6-digit code from noreply@naijaspa.ng."
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/Authentication failed|Can't reach database|P1000|P1001/i.test(message)) {
      return NextResponse.json({ error: "Could not send a code. Try again." }, { status: 503 });
    }
    return jsonError(e);
  }
}
