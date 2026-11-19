import { NextResponse } from "next/server";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { lookupPlaceFromIp, requestClientIp } from "@/lib/geo-ip";

export async function GET(req: Request) {
  try {
    await rateLimit(`geo-ip:${clientAddress(req)}`, 30, 60_000);
    const ip = requestClientIp(req.headers);
    const place = await lookupPlaceFromIp(ip);
    if (!place) return NextResponse.json({ error: "Could not detect location" }, { status: 404 });
    return NextResponse.json(place);
  } catch (e) {
    return jsonError(e);
  }
}
