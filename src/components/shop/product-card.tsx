import Link from "next/link";
import { Star } from "lucide-react";
import { formatNgn } from "@/lib/money";

export function ProductCard({
  href,
  name,
  image,
  priceKobo,
  compareKobo,
  vendor,
  category,
  ratingAvg = 0,
  reviewCount = 0,
  sponsored
}: {
  href: string;
  name: string;
  image: string;
  priceKobo: number;
  compareKobo?: number;
  vendor?: string;
  category?: string;
  ratingAvg?: number;
  reviewCount?: number;
  sponsored?: boolean;
}) {
  const stars = Math.round(ratingAvg);
  return (
    <Link href={href} className="group overflow-hidden rounded-2xl border border-line bg-card shadow-[0_1px_0_rgba(24,49,39,0.04)] transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md sm:rounded-[1.75rem]">
      <div className="relative overflow-hidden bg-elev">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="aspect-square h-auto w-full object-cover transition duration-500 group-hover:scale-[1.04] sm:aspect-auto sm:h-52" />
        {sponsored ? (
          <span className="absolute left-3 top-3 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ongold">Sponsored</span>
        ) : null}
      </div>
      <div className="p-3 sm:p-4">
        {category ? <p className="text-[10px] font-bold uppercase tracking-wide text-goldink">{category}</p> : null}
        {vendor ? <p className="text-[11px] font-semibold uppercase tracking-wide text-ink2">{vendor}</p> : null}
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{name}</h3>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-ink2" aria-label={reviewCount ? `${ratingAvg.toFixed(1)} out of 5 from ${reviewCount} reviews` : "No reviews yet"}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star key={n} className={`h-3 w-3 ${n <= stars && reviewCount ? "fill-gold text-gold" : "text-line"}`} aria-hidden />
          ))}
          <span>{reviewCount ? `${ratingAvg.toFixed(1)} (${reviewCount})` : "New"}</span>
        </p>
        <p className="mt-2 text-base font-bold text-goldink">
          {formatNgn(priceKobo)}
          {compareKobo && compareKobo > priceKobo ? <span className="ml-2 text-xs font-normal text-ink2 line-through">{formatNgn(compareKobo)}</span> : null}
        </p>
      </div>
    </Link>
  );
}
