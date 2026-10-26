import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Info, MapPin, Star } from "lucide-react";
import { getPublicVendor } from "@/lib/catalog";
import { hasPublicVendorContact, PublicVendorContact } from "@/components/public-vendor-contact";
import { formatNgn } from "@/lib/money";
import { TherapistGalleries } from "@/components/therapist-galleries";
import { usingDemoListings } from "@/lib/live-db";
import { demoReviewsForVendor } from "@/lib/demo-catalog";

export const dynamic = "force-dynamic";

export default async function ProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicVendor(slug);
  if (!data) notFound();
  const { vendor, description, services, galleries, videoLinks } = data;
  const verified = vendor.verificationStatus === "verified";
  const from = services.length ? Math.min(...services.map((s) => s.basePriceKobo)) : 0;
  let reviews: { author: string; rating: number; body: string }[] = [];
  if (usingDemoListings()) {
    reviews = demoReviewsForVendor(vendor.id).map((r) => ({ author: r.author, rating: r.rating, body: r.body }));
  } else {
    try {
      const { prisma } = await import("@/lib/db");
      const rows = await prisma.review.findMany({
        where: { vendorId: vendor.id, status: "published" },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 8
      });
      reviews = rows.map((r) => ({
        author: r.user.name.split(" ")[0] || "Guest",
        rating: r.rating,
        body: r.body
      }));
    } catch {
      reviews = [];
    }
  }
  const first = services[0];

  return (
    <div className="mx-auto max-w-7xl pb-24 lg:px-8 lg:pb-8">
      <div className="px-4 pt-4 lg:px-0 lg:pt-6">
        <TherapistGalleries
          galleries={galleries}
          videoLinks={videoLinks}
          coverUrl={"coverUrl" in vendor ? String(vendor.coverUrl || "") : undefined}
        />
      </div>
      <div className="mt-5 px-4 lg:grid lg:grid-cols-[1fr_22.5rem] lg:gap-10 lg:px-0">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {verified ? (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-leaf">
                <BadgeCheck className="h-4 w-4" aria-hidden /> Verified
              </span>
            ) : null}
          </div>
          <h1 className="mt-1 font-display text-[34px] font-semibold leading-tight text-ink md:text-4xl">{vendor.businessName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            {typeof vendor.ratingAvg === "number" && vendor.ratingAvg > 0 ? (
              <span className="inline-flex items-center gap-1 font-semibold text-ink">
                <Star className="h-4 w-4 fill-gold text-gold" aria-hidden />
                {vendor.ratingAvg.toFixed(1)}
                {vendor.reviewCount ? <span className="font-normal text-ink2">({vendor.reviewCount})</span> : null}
              </span>
            ) : null}
            <span className="flex items-center gap-1 text-ink2">
              <MapPin className="h-4 w-4 text-leaf" aria-hidden />
              {vendor.neighbourhood}, {vendor.city}
            </span>
          </div>
          <div className="mt-5">
            {hasPublicVendorContact(vendor) ? (
              <PublicVendorContact vendor={vendor} />
            ) : (
              <p className="flex items-start gap-2 rounded-2xl bg-bg2 px-4 py-3 text-xs text-ink2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
                Contact stays private on Free listings until you pay for a booking. Paid providers show WhatsApp, email and Instagram here.
              </p>
            )}
          </div>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-ink2">{description}</p>
          <h2 className="mt-8 font-display text-2xl font-semibold text-ink">Services</h2>
          <ul className="mt-3 space-y-3">
            {services.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card p-4">
                <div>
                  <p className="font-semibold text-ink">{s.name}</p>
                  <p className="text-sm text-goldink">
                    {formatNgn(s.basePriceKobo)} · {s.durationMin} min
                  </p>
                </div>
                <Link href={`/services/${encodeURIComponent(s.slug)}`} className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-ongold">
                  View spa service
                </Link>
              </li>
            ))}
          </ul>
          {reviews.length ? (
            <section className="mt-10">
              <h2 className="font-display text-2xl font-semibold text-ink">Reviews</h2>
              <ul className="mt-3 space-y-3">
                {reviews.map((r, i) => (
                  <li key={`${r.author}-${i}`} className="rounded-2xl border border-line bg-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-ink">{r.author}</p>
                      <span className="text-sm font-semibold">{r.rating}/5</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-ink">{r.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        {first ? (
          <aside className="mt-8 hidden lg:sticky lg:top-24 lg:mt-0 lg:block lg:self-start">
            <div className="rounded-3xl border border-line bg-card p-5">
              <p className="text-xs text-ink2">From</p>
              <p className="font-display text-3xl font-semibold text-goldink">{formatNgn(from)}</p>
              <Link href={`/services/${encodeURIComponent(first.slug)}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gold text-sm font-bold text-ongold">
                View spa service
              </Link>
            </div>
          </aside>
        ) : null}
      </div>
      {first ? (
        <div className="fixed inset-x-0 bottom-[64px] z-40 border-t border-line bg-bg/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="flex-1">
              <p className="text-xs text-ink2">From</p>
              <p className="font-bold text-goldink">{formatNgn(from)}</p>
            </div>
            <Link href={`/services/${encodeURIComponent(first.slug)}`} className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
              View spa service
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
