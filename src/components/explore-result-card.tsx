"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Clock, Heart, MapPin, Star } from "lucide-react";
import { formatNgn } from "@/lib/money";
import { formatRating } from "@/lib/booking-ui";
import { listingPhotos } from "@/lib/photos";
import { PublicVendorContact } from "@/components/public-vendor-contact";

export type ExploreResult = {
  service: {
    id: string;
    slug: string;
    name: string;
    imageUrl?: string | null;
    durationMin?: number;
    category?: string;
    spaEnabled?: boolean;
    hotelEnabled?: boolean;
    homeEnabled?: boolean;
  };
  vendor: {
    id?: string;
    slug?: string;
    businessName: string;
    neighbourhood: string;
    city: string;
    state?: string;
    verificationStatus?: string;
    logoUrl?: string | null;
    coverUrl?: string | null;
    publicPhone?: string | null;
    publicWhatsapp?: string | null;
    publicEmail?: string | null;
    publicInstagram?: string | null;
    ratingAvg?: number;
    reviewCount?: number;
  };
  therapists: Array<{ id: string; name: string; gender: string }>;
  quote: {
    basePriceKobo: number;
    surchargeKobo: number;
    customerTotalKobo: number;
  };
  sponsored?: boolean;
  enhanced?: boolean;
  nextLabel?: string;
};

function tagsFor(r: ExploreResult) {
  const tags: string[] = [];
  if (r.service.category) tags.push(r.service.category.replace(/ treatments?$/i, ""));
  if (r.service.spaEnabled) tags.push("Studio");
  if (r.service.hotelEnabled) tags.push("Venue");
  if (r.service.homeEnabled) tags.push("Home");
  return tags.slice(0, 4);
}

export function ExploreResultCard({ result: r }: { result: ExploreResult }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const { avatar } = listingPhotos({
    imageUrl: r.service.imageUrl,
    coverUrl: r.vendor.coverUrl,
    logoUrl: r.vendor.logoUrl
  });
  const verified = r.vendor.verificationStatus === "verified";
  const place = [r.vendor.neighbourhood, r.vendor.city].filter(Boolean).join(", ");
  const title = r.therapists[0]?.name || r.vendor.businessName;
  const ratingLabel = formatRating(r.vendor.ratingAvg);
  const reviews = r.vendor.reviewCount ?? 0;
  const tags = tagsFor(r);
  const vip = Boolean(r.enhanced || r.sponsored);

  async function toggleSave() {
    try {
      const res = await fetch("/api/favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: r.vendor.id, serviceId: r.service.id })
      });
      if (res.status === 401) {
        router.push("/login?next=/account/favourites");
        return;
      }
      if (res.ok) setSaved(true);
    } catch {
      router.push("/login?next=/account/favourites");
    }
  }

  return (
    <article className="flex h-full flex-col rounded-[1.5rem] border border-line bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatar} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/services/${encodeURIComponent(r.service.slug)}`} className="min-w-0 break-words font-display text-xl leading-tight hover:text-goldink">
              {title}
            </Link>
            <button
              type="button"
              aria-label={saved ? "Saved" : "Save provider"}
              onClick={() => void toggleSave()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink2 hover:bg-elev"
            >
              <Heart className={`h-5 w-5 ${saved ? "fill-gold text-gold" : ""}`} />
            </button>
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm text-ink2">{r.service.name}</p>
        </div>
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {ratingLabel ? (
          <span className="inline-flex items-center gap-1 font-semibold">
            <Star className="h-4 w-4 fill-gold text-gold" aria-hidden />
            {ratingLabel}
            {reviews > 0 ? <span className="font-normal text-ink2">({reviews})</span> : null}
          </span>
        ) : null}
        {verified ? (
          <span className="inline-flex items-center gap-1 text-sm text-leaf">
            <BadgeCheck className="h-4 w-4" aria-hidden />
            Verified
          </span>
        ) : null}
      </p>

      {vip ? (
        <p className="mt-2 w-fit rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-goldink">
          VIP
        </p>
      ) : null}

      {tags.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-elev px-2.5 py-1 text-[11px] font-semibold text-ink2">
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink2">
        <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {place}
      </p>
      <PublicVendorContact vendor={r.vendor} variant="icons" />
      {r.nextLabel ? (
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink2">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {r.nextLabel}
        </p>
      ) : null}

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <p>
          <span className="text-lg font-bold">{formatNgn(r.quote.basePriceKobo)}</span>
          <span className="text-sm text-ink2"> / session</span>
        </p>
        <Link
          href={`/services/${encodeURIComponent(r.service.slug)}`}
          className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-sm font-bold text-bg"
        >
          View spa service
        </Link>
      </div>
    </article>
  );
}
