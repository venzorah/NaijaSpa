import { NextResponse } from "next/server";
import { z } from "zod";
import { normalizeResetOtp, RESET_OTP_LENGTH } from "@/lib/auth-reset";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { completePasswordReset } from "@/lib/password-reset";

export async function POST(req: Request) {
  try {
    await rateLimit(`reset:ip:${clientAddress(req)}`, 30, 15 * 60_000);
    const body = z
      .object({
        email: z.string().email(),
        otp: z.string().max(32),
        password: z.string().min(10).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password must fit within 72 UTF-8 bytes")
      })
      .parse(await req.json());
    const email = body.email.toLowerCase();
    await rateLimit(`reset:account:${email}`, 15, 15 * 60_000);
    const otp = normalizeResetOtp(body.otp);
    if (otp.length !== RESET_OTP_LENGTH || !/^\d{6}$/.test(otp)) {
      return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
    }
    if (!await completePasswordReset(email, otp, body.password)) {
      return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/Authentication failed|Can't reach database|P1000|P1001/i.test(message)) {
      return NextResponse.json({ error: "Could not reset password. Try again." }, { status: 503 });
    }
    return jsonError(e);
  }
}
