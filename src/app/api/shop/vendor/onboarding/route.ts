import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { requireVendor } from "@/lib/vendor-auth";
import { NIGERIA_STATES, vendorStateForLocation } from "@/lib/nigeria";
import { updateVendorWithSlug } from "@/lib/vendor-slugs";
import { vendorDocumentView } from "@/lib/verification-docs";
import {
  inferShopOnboardingStep,
  shopBusinessReady,
  shopKycReady,
  shopOnboardingComplete,
  shopStoreImagesReady
} from "@/lib/shop/onboarding";
import { shopVendorStates } from "@/lib/shop/ensure";

const patchSchema = z.object({
  step: z.number().int().min(0).max(5).optional(),
  submit: z.boolean().optional().default(false),
  businessName: z.string().min(2).max(80).optional(),
  description: z.string().max(2000).optional(),
  privatePhone: z.string().max(40).optional().nullable(),
  privateWhatsapp: z.string().max(40).optional().nullable(),
  state: z.enum(NIGERIA_STATES).optional(),
  city: z.string().max(80).optional(),
  neighbourhood: z.string().max(80).optional(),
  address: z.string().max(240).optional(),
  shopNote: z.string().max(500).optional()
});

async function shopOnboardingPayload(vendorId: string) {
  const vendor = await prisma.vendor.findUniqueOrThrow({
    where: { id: vendorId },
    include: {
      documents: { select: { id: true, kind: true, status: true } },
      owner: { select: { email: true, emailVerifiedAt: true } }
    }
  });
  const docCount = vendor.documents.length;
  const snapshot = {
    shopOnboardingStep: vendor.shopOnboardingStep,
    shopStatus: vendor.shopStatus,
    businessName: vendor.businessName,
    city: vendor.city,
    address: vendor.address,
    logoUrl: vendor.logoUrl,
    coverUrl: vendor.coverUrl,
    docCount,
    emailVerified: Boolean(vendor.owner.emailVerifiedAt)
  };
  return {
    complete: shopOnboardingComplete(snapshot),
    step: inferShopOnboardingStep(snapshot),
    vendor: {
      email: vendor.owner.email,
      emailVerified: snapshot.emailVerified,
      commerceKind: vendor.commerceKind,
      shopStatus: vendor.shopStatus,
      shopNote: vendor.shopNote,
      shopRejectedReason: vendor.shopRejectedReason,
      shopOnboardingStep: vendor.shopOnboardingStep,
      businessName: vendor.businessName,
      description: vendor.description,
      privatePhone: vendor.privatePhone ?? "",
      privateWhatsapp: vendor.privateWhatsapp ?? "",
      state: vendor.state,
      city: vendor.city,
      neighbourhood: vendor.neighbourhood,
      address: vendor.address,
      logoUrl: vendor.logoUrl ?? "",
      coverUrl: vendor.coverUrl ?? "",
      documents: vendor.documents.map(vendorDocumentView)
    }
  };
}

export async function GET() {
  try {
    const user = await requireVendor();
    return NextResponse.json(await shopOnboardingPayload(user.vendorId));
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireVendor();
    const body = patchSchema.parse(await req.json());
    const current = await prisma.vendor.findUniqueOrThrow({
      where: { id: user.vendorId },
      include: { documents: { select: { id: true } }, owner: { select: { emailVerifiedAt: true } } }
    });
    if (current.commerceKind !== "products" && current.commerceKind !== "both") {
      return NextResponse.json({ error: "This onboarding is for product sellers." }, { status: 403 });
    }
    const nextName = body.businessName ?? current.businessName;
    const nextCity = body.city ?? current.city;
    const nextAddress = body.address ?? current.address;
    const nextState = body.state ?? current.state;
    if (body.submit) {
      if (!current.owner.emailVerifiedAt) {
        return NextResponse.json({ error: "Verify your email with the 6-digit code first." }, { status: 400 });
      }
      const allowed = await shopVendorStates();
      const state = vendorStateForLocation(nextState, nextCity);
      if (!allowed.includes(state)) {
        return NextResponse.json({ error: `Product Store is currently open in ${allowed.join(", ")}.` }, { status: 400 });
      }
      if (!shopBusinessReady({ businessName: nextName, city: nextCity, address: nextAddress })) {
        return NextResponse.json({ error: "Save business name, city and address first." }, { status: 400 });
      }
      if (!shopKycReady(current.documents.length)) {
        return NextResponse.json({ error: "Upload a government ID or business certificate." }, { status: 400 });
      }
      if (!shopStoreImagesReady(current)) {
        return NextResponse.json({ error: "Upload a store profile image and a cover image." }, { status: 400 });
      }
    }
    const savingDetails = Boolean(body.businessName || body.city || body.address || body.submit);
    if (savingDetails && (body.submit || (body.step ?? 0) >= 2) && !shopBusinessReady({ businessName: nextName, city: nextCity, address: nextAddress })) {
      return NextResponse.json({ error: "Save business name, city and address first." }, { status: 400 });
    }
    const step = body.submit ? 4 : body.step;
    await updateVendorWithSlug(user.vendorId, {
      businessName: nextName,
      description: body.description ?? current.description,
      privatePhone: body.privatePhone === undefined ? current.privatePhone : body.privatePhone,
      privateWhatsapp: body.privateWhatsapp === undefined ? current.privateWhatsapp : body.privateWhatsapp,
      state: vendorStateForLocation(nextState, nextCity),
      city: nextCity,
      neighbourhood: body.neighbourhood ?? current.neighbourhood,
      address: nextAddress,
      shopNote: body.shopNote ?? current.shopNote,
      shopOnboardingStep: body.submit ? 5 : step ?? current.shopOnboardingStep,
      ...(body.submit
        ? {
            shopStatus: current.shopStatus === "approved" ? current.shopStatus : "pending",
            shopRejectedReason: "",
            applicationStatus: current.applicationStatus === "approved" ? current.applicationStatus : "submitted"
          }
        : {})
    });
    return NextResponse.json(await shopOnboardingPayload(user.vendorId));
  } catch (e) {
    return jsonError(e);
  }
}
