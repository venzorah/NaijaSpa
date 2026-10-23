import Link from "next/link";
import { searchServices } from "@/lib/search";
import { formatNgn } from "@/lib/money";
import type { LocationType } from "@/lib/commercial";

export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const data = await searchServices({
    q: sp.q,
    city: sp.city,
    neighbourhood: sp.neighbourhood,
    category: sp.category,
    minPrice: sp.minPrice ? Number(sp.minPrice) * 100 : undefined,
    maxPrice: sp.maxPrice ? Number(sp.maxPrice) * 100 : undefined,
    minRating: sp.minRating ? Number(sp.minRating) : undefined,
    verified: sp.verified === "1",
    durationMin: sp.duration ? Number(sp.duration) : undefined,
    locationType: (sp.location as LocationType) || undefined,
    publicContact: sp.whatsapp === "1",
    sort: (sp.sort as "price" | "rating" | "relevance") || "relevance",
    page: sp.page ? Number(sp.page) : 1
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="font-display text-3xl">Explore</h1>
      <form className="mt-4 grid gap-2 rounded-3xl border border-line bg-card p-4 md:grid-cols-6">
        <input name="q" defaultValue={sp.q} placeholder="Treatment" className="min-h-11 rounded-xl bg-elev px-3 text-sm md:col-span-2" />
        <input name="city" defaultValue={sp.city} placeholder="City" className="min-h-11 rounded-xl bg-elev px-3 text-sm" />
        <select name="location" defaultValue={sp.location || ""} className="min-h-11 rounded-xl bg-elev px-3 text-sm">
          <option value="">Any location</option>
          <option value="spa">Spa/Office</option>
          <option value="hotel">Hotel</option>
          <option value="home">Home</option>
        </select>
        <select name="sort" defaultValue={sp.sort || "relevance"} className="min-h-11 rounded-xl bg-elev px-3 text-sm">
          <option value="relevance">Relevance</option>
          <option value="price">Price</option>
          <option value="rating">Rating</option>
        </select>
        <button className="min-h-11 rounded-full bg-gold text-sm font-bold text-ongold">Apply</button>
      </form>
      <div className="mt-2 flex gap-2 text-xs">
        <Link className="underline" href="/explore">
          Clear all
        </Link>
        <Link className="underline" href="/ai">
          Try Ask NaijaSpa AI
        </Link>
      </div>
      {data.results.length === 0 ? (
        <p className="mt-10 text-ink2">No services match those filters. Try a wider city or price range.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.results.map((r) => (
            <li key={r.service.id} className="rounded-3xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-ink2">
                    {r.vendor.businessName} · {r.vendor.neighbourhood}, {r.vendor.city}
                    {r.vendor.verificationStatus === "verified" ? " · Verified" : ""}
                  </p>
                  <h2 className="font-semibold">{r.service.name}</h2>
                  <p className="text-sm text-goldink">
                    {formatNgn(r.quote.basePriceKobo)}
                    {r.quote.surchargeKobo > 0 ? ` + ${formatNgn(r.quote.surchargeKobo)} surcharge` : ""} · total {formatNgn(r.quote.customerTotalKobo)}
                  </p>
                  {r.vendor.publicPhone && <p className="text-xs">Phone {r.vendor.publicPhone}</p>}
                  {r.vendor.publicWhatsapp && (
                    <a className="text-xs text-leaf" href={r.vendor.publicWhatsapp}>
                      WhatsApp
                    </a>
                  )}
                </div>
                <Link href={`/services/${r.service.slug}`} className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-ongold">
                  Book
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
