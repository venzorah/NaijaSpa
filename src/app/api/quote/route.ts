import { NextResponse } from "next/server";
import { quotePublicService } from "@/lib/catalog";
import type { LocationType } from "@/lib/commercial";
import { jsonError } from "@/lib/http";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const serviceId = url.searchParams.get("serviceId");
    const location = (url.searchParams.get("location") || "spa") as LocationType;
    if (!serviceId) return NextResponse.json({ error: "serviceId required" }, { status: 400 });
    return NextResponse.json(await quotePublicService(serviceId, location));
  } catch (e) {
    return jsonError(e);
  }
}
