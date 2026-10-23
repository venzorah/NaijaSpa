import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";

export default async function Page() {
  const user = await getSession();
  if (!user) redirect("/login");
  const payments = await prisma.payment.findMany({
    where: { booking: { customerId: user.id } },
    orderBy: { createdAt: "desc" }
  });
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-3xl">Payments</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {payments.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-card p-3">
            {p.reference} · {p.status} · {formatNgn(p.amountKobo)}
          </li>
        ))}
      </ul>
    </div>
  );
}
