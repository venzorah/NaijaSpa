import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function FavPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/favourites");
  const items = await prisma.favourite.findMany({ where: { userId: user.id }, include: { service: true } });
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-3xl">Favourites</h1>
      <ul className="mt-4 space-y-2">
        {items.map((i) => (
          <li key={i.id} className="rounded-2xl border border-line bg-card p-3">
            {i.service?.name || i.vendorId}
          </li>
        ))}
        {items.length === 0 && <p className="text-ink2">No saved providers yet.</p>}
      </ul>
    </div>
  );
}
