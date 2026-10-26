import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { ROLES } from "@/lib/rbac";
import { jsonError, rateLimit } from "@/lib/http";
import { queueMail, sendWelcomeEmail } from "@/lib/mail";

export async function POST(req: Request) {
  try {
    rateLimit("register", 8);
    const body = z
      .object({ email: z.string().email(), password: z.string().min(10), name: z.string().min(2), asVendor: z.boolean().optional() })
      .parse(await req.json());
    const email = body.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    const role = body.asVendor ? ROLES.VENDOR_OWNER : ROLES.CUSTOMER;
    const user = await prisma.user.create({
      data: {
        email,
        name: body.name,
        passwordHash: await hashPassword(body.password),
        role,
        customerProfile: role === ROLES.CUSTOMER ? { create: {} } : undefined
      }
    });
    if (body.asVendor) {
      await prisma.vendor.create({
        data: {
          ownerId: user.id,
          slug: `vendor-${user.id.slice(-8)}`,
          businessName: `${body.name}'s studio`,
          city: "Lagos",
          neighbourhood: "",
          address: "",
          applicationStatus: "draft"
        }
      });
    }
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as never,
      locale: "en",
      theme: "light"
    });
    queueMail(sendWelcomeEmail({ to: user.email, name: user.name, asVendor: Boolean(body.asVendor) }));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
