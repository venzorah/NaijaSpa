import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { ROLES } from "@/lib/rbac";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { queueMail, sendWelcomeEmail } from "@/lib/mail";
import { freeAbandonedIdentity } from "@/lib/account-purge";
import { grantShopPlan } from "@/lib/shop/plans";
import { SHOP_PLAN_FREE } from "@/lib/shop/constants";
import { queueShopEmailOtp } from "@/lib/shop/send-email-otp";

export async function POST(req: Request) {
  try {
    await rateLimit(`register:${clientAddress(req)}`, 8);
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(10),
        name: z.string().min(2),
        asVendor: z.boolean().optional(),
        asShop: z.boolean().optional()
      })
      .parse(await req.json());
    const email = body.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      const freed = await freeAbandonedIdentity(email);
      const still = freed ? await prisma.user.findUnique({ where: { email } }) : exists;
      if (still) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    const asShop = Boolean(body.asShop);
    const asVendor = Boolean(body.asVendor) || asShop;
    const role = asVendor ? ROLES.VENDOR_OWNER : ROLES.CUSTOMER;
    const user = await prisma.user.create({
      data: {
        email,
        name: body.name,
        passwordHash: await hashPassword(body.password),
        role,
        customerProfile: role === ROLES.CUSTOMER ? { create: {} } : undefined
      }
    });
    if (asVendor) {
      const vendor = await prisma.vendor.create({
        data: asShop
          ? {
              ownerId: user.id,
              slug: `vendor-${user.id.slice(-8)}`,
              businessName: `${body.name}'s store`,
              city: "Lagos",
              neighbourhood: "",
              address: "",
              applicationStatus: "draft",
              commerceKind: "products",
              shopStatus: "none",
              providerType: "retail"
            }
          : {
              ownerId: user.id,
              slug: `vendor-${user.id.slice(-8)}`,
              businessName: `${body.name}'s studio`,
              city: "Lagos",
              neighbourhood: "",
              address: "",
              applicationStatus: "draft"
            }
      });
      if (asShop) {
        await grantShopPlan(vendor.id, SHOP_PLAN_FREE, "signup").catch(() => undefined);
        void queueShopEmailOtp(user.id, user.email);
      }
    }
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as never,
      locale: "en",
      theme: "light"
    }, user.passwordHash || undefined);
    queueMail(sendWelcomeEmail({ to: user.email, name: user.name, asVendor }));
    return NextResponse.json({ ok: true, home: asShop ? "/vendor/shop/onboarding" : undefined });
  } catch (e) {
    return jsonError(e);
  }
}
