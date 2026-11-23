import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";

export default async function EcommerceReturnsPage() {
  const rows = await prisma.shopReturn.findMany({ include: { vendorOrder: true, user: { select: { email: true } } }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <h1 className="font-display text-3xl">Returns</h1>
      <ul className="mt-6 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-3xl border border-line bg-card p-4 text-sm">
            <p className="font-semibold">{r.vendorOrder.number} · {r.status}</p>
            <p>{r.reason}</p>
            <p className="text-ink2">{r.user.email} · refund {formatNgn(r.refundKobo)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
