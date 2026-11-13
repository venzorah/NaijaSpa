import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { assertPortalAccount } from "@/lib/portal-auth";
import { jsonError, rateLimit } from "@/lib/http";
import { claimGuestByVerifiedPhone } from "@/lib/guest-identity";
import { consumePhoneOtp, issuePhoneOtp } from "@/lib/guest-otp";
import { deliverBookingOtp } from "@/lib/otp-delivery";
import { normalizeNgPhone } from "@/lib/phone";

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    assertPortalAccount(user, "customer");
    const body = z
      .object({
        phone: z.string().min(10).max(20),
        otp: z.string().min(4).max(8).optional(),
        sendCode: z.boolean().optional()
      })
      .parse(await req.json());
    const phoneNormalized = normalizeNgPhone(body.phone);
    if (!phoneNormalized) {
      throw Object.assign(new Error("Enter a valid Nigerian phone number."), { status: 400 });
    }
    await rateLimit(`claim:${user.id}`, 8, 10 * 60 * 1000);
    if (body.sendCode) {
      const issued = await issuePhoneOtp(phoneNormalized, "claim");
      await deliverBookingOtp({ phoneNormalized, email: user.email, code: issued.code });
      return NextResponse.json({ ok: true, sent: true });
    }
    if (!body.otp) {
      throw Object.assign(new Error("Enter the verification code."), { status: 400 });
    }
    await consumePhoneOtp(phoneNormalized, "claim", body.otp);
    const result = await claimGuestByVerifiedPhone(user.id, phoneNormalized);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return jsonError(e);
  }
}
