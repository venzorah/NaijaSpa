import { NextResponse } from "next/server";
import { prisma, getCommercialConfig } from "@/lib/db";
import { quoteBooking, type LocationType } from "@/lib/commercial";
import { vendorEntitlement } from "@/lib/entitlements";
import { jsonError } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const serviceId = url.searchParams.get("serviceId");
    const location = (url.searchParams.get("location") || "spa") as LocationType;
    if (!serviceId) return NextResponse.json({ error: "serviceId required" }, { status: 400 });
    const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } });
    const ent = await vendorEntitlement(service.vendorId);
    const config = await getCommercialConfig();
    return NextResponse.json(quoteBooking({ basePriceKobo: service.basePriceKobo, location, entitlement: ent, config }));
  } catch (e) {
    return jsonError(e);
  }
}
