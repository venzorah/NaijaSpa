import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { WhatsAppSupport } from "@/components/whatsapp-support";

export default async function Page() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/support");
  const tickets = await prisma.supportTicket.findMany({
    where: { authorId: user.id },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { updatedAt: "desc" }
  });
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
      <PageHeader
        title="Support"
        subtitle="Tickets, or WhatsApp as an alternative. We usually reply within 2 hours, 8 AM – 10 PM daily."
        right={
          <Link href="/contact" className="inline-flex min-h-11 items-center rounded-full bg-gold px-4 text-sm font-bold text-ongold">
            <Plus className="mr-1 h-4 w-4" aria-hidden /> New
          </Link>
        }
      />
      <WhatsAppSupport prefill="Hello NaijaSpa, I need help with my booking or account." />
      <ul className="space-y-2">
        {tickets.map((t) => (
          <li key={t.id}>
            <div className="flex w-full items-center gap-3 rounded-3xl border border-line bg-card p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-ink2">{t.id.slice(0, 8)}</span>
                  <StatusPill status={t.status} />
                </div>
                <p className="mt-1 truncate font-semibold text-ink">{t.subject}</p>
                <p className="truncate text-xs text-ink2">{t.messages[0]?.body}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-ink2" aria-hidden />
            </div>
          </li>
        ))}
        {tickets.length === 0 ? (
          <p className="rounded-3xl border border-line bg-card p-6 text-sm text-ink2">
            No tickets yet. Use Contact, or WhatsApp, to reach concierge.
          </p>
        ) : null}
      </ul>
    </div>
  );
}
