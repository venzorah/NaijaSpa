import { notFound } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Heart, MapPin, Star } from "lucide-react";
import { getPublicService } from "@/lib/catalog";
import { publicWellnessPhoto } from "@/lib/photos";
import { formatReviewDate, locationLabel } from "@/lib/booking-ui";
import { StarRating } from "@/components/star-rating";
import { ServiceBookingCard } from "@/components/service-booking-card";
import { VendorProfileGallery } from "@/components/vendor-profile-gallery";
import { collectProfileGalleryImages } from "@/lib/galleries";

export const dynamic = "force-dynamic";

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicService(slug);
  if (!data) notFound();
  const { service, vendor, quotes, treatments, reviews, tags, galleries = [] } = data;
  const galleryImages = collectProfileGalleryImages(galleries, [
    service.imageUrl,
    "coverUrl" in vendor ? String(vendor.coverUrl || "") : ""
  ]);
  const verified = vendor.verificationStatus === "verified";
  const photo = publicWellnessPhoto(
    service.imageUrl || (vendor.logoUrl && !vendor.logoUrl.includes("icon-white") ? vendor.logoUrl : null),
    "/brand/icon-green.png"
  );
  const locationLine = [vendor.neighbourhood, vendor.city].filter(Boolean).join(", ");
  const offered = quotes.map((q) => locationLabel(q.l)).join(" · ");

  return (
    <div className="bg-bg2">
      {galleryImages.length ? (
        <div className="px-4 pt-4 lg:hidden">
          <VendorProfileGallery images={galleryImages} heading="" />
        </div>
      ) : (
        <div className="relative h-40 overflow-hidden sm:h-56 lg:hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg2 via-transparent to-black/20" />
        </div>
      )}
      <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-4 sm:py-8 lg:px-8 lg:py-12">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22.5rem)] lg:items-start lg:gap-12">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt=""
              className="hidden h-28 w-28 shrink-0 rounded-full object-cover ring-4 ring-card sm:block sm:h-32 sm:w-32"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink2">
                    {verified && (
                      <span className="inline-flex items-center gap-1 text-leaf">
                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                        Verified
                      </span>
                    )}
                  </p>
                  <h1 className="mt-1 font-display text-3xl leading-tight sm:text-5xl">{vendor.businessName}</h1>
                  <p className="mt-1 text-base text-ink2">{service.name}</p>
                </div>
                <Link
                  href="/account/favourites"
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm font-semibold"
                >
                  <Heart className="h-4 w-4" aria-hidden />
                  Save
                </Link>
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink2">
                {typeof vendor.ratingAvg === "number" && vendor.ratingAvg > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-ink">
                    <Star className="h-4 w-4 fill-gold text-gold" aria-hidden />
                    {vendor.ratingAvg.toFixed(1)}
                    {vendor.reviewCount ? (
                      <span className="font-normal text-ink2">({vendor.reviewCount})</span>
                    ) : null}
                  </span>
                )}
                {locationLine && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-4 w-4" aria-hidden />
                    {locationLine}
                  </span>
                )}
              </p>
            </div>
          </header>

          <div className="min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-4">
            <ServiceBookingCard
              serviceId={service.id}
              treatments={treatments}
              currentSlug={service.slug}
              durationMin={service.durationMin}
              quotes={quotes}
              cancellationPolicy={"cancellationPolicy" in vendor ? String(vendor.cancellationPolicy || "") : ""}
            />
          </div>

          {galleryImages.length ? (
            <div className="hidden lg:block">
              <VendorProfileGallery images={galleryImages} />
            </div>
          ) : null}

          <dl className="grid grid-cols-2 gap-6 border-y border-line py-6 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-ink2">Reviews</dt>
              <dd className="mt-1 font-display text-3xl">{vendor.reviewCount || reviews.length || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-ink2">Duration</dt>
              <dd className="mt-1 font-display text-3xl">{service.durationMin} min</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-ink2">Rating</dt>
              <dd className="mt-1 font-display text-3xl">
                {vendor.ratingAvg ? vendor.ratingAvg.toFixed(1) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-ink2">Locations</dt>
              <dd className="mt-1 font-display text-3xl">{quotes.length || "—"}</dd>
              {offered ? <p className="mt-1 text-[11px] leading-snug text-ink2">{offered}</p> : null}
            </div>
          </dl>

          <section>
            <h2 className="font-display text-3xl">About</h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink2">
              {service.description || vendor.description || `${vendor.businessName} offers this treatment on NaijaSpa.`}
            </p>
            {tags.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <li key={tag} className="rounded-full bg-card px-3 py-1.5 text-sm text-ink2 ring-1 ring-line">
                    {tag}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-sm">
              <Link href={`/providers/${encodeURIComponent(vendor.slug)}`} className="font-semibold text-leaf">
                View provider
              </Link>
              {vendor.publicPhone || vendor.publicWhatsapp ? (
                <span className="text-ink2">
                  {vendor.publicPhone ? ` · ${vendor.publicPhone}` : ""}
                  {vendor.publicWhatsapp ? (
                    <>
                      {" · "}
                      <a className="text-leaf" href={vendor.publicWhatsapp}>
                        WhatsApp
                      </a>
                    </>
                  ) : null}
                </span>
              ) : (
                <span className="ml-2 text-xs text-ink2">Direct phone is hidden. Book through NaijaSpa.</span>
              )}
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl font-semibold">Reviews {reviews.length ? `(${reviews.length})` : ""}</h2>
            {reviews.length === 0 ? (
              <p className="mt-3 text-sm text-ink2">No published reviews yet for this service. Reviews unlock after a customer confirms they received it.</p>
            ) : (
              <ul className="mt-5 space-y-4">
                {reviews.map((r) => (
                  <li key={`${r.author}-${r.createdAt}`} className="rounded-[1.4rem] border border-line bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{r.author}</p>
                        <div className="mt-1">
                          <StarRating value={Math.round(r.rating)} readOnly size="sm" />
                        </div>
                      </div>
                      <p className="text-sm text-ink2">{formatReviewDate(r.createdAt)}</p>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink2">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
