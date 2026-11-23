import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, requireUser } from "@/lib/auth";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { shopVendorStates, ensureShopCatalog } from "@/lib/shop/ensure";
import { grantShopPlan } from "@/lib/shop/plans";
import { SHOP_PLAN_FREE } from "@/lib/shop/constants";
import { shopSlug } from "@/lib/shop/slug";
import { NIGERIA_STATES } from "@/lib/nigeria";
import { ROLES } from "@/lib/rbac";
import { notifyShopUser } from "@/lib/shop/notify";

export async function POST(req: Request) {
  try {
    await rateLimit(`shop-apply:${clientAddress(req)}`, 8, 60_000);
    await ensureShopCatalog();
    const allowed = await shopVendorStates();
    const user = await getSession();
    const body = z
      .object({
        mode: z.enum(["activate", "register"]),
        businessName: z.string().min(2).max(80).optional(),
        state: z.enum(NIGERIA_STATES).optional(),
        city: z.string().min(2).max(80).optional(),
        neighbourhood: z.string().min(2).max(80).optional(),
        address: z.string().min(4).max(240).optional(),
        email: z.string().email().optional(),
        password: z.string().min(8).optional(),
        name: z.string().min(2).max(80).optional(),
        note: z.string().max(500).optional()
      })
      .parse(await req.json());
    if (body.mode === "activate") {
      const session = requireUser(user);
      if (!session.vendorId) return NextResponse.json({ error: "Sign in as a service vendor first." }, { status: 403 });
      const vendor = await prisma.vendor.findUnique({ where: { id: session.vendorId } });
      if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      if (!allowed.includes(vendor.state)) {
        return NextResponse.json({ error: `Product Store is currently open in ${allowed.join(", ")}.` }, { status: 400 });
      }
      if (vendor.shopStatus === "approved") return NextResponse.json({ vendor });
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          shopStatus: "pending",
          shopNote: body.note ?? "",
          commerceKind: vendor.commerceKind === "products" ? "products" : "both"
        }
      });
      return NextResponse.json({ ok: true, status: "pending" });
    }
    if (!body.email || !body.password || !body.name || !body.businessName || !body.state || !body.city || !body.neighbourhood || !body.address) {
      return NextResponse.json({ error: "Complete the product seller form." }, { status: 400 });
    }
    if (!allowed.includes(body.state)) {
      return NextResponse.json({ error: `Registration is currently open in ${allowed.join(", ")}.` }, { status: 400 });
    }
    const email = body.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: "That email already has an account. Sign in and apply from the vendor portal." }, { status: 409 });
    const slugBase = shopSlug(body.businessName);
    let slug = slugBase;
    let n = 1;
    while (await prisma.vendor.findUnique({ where: { slug } })) {
      n += 1;
      slug = `${slugBase}-${n}`;
    }
    const created = await prisma.$transaction(async (tx) => {
      const account = await tx.user.create({
        data: {
          email,
          passwordHash: await hashPassword(body.password!),
          name: body.name!,
          role: ROLES.VENDOR_OWNER
        }
      });
      const vendor = await tx.vendor.create({
        data: {
          ownerId: account.id,
          slug,
          businessName: body.businessName!,
          state: body.state!,
          city: body.city!,
          neighbourhood: body.neighbourhood!,
          address: body.address!,
          applicationStatus: "approved",
          visibility: "hidden",
          commerceKind: "products",
          shopStatus: "pending",
          shopNote: body.note ?? "",
          providerType: "retail"
        }
      });
      return vendor;
    });
    await grantShopPlan(created.id, SHOP_PLAN_FREE, "signup").catch(() => undefined);
    return NextResponse.json({ ok: true, status: "pending" });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const { requireAdmin } = await import("@/lib/admin-auth");
    const admin = await requireAdmin("shop.manage");
    const body = z.object({ vendorId: z.string(), status: z.enum(["approved", "rejected", "suspended"]), reason: z.string().max(240).optional() }).parse(await req.json());
    const vendor = await prisma.vendor.update({
      where: { id: body.vendorId },
      data: {
        shopStatus: body.status,
        shopRejectedReason: body.reason ?? "",
        commerceKind: body.status === "approved" ? undefined : undefined
      }
    });
    if (body.status === "approved") {
      const current = await prisma.vendor.findUnique({ where: { id: vendor.id } });
      if (current?.commerceKind === "services") {
        await prisma.vendor.update({ where: { id: vendor.id }, data: { commerceKind: "both" } });
      }
      await grantShopPlan(vendor.id, SHOP_PLAN_FREE, "approval").catch(() => undefined);
    }
    await notifyShopUser(vendor.ownerId, "Product Store application", `Your Shop application is ${body.status}.`, "/vendor/shop");
    void admin;
    return NextResponse.json({ vendor });
  } catch (e) {
    return jsonError(e);
  }
}
