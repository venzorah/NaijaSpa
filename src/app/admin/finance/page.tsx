import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";

export default async function FinancePage() {
  const payments = await prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div>
      <h1 className="font-display text-3xl">Finance</h1>
      <p className="text-xs text-ink2">Only verified Paystack (or configured) payments are success. Initialized rows are not collected funds.</p>
      <ul className="mt-4 space-y-2 text-sm">
        {payments.map((p) => (
          <li key={p.id} className="rounded-xl border border-line bg-card p-3">
            {p.reference} · {p.purpose} · {p.status} · {formatNgn(p.amountKobo)}
          </li>
        ))}
      </ul>
    </div>
  );
}
