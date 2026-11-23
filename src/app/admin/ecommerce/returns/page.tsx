import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { shopQuery } from "@/lib/shop/safe-query";

export default async function EcommerceReturnsPage() {
  const rows = await shopQuery(
    () => prisma.shopReturn.findMany({ include: { vendorOrder: true, user: { select: { email: true } } }, orderBy: { createdAt: "desc" } }),
    []
  );
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Care</p>
      <h1 className="mt-1 font-display text-3xl">Returns</h1>
      <ul className="mt-6 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-3xl border border-line bg-card p-4 text-sm">
            <p className="font-semibold">{r.vendorOrder.number} · {r.status}</p>
            <p>{r.reason}</p>
            <p className="text-ink2">{r.user.email} · refund {formatNgn(r.refundKobo)}</p>
          </li>
        ))}
        {!rows.length ? <li className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink2">No return requests.</li> : null}
      </ul>
    </div>
  );
}
