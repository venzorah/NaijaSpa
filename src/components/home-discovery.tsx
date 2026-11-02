import Link from "next/link";
import { getHomeDiscovery } from "@/lib/home-discovery";
import { categoryHref, categoryImage } from "@/lib/category-images";
import { exploreHref } from "@/lib/place-urls";
import { formatNgn } from "@/lib/money";
import type { LivePlace } from "@/lib/nigeria";
import { VendorCarousel } from "@/components/service-carousel";
import { HomeServiceGrid } from "@/components/home-service-grid";

export async function HomeDiscovery({ place }: { place: LivePlace | null }) {
  const data = await getHomeDiscovery(place).catch(() => null);
  if (!data) return null;
  return <>
    <HomeServiceGrid id="popular-treatments" title="Popular treatments" layout="popular" subtitle="Ranked by completed bookings." seeAllHref={exploreHref(place)} cards={data.popular} />
    <VendorCarousel title="Verified providers" vendors={data.verified} />
    {data.collections.length ? <section className="mx-auto mt-10 max-w-7xl px-4 lg:px-8" aria-labelledby="featured-collections"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Curated</p><h2 id="featured-collections" className="font-display text-2xl md:text-3xl">Featured collections</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{data.collections.map(c => <Link key={c.slug} href={categoryHref(c.slug)} className="relative overflow-hidden rounded-3xl border border-line bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={categoryImage(c.slug, c.imageUrl)} alt="" className="h-40 w-full object-cover" /><div className="p-4"><h3 className="font-semibold">{c.name}</h3><p className="text-sm text-ink2">{c._count.services} treatment{c._count.services === 1 ? "" : "s"}{place?.state ? ` in ${place.state}` : ""}</p></div>
    </Link>)}</div></section> : null}
    {data.promotions.length ? <section className="mx-auto mt-10 grid max-w-7xl gap-4 px-4 md:grid-cols-2 lg:px-8" aria-label="Current offers">{data.promotions.map(p => <article key={p.id} className="rounded-3xl border border-gold/40 bg-gold/10 p-6"><p className="text-xs font-bold uppercase tracking-wide text-goldink">Promotion</p><h2 className="mt-2 font-display text-2xl">{p.description}</h2><p className="mt-2 text-sm">{p.amountKobo > 0 ? `${formatNgn(p.amountKobo)} off` : `${p.percentOff}% off`} · Use code <strong>{p.code}</strong></p><p className="mt-1 text-xs text-ink2">Ends {p.endsAt.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}. Eligibility is checked at checkout.</p><Link href={exploreHref(place)} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">Explore treatments →</Link></article>)}</section> : null}
    {data.reviews.length ? <section className="mx-auto mt-10 max-w-7xl px-4 lg:px-8" aria-labelledby="genuine-ratings"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">From completed bookings</p><h2 id="genuine-ratings" className="font-display text-2xl md:text-3xl">Genuine ratings</h2><div className="mt-4 grid gap-3 md:grid-cols-3">{data.reviews.map(r => <figure key={r.id} className="rounded-3xl border border-line bg-card p-5"><p className="text-goldink">{r.rating} / 5</p><blockquote className="mt-3 text-sm leading-relaxed">{r.body}</blockquote><figcaption className="mt-4 text-xs text-ink2">{r.user.name?.trim().split(/\s+/)[0] || "Guest"}<Link className="mt-1 block font-semibold" href={`/services/${r.booking.service.slug}`}>{r.booking.service.name}</Link></figcaption></figure>)}</div></section> : null}
  </>;
}
