import Link from "next/link";
import { BadgeCheck, Clock, MapPin, Star } from "lucide-react";
import { listingPhotos } from "@/lib/photos";
import { formatNgn } from "@/lib/money";
import type { HomeCard } from "@/lib/home-types";

/** Homepage layouts follow the reference, with prices and badges from actual listings. */
export function HomeServiceGrid({ id, title, subtitle, seeAllHref, cards, layout = "featured" }: {
  id: string; title: string; subtitle?: string; seeAllHref: string; cards: HomeCard[]; layout?: "featured" | "spotlight" | "popular";
}) {
  if (!cards.length) return null;
  return <section className="mx-auto mt-10 max-w-7xl px-4 lg:px-8" aria-labelledby={id}>
    <div className="flex items-end justify-between gap-4"><div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">{layout === "featured" ? "Handpicked" : layout === "popular" ? "Most booked" : "Sponsored"}</p>
      <h2 id={id} className="font-display text-2xl md:text-3xl">{title}</h2>
      {subtitle ? <p className="mt-1 max-w-xl text-sm text-ink2">{subtitle}</p> : null}
    </div><Link className="shrink-0 text-sm font-semibold text-goldink" href={seeAllHref}>See all →</Link></div>
    <div className={`mt-4 grid gap-4 ${layout === "featured" ? "sm:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2"}`}>
      {cards.map(({ service, vendor, sponsored, tags }) => {
        const { cover } = listingPhotos({ imageUrl: service.imageUrl, logoUrl: vendor.logoUrl });
        const href = `/services/${encodeURIComponent(service.slug)}`;
        return <article key={service.id} className={`overflow-hidden rounded-3xl border border-line bg-card ${layout === "popular" ? "flex items-start gap-3 p-4" : ""}`}>
          <Link href={href} className={`relative block shrink-0 ${layout === "popular" ? "w-24 overflow-hidden rounded-xl sm:w-32" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className={`w-full object-cover ${layout === "popular" ? "h-24" : layout === "spotlight" ? "h-56" : "h-44"}`} />
            {sponsored ? <span className="absolute left-2 top-2 rounded-full bg-bg/90 px-2 py-1 text-[10px] font-bold uppercase text-goldink">Sponsored</span> : null}
            {layout !== "popular" ? <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-bg/90 px-2 py-1 text-xs"><Clock className="h-3 w-3" />{service.durationMin} min</span> : null}
          </Link>
          <div className={`min-w-0 flex-1 ${layout === "popular" ? "" : "p-4"}`}>
            <Link href={href} className="block font-semibold leading-snug hover:text-goldink">{service.name}</Link>
            <Link href={`/providers/${encodeURIComponent(vendor.slug)}`} className="mt-1 block text-xs text-ink2 hover:text-goldink">{vendor.businessName}</Link>
            <p className="mt-1 flex items-center gap-1 text-xs text-ink2"><MapPin className="h-3 w-3 shrink-0" />{[vendor.neighbourhood, vendor.city].filter(Boolean).join(", ")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {vendor.reviewCount && vendor.ratingAvg > 0 ? <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" />{vendor.ratingAvg.toFixed(1)} ({vendor.reviewCount})</span> : null}
              {vendor.verificationStatus === "verified" ? <span className="inline-flex items-center gap-1 text-leaf"><BadgeCheck className="h-3 w-3" />Verified</span> : null}
            </div>
            <div className="mt-3 flex items-end justify-between gap-2"><span className="text-xs text-ink2">{layout === "popular" ? `${service.durationMin} min` : tags?.find(t => t.includes("completed booking"))}</span><span className="font-bold text-goldink">{formatNgn(service.basePriceKobo)}</span></div>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
