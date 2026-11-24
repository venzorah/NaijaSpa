import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, getSession, hashPassword, requireUser } from "@/lib/auth";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { shopVendorStates, ensureShopCatalog } from "@/lib/shop/ensure";
import { grantShopPlan } from "@/lib/shop/plans";
import { SHOP_PLAN_FREE } from "@/lib/shop/constants";
import { shopSlug } from "@/lib/shop/slug";
import { NIGERIA_STATES } from "@/lib/nigeria";
import { ROLES } from "@/lib/rbac";
import { notifyShopUser } from "@/lib/shop/notify";
import { queueShopEmailOtp } from "@/lib/shop/send-email-otp";
import { ensureVendorShopShipping } from "@/lib/shop/default-shipping";

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
        password: z.string().min(10).optional(),
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
      if (vendor.shopStatus === "approved") return NextResponse.json({ vendor, home: "/vendor/shop" });
      if (vendor.commerceKind === "products") {
        return NextResponse.json({ ok: true, home: "/vendor/shop/onboarding", status: vendor.shopStatus });
      }
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: {
          shopStatus: "pending",
          shopNote: body.note ?? "",
          commerceKind: "both"
        }
      });
      return NextResponse.json({ ok: true, status: "pending", home: "/vendor/shop" });
    }
    if (!body.email || !body.password || !body.name) {
      return NextResponse.json({ error: "Enter your name, email and password." }, { status: 400 });
    }
    const email = body.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ error: "That email already has an account. Sign in as a vendor to continue setup." }, { status: 409 });
    const businessName = body.businessName?.trim() || `${body.name}'s store`;
    const slugBase = shopSlug(businessName);
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
          businessName,
          state: body.state ?? "Lagos",
          city: body.city ?? "Lagos",
          neighbourhood: body.neighbourhood ?? "",
          address: body.address ?? "",
          applicationStatus: "draft",
          visibility: "hidden",
          commerceKind: "products",
          shopStatus: "none",
          shopNote: body.note ?? "",
          shopOnboardingStep: 0,
          providerType: "retail"
        }
      });
      return { account, vendor };
    });
    await createSession(
      {
        id: created.account.id,
        email: created.account.email,
        name: created.account.name,
        role: created.account.role as never,
        locale: "en",
        theme: "light",
        vendorId: created.vendor.id
      },
      created.account.passwordHash || undefined
    );
    await grantShopPlan(created.vendor.id, SHOP_PLAN_FREE, "signup").catch(() => undefined);
    void queueShopEmailOtp(created.account.id, created.account.email);
    return NextResponse.json({ ok: true, status: "none", home: "/vendor/shop/onboarding" });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const { requireAdmin } = await import("@/lib/admin-auth");
    const admin = await requireAdmin("shop.manage");
    const body = z
      .object({
        vendorId: z.string(),
        status: z.enum(["approved", "rejected", "suspended"]),
        reason: z.string().max(240).optional(),
        approveProducts: z.boolean().optional()
      })
      .parse(await req.json());
    const vendor = await prisma.vendor.update({
      where: { id: body.vendorId },
      data: {
        shopStatus: body.status,
        shopRejectedReason: body.reason ?? "",
        applicationStatus: body.status === "approved" ? "approved" : undefined
      }
    });
    if (body.status === "approved") {
      const current = await prisma.vendor.findUnique({ where: { id: vendor.id } });
      if (current?.commerceKind === "services") {
        await prisma.vendor.update({ where: { id: vendor.id }, data: { commerceKind: "both" } });
      }
      await grantShopPlan(vendor.id, SHOP_PLAN_FREE, "approval").catch(() => undefined);
      await ensureVendorShopShipping(vendor.id, current?.state || vendor.state).catch(() => undefined);
      if (body.approveProducts) {
        await prisma.shopProduct.updateMany({
          where: { vendorId: vendor.id, status: "pending" },
          data: { status: "approved" }
        });
      }
    }
    await notifyShopUser(
      vendor.ownerId,
      "Product Store application",
      body.approveProducts && body.status === "approved"
        ? "Your Shop and pending products were approved."
        : `Your Shop application is ${body.status}.`,
      "/vendor/shop"
    );
    void admin;
    return NextResponse.json({ vendor });
  } catch (e) {
    return jsonError(e);
  }
}
