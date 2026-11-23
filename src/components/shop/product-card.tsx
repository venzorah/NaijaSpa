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
    <Link href={href} className="overflow-hidden rounded-3xl border border-line bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="" className="h-44 w-full object-cover" />
      <div className="p-4">
        {sponsored ? <p className="text-[10px] font-bold uppercase tracking-wide text-goldink">Sponsored</p> : null}
        <h3 className="font-semibold">{name}</h3>
        {vendor ? <p className="mt-1 text-xs text-ink2">{vendor}</p> : null}
        <p className="mt-2 font-bold text-goldink">
          {formatNgn(priceKobo)}
          {compareKobo && compareKobo > priceKobo ? <span className="ml-2 text-xs font-normal text-ink2 line-through">{formatNgn(compareKobo)}</span> : null}
        </p>
      </div>
    </Link>
  );
}
