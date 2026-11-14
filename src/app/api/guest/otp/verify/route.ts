import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { consumePhoneOtp } from "@/lib/guest-otp";
import { findCustomerByPhone, findGuestByEmail, startGuestSession } from "@/lib/guest-identity";
import { guestOtpTarget } from "@/lib/phone";

export async function POST(req: Request) {
  try {
    await rateLimit(`guest-otp-verify:${clientAddress(req)}`, 12, 10 * 60 * 1000);
    const body = z
      .object({
        phone: z.string().trim().min(10).max(20).optional(),
        email: z.string().trim().email().optional(),
        otp: z.string().min(4).max(8)
      })
      .parse(await req.json());
    const target = guestOtpTarget(body);
    await consumePhoneOtp(target.dest, "guest_access", body.otp);
    if (target.kind === "email") {
      const user = await findGuestByEmail(target.email);
      if (!user) {
        throw Object.assign(new Error("Invalid or expired code. If you already have an account, sign in."), { status: 400 });
      }
      await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      await startGuestSession(user);
      return NextResponse.json({ ok: true, via: "email" });
    }
    const user = await findCustomerByPhone(target.phone, target.rawPhone);
    if (!user || user.status !== "active" || user.accountKind !== "guest") {
      throw Object.assign(new Error("Invalid or expired code. If you already have an account, sign in."), { status: 400 });
    }
    await prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } });
    await startGuestSession(user);
    return NextResponse.json({ ok: true, via: "sms" });
  } catch (e) {
    return jsonError(e);
  }
}
