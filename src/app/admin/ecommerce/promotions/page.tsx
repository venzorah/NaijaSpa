import { prisma } from "@/lib/db";

export default async function EcommercePromotionsPage() {
  const promotions = await prisma.shopPromotion.findMany({ orderBy: { startsAt: "desc" } });
  return (
    <div>
      <h1 className="font-display text-3xl">Promotions</h1>
      <ul className="mt-6 space-y-2 text-sm">
        {promotions.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-card px-4 py-3">{p.label} · {p.kind} · {p.active ? "on" : "off"}</li>
        ))}
      </ul>
    </div>
  );
}
