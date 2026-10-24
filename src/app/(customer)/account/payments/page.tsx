import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";

export default async function Page() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/payments");
  const payments = await prisma.payment.findMany({
    where: { booking: { customerId: user.id } },
    include: { booking: { include: { service: true } } },
    orderBy: { createdAt: "desc" }
  });
  const spent = payments.filter((p) => p.status === "success").reduce((s, p) => s + p.amountKobo, 0);
  const refunded = payments.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amountKobo, 0);
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
      <PageHeader title="Payments" subtitle="All payments are processed securely by Paystack." />
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-line bg-card p-4">
          <p className="text-xs text-ink2">Collected</p>
          <p className="mt-1 text-2xl font-bold text-ink">{formatNgn(spent)}</p>
        </div>
        <div className="rounded-3xl border border-line bg-card p-4">
          <p className="text-xs text-ink2">Refunded</p>
          <p className="mt-1 text-2xl font-bold text-ink">{formatNgn(refunded)}</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2">
        {payments.map((p) => (
          <li key={p.id} className="rounded-3xl border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{p.booking?.service.name || p.purpose}</p>
                <p className="text-xs text-ink2">{p.createdAt.toLocaleString("en-NG")} · {p.provider}</p>
                <p className="font-mono text-[11px] text-ink2">{p.reference}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-ink">{formatNgn(p.amountKobo)}</p>
                <StatusPill status={p.status} />
              </div>
            </div>
          </li>
        ))}
        {payments.length === 0 ? <p className="text-sm text-ink2">No payments yet.</p> : null}
      </ul>
    </div>
  );
}
