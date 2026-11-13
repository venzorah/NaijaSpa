import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientAddress } from "@/lib/http";
import { appUrl } from "@/lib/payments";
import { usingDemoListings } from "@/lib/live-db";
import { keepTrafficParams, listingTrafficFromSearch } from "@/lib/listing-traffic";
import { recordListingHit } from "@/lib/listing-view-store";

export async function GET(req: Request, { params }: { params: Promise<{ kind: string; slug: string }> }) {
  const { kind, slug } = await params;
  const url = new URL(req.url);
  const origin = appUrl() || url.origin;
  const decoded = decodeURIComponent(slug);
  const traffic = listingTrafficFromSearch(url.searchParams, req.headers.get("referer") || "", url.searchParams.get("from") === "admin");
  if (traffic.channel === "organic") {
    traffic.channel = "ad";
    if (!traffic.source) traffic.source = "ad-link";
    if (!traffic.medium) traffic.medium = "paid";
  }
  const kept = keepTrafficParams(url.searchParams);
  if (kind !== "v" && kind !== "s") {
    return NextResponse.redirect(new URL(`/explore?${kept}`, origin), 302);
  }

  if (usingDemoListings()) {
    const path = kind === "s" ? `/services/${encodeURIComponent(decoded)}` : `/providers/${encodeURIComponent(decoded)}`;
    return NextResponse.redirect(new URL(`${path}${kept.size ? `?${kept}` : ""}`, origin), 302);
  }

  try {
    if (kind === "s") {
      const alias = await prisma.serviceSlugAlias.findUnique({ where: { slug: decoded }, select: { serviceId: true } });
      const service = await prisma.service.findFirst({
        where: alias ? { id: alias.serviceId } : { slug: decoded },
        select: { id: true, slug: true, vendorId: true, vendor: { select: { applicationStatus: true } } }
      });
      if (!service || service.vendor.applicationStatus === "deleted") {
        return NextResponse.redirect(new URL("/explore", origin), 302);
      }
      await recordListingHit({
        vendorId: service.vendorId,
        serviceId: service.id,
        kind: "click",
        path: url.pathname,
        referrer: req.headers.get("referer") || "",
        ip: clientAddress(req),
        userAgent: req.headers.get("user-agent") || "",
        ...traffic
      });
      const target = `/services/${encodeURIComponent(service.slug)}${kept.size ? `?${kept}` : ""}`;
      return NextResponse.redirect(new URL(target, origin), 302);
    }

    const alias = await prisma.vendorSlugAlias.findUnique({ where: { slug: decoded }, select: { vendorId: true } });
    const vendor = await prisma.vendor.findFirst({
      where: alias ? { id: alias.vendorId } : { slug: decoded },
      select: { id: true, slug: true, applicationStatus: true }
    });
    if (!vendor || vendor.applicationStatus === "deleted") {
        return NextResponse.redirect(new URL("/explore", origin), 302);
    }
    await recordListingHit({
      vendorId: vendor.id,
      kind: "click",
      path: url.pathname,
      referrer: req.headers.get("referer") || "",
      ip: clientAddress(req),
      userAgent: req.headers.get("user-agent") || "",
      ...traffic
    });
    const target = `/providers/${encodeURIComponent(vendor.slug)}${kept.size ? `?${kept}` : ""}`;
    return NextResponse.redirect(new URL(target, origin), 302);
  } catch {
    const fallback = kind === "s" ? `/services/${encodeURIComponent(decoded)}` : `/providers/${encodeURIComponent(decoded)}`;
    return NextResponse.redirect(new URL(`${fallback}${kept.size ? `?${kept}` : ""}`, origin), 302);
  }
}
