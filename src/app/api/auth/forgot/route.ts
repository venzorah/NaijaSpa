import { NextResponse } from "next/server";
import { assertOtpSecurityConfigured } from "@/lib/auth-reset";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { sendPasswordResetEmail } from "@/lib/mail";
import { issuePasswordReset } from "@/lib/password-reset";

export async function POST(req: Request) {
  try {
    await rateLimit(`forgot:ip:${clientAddress(req)}`, 12, 15 * 60_000);
    const { email } = z.object({ email: z.string().email() }).parse(await req.json());
    const normalized = email.toLowerCase();
    await rateLimit(`forgot:account:${normalized}`, 3, 15 * 60_000);
    assertOtpSecurityConfigured();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (user) {
      const challenge = await issuePasswordReset(user.id);
      if (challenge) {
        try { await sendPasswordResetEmail({ to: user.email, code: challenge.code }); }
        catch { console.error("[mail] password reset delivery failed"); }
      }
    }
    return NextResponse.json({
      ok: true,
      message: "If that email is eligible, a password reset email will be attempted. Check your inbox and Spam."
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/Authentication failed|Can't reach database|P1000|P1001/i.test(message)) {
      return NextResponse.json({ error: "Could not send a code. Try again." }, { status: 503 });
    }
    return jsonError(e);
  }
}
