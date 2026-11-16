import { NextResponse } from "next/server";
import { assertOtpSecurityConfigured } from "@/lib/auth-reset";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { mailConfigured, sendPasswordResetEmail } from "@/lib/mail";
import { invalidatePasswordReset, issuePasswordReset } from "@/lib/password-reset";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    await rateLimit(`forgot:ip:${clientAddress(req)}`, 12, 15 * 60_000);
    const { email } = z.object({ email: z.string().email() }).parse(await req.json());
    const normalized = email.toLowerCase();
    await rateLimit(`forgot:account:${normalized}`, 3, 15 * 60_000);
    if (!mailConfigured() && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Could not send a code. Email is not configured on the server." }, { status: 503 });
    }
    assertOtpSecurityConfigured();
    const user = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, status: true, accountKind: true }
    });
    if (user && user.status === "active" && user.accountKind !== "guest") {
      const challenge = await issuePasswordReset(user.id);
      if (challenge) {
        try {
          await sendPasswordResetEmail({ to: user.email, code: challenge.code });
        } catch (err) {
          console.error("[mail] password reset delivery failed", err);
          await invalidatePasswordReset(challenge.id);
          return NextResponse.json({ error: "Could not send a code to your email. Try again." }, { status: 503 });
        }
      }
    }
    return NextResponse.json({
      ok: true,
      channel: "email",
      message: "If that email is eligible, we emailed a 6-digit code. Check your inbox and Spam."
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/Authentication failed|Can't reach database|P1000|P1001|SMTP|ECONNECTION|ETIMEDOUT|Resend/i.test(message)) {
      return NextResponse.json({ error: "Could not send a code to your email. Try again." }, { status: 503 });
    }
    return jsonError(e);
  }
}
