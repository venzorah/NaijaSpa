import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { requireVendor } from "@/lib/vendor-auth";
import { completeEmailVerifyOtp, issueEmailVerifyOtp } from "@/lib/email-otp";
import { mailConfigured, sendEmailVerifyOtp } from "@/lib/mail";
import { assertOtpSecurityConfigured } from "@/lib/auth-reset";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    await rateLimit(`shop-email-otp:${clientAddress(req)}`, 12, 15 * 60_000);
    await rateLimit(`shop-email-otp:${user.id}`, 6, 15 * 60_000);
    const body = z.object({ action: z.enum(["request", "verify"]), otp: z.string().optional() }).parse(await req.json());
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, emailVerifiedAt: true } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (account.emailVerifiedAt) return NextResponse.json({ ok: true, verified: true });
    if (body.action === "verify") {
      const ok = await completeEmailVerifyOtp(user.id, String(body.otp || ""));
      if (!ok) return NextResponse.json({ error: "That code is invalid or expired." }, { status: 400 });
      return NextResponse.json({ ok: true, verified: true });
    }
    if (!mailConfigured() && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Email is not configured on the server." }, { status: 503 });
    }
    assertOtpSecurityConfigured();
    const challenge = await issueEmailVerifyOtp(user.id);
    if (challenge && "alreadyVerified" in challenge) return NextResponse.json({ ok: true, verified: true });
    if (challenge && "wait" in challenge) {
      return NextResponse.json({ ok: true, wait: true, message: "Wait a minute before requesting another code." });
    }
    if (challenge && "code" in challenge) {
      try {
        await sendEmailVerifyOtp({ to: account.email, code: challenge.code });
      } catch (err) {
        console.error("[mail] shop email verification failed", err);
        return NextResponse.json({ error: "Could not send a code to your email. Try again." }, { status: 503 });
      }
    }
    return NextResponse.json({ ok: true, message: "We emailed a 6-digit code. Check your inbox and Spam." });
  } catch (e) {
    return jsonError(e);
  }
}
