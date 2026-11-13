import { requireAdmin } from "@/lib/admin-auth";
import { deleteVendor } from "@/lib/admin-account-actions";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { grantVendorPlan } from "@/lib/subscription-lifecycle";
import { updateVendorWithSlug } from "@/lib/vendor-slugs";
import { vendorStateForLocation } from "@/lib/nigeria";
import { hasPermission } from "@/lib/rbac";
import { publicContentUrl } from "@/lib/public-content";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(["vendors.manage", "vendors.verify"]);
    const { id } = await params;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      select: {
        id: true,
        applicationStatus: true,
        coverUrl: true,
        logoUrl: true,
        documents: {
          select: { id: true, kind: true, status: true, createdAt: true, mimeType: true, byteSize: true },
          orderBy: { createdAt: "desc" }
        },
        services: {
          where: { deletedAt: null },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            categoryId: true,
            imageUrl: true,
            basePriceKobo: true,
            durationMin: true,
            spaEnabled: true,
            hotelEnabled: true,
            homeEnabled: true,
            hotelAddonKobo: true,
            homeAddonKobo: true,
            active: true
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });
    if (!vendor || vendor.applicationStatus === "deleted") return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true }
    });
    return NextResponse.json({
      canEdit: hasPermission(actor, "vendors.manage"),
      vendor: {
        id: vendor.id,
        coverUrl: vendor.coverUrl || "",
        logoUrl: vendor.logoUrl || "",
        documents: vendor.documents,
        services: vendor.services
      },
      categories
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("vendors.manage");
    const { id } = await params;
    const before = await prisma.vendor.findUniqueOrThrow({ where: { id } });
    if (before.applicationStatus === "deleted") return NextResponse.json({error:"Vendor not found"},{status:404});
    const body = z
      .object({
        applicationStatus: z.enum(["draft", "submitted", "under_review", "approved", "rejected", "suspended"]).optional(),
        verificationStatus: z.enum(["unverified", "verified", "rejected"]).optional(),
        visibility: z.enum(["hidden", "public"]).optional(),
        planCode: z.string().min(2).max(40).optional(),
        businessName: z.string().trim().min(2).max(150).optional(),
        description: z.string().trim().max(10000).optional(),
        providerType: z.enum(["spa", "independent", "hotel", "mobile"]).optional(),
        privatePhone: z.string().trim().max(30).refine(v => !v || /^[+\d ()-]{8,30}$/.test(v), "Enter a valid mobile number").nullable().optional(),
        privateWhatsapp: z.string().trim().max(30).refine(v => !v || /^[+\d ()-]{8,30}$/.test(v), "Enter a valid WhatsApp number").nullable().optional(),
        instagramUrl: z.string().trim().max(200).nullable().optional(),
        state: z.string().trim().min(2).max(100).optional(),
        city: z.string().trim().min(2).max(100).optional(),
        neighbourhood: z.string().trim().max(150).optional(),
        address: z.string().trim().min(4).max(500).optional(),
        cancellationPolicy: z.string().trim().max(5000).optional(),
        coverUrl: z.union([publicContentUrl, z.literal("")]).optional(),
        logoUrl: z.union([publicContentUrl, z.literal("")]).optional(),
        publicContactEnabled: z.boolean().optional()
      })
      .strict()
      .refine(body => Object.keys(body).length > 0, "Choose details to update")
      .refine(body => !body.planCode || Object.keys(body).length === 1, "Update the listing plan separately from vendor details")
      .refine(
        body => !("publicContactEnabled" in body) || Object.keys(body).length === 1,
        "Turn public contact on or off separately from other vendor details"
      )
      .parse(await req.json());
    const { planCode, coverUrl, logoUrl, ...rest } = body;
    const data = {
      ...rest,
      ...(coverUrl !== undefined ? { coverUrl: coverUrl || null } : {}),
      ...(logoUrl !== undefined ? { logoUrl: logoUrl || null } : {})
    };
    if (data.state !== undefined || data.city !== undefined) {
      data.state = vendorStateForLocation(data.state ?? before.state, data.city ?? before.city);
    }
    if (planCode) await grantVendorPlan(id, planCode, "admin_grant");
    const vendor =
      Object.keys(data).length === 0
        ? await prisma.vendor.findUniqueOrThrow({ where: { id } })
        : data.businessName !== undefined
          ? await updateVendorWithSlug(id, { ...data, businessName: data.businessName })
          : await prisma.vendor.update({ where: { id }, data });
    await audit({ actorId: actor.id, action: "vendor.update", entityType: "Vendor", entityId: id, before, after: vendor });
    revalidateTag("home-catalog");
    return NextResponse.json({ vendor });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}) {try{const actor=await requireAdmin("vendors.manage");const body=z.object({reason:z.string().trim().min(5).max(500)}).parse(await req.json());const result=await deleteVendor(actor,(await params).id,body.reason);revalidateTag("home-catalog");revalidateTag("home-hero");return NextResponse.json(result);}catch(e){return jsonError(e);}}
