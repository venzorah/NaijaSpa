import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Crown } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { parseBenefits } from "@/lib/membership";
import { PageHeader } from "@/components/page-header";

export default async function Page() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/membership");
  const [plans, membership] = await Promise.all([
    prisma.membershipPlan.findMany({ where: { active: true } }),
    prisma.customerMembership.findFirst({ where: { userId: user.id, status: "active" }, include: { plan: true } })
  ]);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 lg:px-8">
      <PageHeader title="Membership" subtitle="Save on every booking and earn rewards." />
      <section className="relative overflow-hidden rounded-3xl border border-gold/40 bg-forest p-6 text-white">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full border border-gold/30" aria-hidden />
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#E3C766]">
          <Crown className="h-4 w-4" aria-hidden />
          Active plan
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold">{membership?.plan.name ?? "Free"}</h2>
        <p className="text-sm text-white/80">{membership ? "Paid via Paystack" : "No paid membership yet."}</p>
      </section>
      <h2 className="mt-10 font-display text-2xl font-semibold text-ink">Compare plans</h2>
      {plans.length === 0 ? (
        <p className="mt-4 text-sm text-ink2">Membership plans will appear here once an admin publishes them.</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const current = membership?.planId === p.id;
            return (
              <article key={p.id} className="relative flex flex-col rounded-3xl border border-line bg-card p-5">
                <h3 className="font-display text-2xl font-semibold text-ink">{p.name}</h3>
                <p className="mt-1">
                  <span className="text-3xl font-bold text-ink">{formatNgn(p.priceKobo)}</span>{" "}
                  <span className="text-sm text-ink2">/ {p.interval}</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {parseBenefits(p.benefits).map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-sm text-ink2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
                      {perk}
                    </li>
                  ))}
                </ul>
                <Link
                  href={current ? "/account/payments" : "/explore"}
                  className={`mt-5 inline-flex min-h-11 items-center justify-center rounded-full text-sm font-bold ${
                    current ? "border border-line" : "bg-gold text-ongold"
                  }`}
                >
                  {current ? "Current plan" : "Browse treatments"}
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
