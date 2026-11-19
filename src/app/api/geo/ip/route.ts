import { NextResponse } from "next/server";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { lookupPlaceFromRequest } from "@/lib/geo-ip";

export async function GET(req: Request) {
  try {
    await rateLimit(`geo-ip:${clientAddress(req)}`, 30, 60_000);
    const place = await lookupPlaceFromRequest(req.headers);
    if (!place) return NextResponse.json({ error: "Could not detect location" }, { status: 404 });
    return NextResponse.json(place);
  } catch (e) {
    return jsonError(e);
  }
}
