import { NextResponse } from "next/server";
import { listPublicVendorPlans } from "@/lib/vendor-plans-live";
import { LIVE_VENDOR_PLANS } from "@/lib/vendor-plans";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const plans = await listPublicVendorPlans();
    return NextResponse.json({ plans });
  } catch {
    try {
      return NextResponse.json({
        plans: LIVE_VENDOR_PLANS.map((p) => ({
          code: p.code,
          name: p.name,
          priceKobo: p.priceKobo,
          durationDays: p.durationDays,
          commissionBps: p.commissionBps,
          publicDirectContact: p.publicDirectContact,
          enhancedVisibility: p.enhancedVisibility,
          sponsoredEligible: p.sponsoredEligible
        }))
      });
    } catch (e) {
      return jsonError(e);
    }
  }
}
