import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { usingDemoListings } from "@/lib/live-db";
import { prisma } from "@/lib/db";
import { listingTrafficFromSearch } from "@/lib/listing-traffic";
import { recordListingHit } from "@/lib/listing-view-store";

const bodySchema = z.object({
  vendorId: z.string().min(8).max(40),
  serviceId: z.string().min(8).max(40).optional(),
  path: z.string().max(240).optional(),
  referrer: z.string().max(240).optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(80).optional(),
  utmCampaign: z.string().max(120).optional(),
  utmContent: z.string().max(120).optional(),
  utmTerm: z.string().max(120).optional(),
  src: z.string().max(80).optional()
});

export async function POST(req: Request) {
  try {
    if (usingDemoListings()) return NextResponse.json({ ok: true, demo: true });
    const body = bodySchema.parse(await req.json());
    await rateLimit(`listing-view:${clientAddress(req)}:${body.vendorId}:${body.serviceId || "vendor"}`, 12, 60 * 60_000);
    const vendor = await prisma.vendor.findFirst({
      where: { id: body.vendorId, applicationStatus: { not: "deleted" } },
      select: { id: true }
    });
    if (!vendor) return NextResponse.json({ ok: true });
    if (body.serviceId) {
      const service = await prisma.service.findFirst({
        where: { id: body.serviceId, vendorId: vendor.id, deletedAt: null },
        select: { id: true }
      });
      if (!service) return NextResponse.json({ ok: true });
    }
    const traffic = listingTrafficFromSearch(
      {
        utm_source: body.utmSource,
        utm_medium: body.utmMedium,
        utm_campaign: body.utmCampaign,
        utm_content: body.utmContent,
        utm_term: body.utmTerm,
        src: body.src
      },
      body.referrer || ""
    );
    await recordListingHit({
      vendorId: vendor.id,
      serviceId: body.serviceId,
      kind: "view",
      path: body.path,
      referrer: body.referrer,
      ip: clientAddress(req),
      userAgent: req.headers.get("user-agent") || "",
      ...traffic
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
