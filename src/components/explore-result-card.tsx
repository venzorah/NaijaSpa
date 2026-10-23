import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { formatNgn } from "@/lib/money";
import { listingPhotos } from "@/lib/photos";

export type ExploreResult = {
  service: {
    id: string;
    slug: string;
    name: string;
    imageUrl?: string | null;
  };
  vendor: {
    businessName: string;
    neighbourhood: string;
    city: string;
    state?: string;
    verificationStatus?: string;
    logoUrl?: string | null;
    coverUrl?: string | null;
    publicPhone?: string | null;
    publicWhatsapp?: string | null;
  };
  therapists: Array<{ id: string; name: string; gender: string }>;
  quote: {
    basePriceKobo: number;
    surchargeKobo: number;
    customerTotalKobo: number;
  };
};

export function ExploreResultCard({ result: r }: { result: ExploreResult }) {
  const { cover, avatar } = listingPhotos({
    imageUrl: r.service.imageUrl,
    coverUrl: r.vendor.coverUrl,
    logoUrl: r.vendor.logoUrl
  });
  const verified = r.vendor.verificationStatus === "verified";
  const place = [r.vendor.neighbourhood, r.vendor.city, "state" in r.vendor ? r.vendor.state : ""]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-line bg-card shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={cover} alt="" className="h-40 w-full object-cover sm:h-44" />
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatar} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold leading-snug">{r.vendor.businessName}</h2>
            <p className="mt-0.5 line-clamp-2 text-xs text-ink2">{r.service.name}</p>
          </div>
        </div>

        <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-ink2">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {place}
          {verified ? (
            <span className="inline-flex items-center gap-1">
              <BadgeCheck className="h-3.5 w-3.5 text-leaf" aria-hidden />
              Verified
            </span>
          ) : null}
        </p>
        <p className="mt-2 text-sm">
          {r.therapists.map((t) => `${t.name} (${t.gender || "unspecified"})`).join(" · ")}
        </p>
        <p className="mt-2 text-sm font-semibold text-goldink">
          {formatNgn(r.quote.basePriceKobo)}
          {r.quote.surchargeKobo > 0 ? ` + ${formatNgn(r.quote.surchargeKobo)} add-on` : ""} · total{" "}
          {formatNgn(r.quote.customerTotalKobo)}
        </p>
        {r.vendor.publicPhone && <p className="mt-1 text-xs">Phone {r.vendor.publicPhone}</p>}
        {r.vendor.publicWhatsapp && (
          <a className="mt-1 text-xs text-leaf" href={r.vendor.publicWhatsapp}>
            WhatsApp
          </a>
        )}
        <div className="mt-auto pt-4">
          <Link
            href={`/services/${r.service.slug}`}
            className="inline-flex min-h-10 items-center rounded-full bg-ink px-4 text-xs font-bold text-bg"
          >
            Book
          </Link>
        </div>
      </div>
    </article>
  );
}
