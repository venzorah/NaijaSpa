import { prisma } from "@/lib/db";

export default async function Page() {
  const tickets = await prisma.supportTicket.findMany({ include: { author: true } });
  return (
    <div>
      <h1 className="font-display text-3xl">Support</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {tickets.map((t) => (
          <li key={t.id} className="rounded-xl border border-line bg-card p-3">
            {t.subject} · {t.status} · {t.author.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
