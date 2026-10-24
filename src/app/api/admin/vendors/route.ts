import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, hashPassword, requireUser } from "@/lib/auth";
import { assertAnyPermission, assertPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = requireUser(await getSession());
    assertAnyPermission(user.role, ["vendors.manage", "vendors.verify"]);
    const vendors = await prisma.vendor.findMany({ include: { owner: true, subscriptions: { include: { plan: true } } } });
    return NextResponse.json({ vendors });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const actor = requireUser(await getSession());
    assertPermission(actor.role, "vendors.invite");
    const body = z.object({ email: z.string().email(), businessName: z.string().min(2), city: z.string().min(2) }).parse(await req.json());
    const token = crypto.randomBytes(24).toString("hex");
    const tempPass = crypto.randomBytes(12).toString("base64url");
    const owner = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.businessName,
        role: "vendor_owner",
        status: "active",
        passwordHash: await hashPassword(tempPass)
      }
    });
    const vendor = await prisma.vendor.create({
      data: {
        ownerId: owner.id,
        slug: `invite-${owner.id.slice(-6)}`,
        businessName: body.businessName,
        city: body.city,
        neighbourhood: "",
        address: "",
        applicationStatus: "draft"
      }
    });
    await prisma.vendorInvite.create({
      data: {
        vendorId: vendor.id,
        email: body.email.toLowerCase(),
        token,
        invitedById: actor.id,
        expiresAt: new Date(Date.now() + 7 * 864e5)
      }
    });
    await audit({
      actorId: actor.id,
      action: "vendor.invite",
      entityType: "Vendor",
      entityId: vendor.id,
      after: { email: body.email, businessName: body.businessName }
    });
    return NextResponse.json({
      vendorId: vendor.id,
      setupUrl: `/invite/${token}`,
      note: "Temporary password is not returned. Vendor must use the setup link."
    });
  } catch (e) {
    return jsonError(e);
  }
}
