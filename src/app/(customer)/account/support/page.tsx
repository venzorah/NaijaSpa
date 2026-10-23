import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function Page() {
  const user = await getSession();
  if (!user) redirect("/login");
  const tickets = await prisma.supportTicket.findMany({ where: { authorId: user.id } });
  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="font-display text-3xl">Support</h1>
      <ul className="mt-4 space-y-2">
        {tickets.map((t) => (
          <li key={t.id} className="rounded-2xl border border-line bg-card p-3">
            {t.subject} · {t.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
