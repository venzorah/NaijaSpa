import { NextResponse } from "next/server";
import { jsonError, rateLimit } from "@/lib/http";
import { placeFromNominatim } from "@/lib/nigeria";

export async function GET(req: Request) {
  try {
    rateLimit(`geo:${req.headers.get("x-forwarded-for") || "local"}`, 20, 60_000);
    const url = new URL(req.url);
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&format=json&zoom=14&addressdetails=1`,
      {
        headers: { "User-Agent": "NaijaSpa/1.0 (concierge@naijaspa.ng)", Accept: "application/json" },
        next: { revalidate: 3600 }
      }
    );
    if (!res.ok) return NextResponse.json({ error: "Could not resolve location" }, { status: 502 });
    const data = (await res.json()) as { address?: Parameters<typeof placeFromNominatim>[0] };
    const place = placeFromNominatim(data.address ?? {});
    return NextResponse.json(place);
  } catch (e) {
    return jsonError(e);
  }
}
