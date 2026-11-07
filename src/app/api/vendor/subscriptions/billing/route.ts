import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { getVendorBillingHistory } from "@/lib/vendor-billing";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireVendor();
    const params = new URL(request.url).searchParams;
    const { page, q } = z.object({
      page: z.coerce.number().int().min(1).max(100000).default(1),
      q: z.string().trim().max(80).default("")
    }).parse({ page: params.get("page") ?? undefined, q: params.get("q") ?? undefined });
    const result = await getVendorBillingHistory(user.vendorId, page, q);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return jsonError(error);
  }
}
