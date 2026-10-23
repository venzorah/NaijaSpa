import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { formatNgn } from "@/lib/money";

export default async function VendorHome() {
  const user = await getSession();
  const vendorId = user?.vendorId;
  if (!vendorId) return <p>No vendor profile.</p>;
  const [vendor, bookings, earnings] = await Promise.all([
    prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } }),
    prisma.booking.findMany({ where: { vendorId }, include: { service: true }, orderBy: { startsAt: "asc" }, take: 8 }),
    prisma.vendorEarning.findMany({ where: { vendorId } })
  ]);
  const ent = await vendorEntitlement(vendorId);
  const payable = earnings.reduce((s, e) => s + e.payableKobo, 0);
  return (
    <div>
      <h1 className="font-display text-3xl">{vendor.businessName}</h1>
      <p className="text-ink2">
        Plan {ent.planCode} · commission {ent.commissionBps / 100}% · public contact {ent.publicDirectContact ? "on" : "off"}
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-ink2">Today’s bookings</p>
          <p className="text-2xl font-bold">{bookings.length}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-ink2">Payable</p>
          <p className="text-2xl font-bold">{formatNgn(payable)}</p>
        </div>
        <div className="rounded-2xl border border-line bg-card p-4">
          <p className="text-xs text-ink2">Status</p>
          <p className="text-2xl font-bold">{vendor.applicationStatus}</p>
        </div>
      </div>
      <ul className="mt-6 space-y-2">
        {bookings.map((b) => (
          <li key={b.id} className="rounded-2xl border border-line bg-card p-3 text-sm">
            {b.service.name} · {b.status} · {b.locationType}
          </li>
        ))}
      </ul>
    </div>
  );
}
