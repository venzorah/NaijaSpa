import { NextResponse } from "next/server";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { placeFromCoordinates } from "@/lib/ng-coordinates";
import { placeFromNominatim } from "@/lib/nigeria";

export async function GET(req: Request) {
  try {
    await rateLimit(`geo:${clientAddress(req)}`, 20, 60_000);
    const url = new URL(req.url);
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
    const mapped = placeFromCoordinates(lat, lng);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}&format=json&zoom=14&addressdetails=1`,
        {
          headers: { "User-Agent": "NaijaSpa/1.0 (concierge@naijaspa.com)", Accept: "application/json" },
          next: { revalidate: 3600 }
        }
      );
      if (res.ok) {
        const data = (await res.json()) as { address?: Parameters<typeof placeFromNominatim>[0] };
        const place = placeFromNominatim(data.address ?? {});
        if (place.state || place.city) return NextResponse.json(place);
      }
    } catch {
      /* OpenStreetMap can rate-limit Vercel; coordinates still resolve Abuja vs Lagos. */
    }
    if (mapped) return NextResponse.json(mapped);
    return NextResponse.json({ error: "Could not resolve location" }, { status: 502 });
  } catch (e) {
    return jsonError(e);
  }
}
