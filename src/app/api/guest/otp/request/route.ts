import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { findCustomerByPhone } from "@/lib/guest-identity";
import { issuePhoneOtp } from "@/lib/guest-otp";
import { deliverBookingOtp } from "@/lib/otp-delivery";
import { normalizeNgPhone } from "@/lib/phone";

export async function POST(req: Request) {
  try {
    await rateLimit(`guest-otp-ip:${clientAddress(req)}`, 8, 10 * 60 * 1000);
    const { phone } = z.object({ phone: z.string().min(10).max(20) }).parse(await req.json());
    const phoneNormalized = normalizeNgPhone(phone);
    if (!phoneNormalized) {
      throw Object.assign(new Error("Enter a valid Nigerian phone number."), { status: 400 });
    }
    await rateLimit(`guest-otp-phone:${phoneNormalized}`, 3, 10 * 60 * 1000);
    const user = await findCustomerByPhone(phoneNormalized, phone);
    if (user && user.status === "active" && user.accountKind === "guest") {
      try {
        const issued = await issuePhoneOtp(phoneNormalized, "guest_access");
        await deliverBookingOtp({ phoneNormalized, email: user.email, code: issued.code });
      } catch (err) {
        console.error("[guest-otp] delivery failed", err);
      }
    }
    return NextResponse.json({
      ok: true,
      message: "If this number has bookings, a verification code was sent."
    });
  } catch (e) {
    return jsonError(e);
  }
}
