import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { isAdminRole, isVendorRole, portalHome } from "@/lib/rbac";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";

export async function POST(req: Request) {
  try {
    await rateLimit(`login:${clientAddress(req)}`, 10, 60_000);
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        expect: z.enum(["customer", "vendor", "admin"]).optional()
      })
      .parse(await req.json());
    await rateLimit(`login:account:${body.email.toLowerCase()}`, 10, 15 * 60_000);
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { vendorOwned: true, staffMemberships: true }
    });
    if (!user || user.status !== "active") {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (!user.passwordHash) {
      return NextResponse.json({ error: "This account uses Gmail. Continue with Gmail to sign in." }, { status: 401 });
    }
    if (!(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (body.expect === "vendor" && !isVendorRole(user.role)) {
      return NextResponse.json({ error: "This is not a vendor account. Use customer or admin login." }, { status: 403 });
    }
    if (body.expect === "admin" && !isAdminRole(user.role)) {
      return NextResponse.json({ error: "This is not an admin account. Use customer or vendor login." }, { status: 403 });
    }
    await createSession({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as never,
      locale: user.locale,
      theme: user.theme,
      vendorId: user.vendorOwned?.id ?? user.staffMemberships[0]?.vendorId
    }, user.passwordHash);
    return NextResponse.json({ ok: true, role: user.role, home: portalHome(user.role) });
  } catch (e) {
    return jsonError(e);
  }
}
