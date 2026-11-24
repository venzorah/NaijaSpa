import { formatNgn } from "@/lib/money";

export function shopSalesKobo(regularKobo: number, salesKobo?: number) {
  return salesKobo && salesKobo > regularKobo ? salesKobo : 0;
}

export function ShopPrice({
  regularKobo,
  salesKobo = 0,
  size = "card"
}: {
  regularKobo: number;
  salesKobo?: number;
  size?: "card" | "pdp";
}) {
  const slashed = shopSalesKobo(regularKobo, salesKobo);
  const regularClass = size === "pdp" ? "font-display text-3xl text-goldink" : "text-[15px] font-bold text-goldink";
  const salesClass = size === "pdp" ? "text-base text-ink2" : "text-[11px] text-ink2";
  return (
    <p className={size === "pdp" ? "mt-5" : "mt-1.5 leading-tight"}>
      <span className={`block font-bold uppercase tracking-wide text-ink2 ${size === "pdp" ? "text-xs" : "text-[10px]"}`}>Regular</span>
      <span className={regularClass}>{formatNgn(regularKobo)}</span>
      {slashed ? (
        <span className={`mt-0.5 block ${salesClass}`}>
          <span className="font-semibold uppercase tracking-wide">Sales </span>
          <span className="line-through">{formatNgn(slashed)}</span>
        </span>
      ) : null}
    </p>
  );
}
