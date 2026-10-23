import { prisma } from "@/lib/db";

export default async function Page() {
  const rows = await prisma.campaign.findMany({ include: { vendor: true } });
  return (
    <div>
      <h1 className="font-display text-3xl">Sponsored campaigns</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((c) => (
          <li key={c.id} className="rounded-xl border border-line bg-card p-3">
            {c.vendor.businessName} · {c.placement} · {c.active ? "active" : "paused"} · {c.impressions} imps
          </li>
        ))}
      </ul>
    </div>
  );
}
