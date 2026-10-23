import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";

export default async function Page() {
  const user = await getSession();
  const rows = await prisma.vendorEarning.findMany({ where: { vendorId: user?.vendorId || "" }, include: { booking: true } });
  return (
    <div>
      <h1 className="font-display text-3xl">Earnings</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((e) => (
          <li key={e.id} className="rounded-xl border border-line bg-card p-3">
            Payable {formatNgn(e.payableKobo)} · commission {formatNgn(e.commissionKobo)} · surcharge {formatNgn(e.surchargeKobo)} · {e.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
