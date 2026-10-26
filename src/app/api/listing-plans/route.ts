import { NextResponse } from "next/server";
import { listPublicVendorPlans } from "@/lib/vendor-plans-live";
import { defaultVendorListingPlans } from "@/lib/vendor-plans";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const plans = await listPublicVendorPlans();
    return NextResponse.json({ plans });
  } catch {
    try {
      return NextResponse.json({ plans: defaultVendorListingPlans() });
    } catch (e) {
      return jsonError(e);
    }
  }
}
