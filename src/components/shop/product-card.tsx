import Link from "next/link";
import { formatNgn } from "@/lib/money";

export function ProductCard({
  href,
  name,
  image,
  priceKobo,
  compareKobo,
  vendor,
  sponsored
}: {
  href: string;
  name: string;
  image: string;
  priceKobo: number;
  compareKobo?: number;
  vendor?: string;
  sponsored?: boolean;
}) {
  return (
    <Link href={href} className="group overflow-hidden rounded-[1.75rem] border border-line bg-card shadow-[0_1px_0_rgba(24,49,39,0.04)] transition hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md">
      <div className="relative overflow-hidden bg-elev">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-52 w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        {sponsored ? (
          <span className="absolute left-3 top-3 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ongold">Sponsored</span>
        ) : null}
      </div>
      <div className="p-4">
        {vendor ? <p className="text-[11px] font-semibold uppercase tracking-wide text-ink2">{vendor}</p> : null}
        <h3 className="mt-1 font-semibold leading-snug">{name}</h3>
        <p className="mt-2 text-base font-bold text-goldink">
          {formatNgn(priceKobo)}
          {compareKobo && compareKobo > priceKobo ? <span className="ml-2 text-xs font-normal text-ink2 line-through">{formatNgn(compareKobo)}</span> : null}
        </p>
      </div>
    </Link>
  );
}
