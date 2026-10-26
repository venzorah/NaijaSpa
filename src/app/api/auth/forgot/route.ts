import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, rateLimit } from "@/lib/http";
import { appUrl } from "@/lib/payments";
import { queueMail, sendPasswordResetEmail } from "@/lib/mail";

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
      const resetUrl = `${appUrl()}/reset?token=${token}`;
      queueMail(sendPasswordResetEmail({ to: user.email, resetUrl }));
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: "Password reset",
          body: "We emailed a reset link from admin@naijaspa.ng. It expires in one hour."
        }
      });
    }
    return NextResponse.json({
      ok: true,
      message: "If that email is on NaijaSpa, we sent a reset link from admin@naijaspa.ng."
    });
  } catch (e) {
    return jsonError(e);
  }
}
