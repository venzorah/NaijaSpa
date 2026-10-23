import Link from "next/link";
import { SearchFiltersForm } from "@/components/search-filters-form";
import { searchServices } from "@/lib/search";
import { formatNgn } from "@/lib/money";
import type { LocationType } from "@/lib/commercial";
import type { TherapistGender } from "@/lib/nigeria";

export const dynamic = "force-dynamic";

export default async function ExplorePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const gender = sp.gender === "male" || sp.gender === "female" ? (sp.gender as TherapistGender) : undefined;
  const data = await searchServices({
    q: sp.q || undefined,
    state: sp.state || undefined,
    city: sp.city || undefined,
    neighbourhood: sp.neighbourhood || undefined,
    gender,
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
  const filtered = Boolean(sp.state || sp.city || sp.neighbourhood || gender);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="font-display text-3xl">Explore</h1>
      <p className="mt-2 text-sm text-ink2">
        Enter state, city, area and preferred gender to see only therapists available in that exact place.
      </p>
      <SearchFiltersForm
        values={{
          q: sp.q,
          state: sp.state,
          city: sp.city,
          neighbourhood: sp.neighbourhood,
          gender: sp.gender,
          location: sp.location
        }}
      />
      <div className="mt-2 flex gap-2 text-xs">
        <Link className="underline" href="/explore">
          Clear all
        </Link>
        <Link className="underline" href="/ai">
          Try Ask NaijaSpa AI
        </Link>
      </div>
      {data.results.length === 0 ? (
        <p className="mt-10 text-ink2">
          {filtered
            ? "No available therapists in that exact location. Try another city, area or gender."
            : "No services match those filters."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {data.results.map((r) => (
            <li key={r.service.id} className="rounded-3xl border border-line bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-ink2">
                    {r.vendor.businessName} · {r.vendor.neighbourhood}, {r.vendor.city}
                    {"state" in r.vendor && r.vendor.state ? ` · ${r.vendor.state}` : ""}
                    {r.vendor.verificationStatus === "verified" ? " · Verified" : ""}
                  </p>
                  <h2 className="font-semibold">{r.service.name}</h2>
                  <p className="mt-1 text-sm">
                    {r.therapists.map((t) => `${t.name} (${t.gender || "unspecified"})`).join(" · ")}
                  </p>
                  <p className="text-sm text-goldink">
                    {formatNgn(r.quote.basePriceKobo)}
                    {r.quote.surchargeKobo > 0 ? ` + ${formatNgn(r.quote.surchargeKobo)} add-on` : ""} · total {formatNgn(r.quote.customerTotalKobo)}
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
