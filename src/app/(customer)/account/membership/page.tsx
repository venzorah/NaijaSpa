import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";

export default async function Page() {
  const user = await getSession();
  if (!user) redirect("/login");
  const plans = await prisma.membershipPlan.findMany({ where: { active: true } });
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-3xl">Membership</h1>
      <ul className="mt-4 space-y-3">
        {plans.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-card p-4">
            <p className="font-semibold">{p.name}</p>
            <p className="text-sm">{formatNgn(p.priceKobo)} / {p.interval}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
