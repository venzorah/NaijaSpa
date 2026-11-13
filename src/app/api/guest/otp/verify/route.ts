import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { consumePhoneOtp } from "@/lib/guest-otp";
import { findCustomerByPhone, startGuestSession } from "@/lib/guest-identity";
import { normalizeNgPhone } from "@/lib/phone";

export async function POST(req: Request) {
  try {
    await rateLimit(`guest-otp-verify:${clientAddress(req)}`, 12, 10 * 60 * 1000);
    const body = z.object({ phone: z.string().min(10).max(20), otp: z.string().min(4).max(8) }).parse(await req.json());
    const phoneNormalized = normalizeNgPhone(body.phone);
    if (!phoneNormalized) {
      throw Object.assign(new Error("Enter a valid Nigerian phone number."), { status: 400 });
    }
    await consumePhoneOtp(phoneNormalized, "guest_access", body.otp);
    const user = await findCustomerByPhone(phoneNormalized, body.phone);
    if (!user || user.status !== "active" || user.accountKind !== "guest") {
      throw Object.assign(new Error("Invalid or expired code. If you already have an account, sign in."), { status: 400 });
    }
    await prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } });
    await startGuestSession(user);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
