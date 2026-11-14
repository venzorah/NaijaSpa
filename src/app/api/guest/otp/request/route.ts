import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { findCustomerByPhone, findGuestByEmail } from "@/lib/guest-identity";
import { issuePhoneOtp } from "@/lib/guest-otp";
import { deliverBookingOtp } from "@/lib/otp-delivery";
import { guestOtpTarget } from "@/lib/phone";

function rethrowVisibleOtpError(err: unknown) {
  const status =
    typeof err === "object" && err && "status" in err ? Number((err as { status: number }).status) : 0;
  if (status === 429 || status >= 500) throw err;
  console.error("[guest-otp] delivery failed", err);
}

export async function POST(req: Request) {
  try {
    await rateLimit(`guest-otp-ip:${clientAddress(req)}`, 8, 10 * 60 * 1000);
    const body = z
      .object({
        phone: z.string().trim().min(10).max(20).optional(),
        email: z.string().trim().email().optional()
      })
      .parse(await req.json());
    const target = guestOtpTarget(body);
    if (target.kind === "email") {
      await rateLimit(`guest-otp-email:${target.email}`, 3, 10 * 60 * 1000);
      const user = await findGuestByEmail(target.email);
      if (user) {
        try {
          const issued = await issuePhoneOtp(target.dest, "guest_access");
          await deliverBookingOtp({ email: user.email, code: issued.code, via: "email" });
        } catch (err) {
          rethrowVisibleOtpError(err);
        }
      }
      return NextResponse.json({
        ok: true,
        via: "email",
        message: "If this email has guest bookings, a verification code was sent."
      });
    }
    await rateLimit(`guest-otp-phone:${target.phone}`, 3, 10 * 60 * 1000);
    const user = await findCustomerByPhone(target.phone, target.rawPhone);
    if (user && user.status === "active" && user.accountKind === "guest") {
      try {
        const issued = await issuePhoneOtp(target.dest, "guest_access");
        await deliverBookingOtp({ phoneNormalized: target.phone, email: user.email, code: issued.code, via: "auto" });
      } catch (err) {
        rethrowVisibleOtpError(err);
      }
    }
    return NextResponse.json({
      ok: true,
      via: "sms",
      message: "If this number has bookings, a verification code was sent."
    });
  } catch (e) {
    return jsonError(e);
  }
}
