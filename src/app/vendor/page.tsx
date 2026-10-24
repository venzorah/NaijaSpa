import Link from "next/link";
import { CalendarCheck2, Crown, Lock, MessageCircle, Phone, Star, Wallet } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { formatNgn } from "@/lib/money";

function greeting() {
  const hour = (new Date().getUTCHours() + 1) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function VendorHome() {
  const user = await getSession();
  const vendorId = user?.vendorId;
  if (!vendorId) return <p>No vendor profile.</p>;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [vendor, bookings, earnings] = await Promise.all([
    prisma.vendor.findUniqueOrThrow({ where: { id: vendorId } }),
    prisma.booking.findMany({
      where: { vendorId, startsAt: { gte: start } },
      include: { service: true, staff: true, customer: true },
      orderBy: { startsAt: "asc" },
      take: 12
    }),
    prisma.vendorEarning.findMany({ where: { vendorId } })
  ]);
  const ent = await vendorEntitlement(vendorId);
  const payable = earnings.reduce((s, e) => s + e.payableKobo, 0);
  const firstName = user?.name.split(" ")[0] || "there";
  const paid = ent.activePaid;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-goldink">{vendor.businessName}</p>
          <h1 className="font-display text-3xl font-semibold">
            {greeting()}, {firstName}
          </h1>
          <p className="text-sm text-ink2">Today’s bookings, payouts and plan status.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/vendor/onboarding" className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-semibold">
            Profile
          </Link>
          <Link href="/vendor/bookings" className="inline-flex min-h-11 items-center rounded-full bg-gold px-4 text-sm font-bold text-ongold">
            View bookings
          </Link>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Today’s bookings" value={String(bookings.length)} icon={CalendarCheck2} hint="On the calendar from midnight" />
        <Stat label="Payable" value={formatNgn(payable)} icon={Wallet} hint={paid ? "0% commission" : `after ${ent.commissionBps / 100}% commission`} accent />
        <Stat label="Rating" value={vendor.ratingAvg.toFixed(1)} icon={Star} hint={`${vendor.reviewCount} reviews`} />
        <Stat label="Plan" value={ent.planCode} icon={Crown} hint={paid ? "Public contact on" : "Public contact hidden"} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <section className="overflow-hidden rounded-3xl border border-line bg-card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="text-base font-semibold">Today’s schedule</h2>
              <p className="text-sm text-ink2">{bookings.length} appointments</p>
            </div>
            <Link href="/vendor/bookings" className="text-sm font-semibold text-goldink">
              Open inbox
            </Link>
          </div>
          {bookings.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink2">No bookings starting today yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {bookings.map((b) => (
                <li key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-16 shrink-0">
                    <p className="font-mono text-sm font-medium">
                      {b.startsAt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-[11px] text-ink2">{b.locationType}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.service.name}</p>
                    <p className="truncate text-xs text-ink2">
                      {b.customer.name} · {b.staff?.name || "Any therapist"} · {b.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-4">
          <section className="rounded-3xl border border-line bg-card px-5 py-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Subscription</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${paid ? "bg-gold/15 text-goldink" : "bg-elev text-ink2"}`}>
                {paid ? "Active" : "Free"}
              </span>
            </div>
            <p className="mt-3 font-medium">{paid ? `${ent.planCode} plan` : "Free plan"}</p>
            <p className="text-xs text-ink2">{paid ? "0% commission while active" : "10% commission on each booking"}</p>
            <Link href="/vendor/subscriptions" className="mt-4 inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-semibold">
              {paid ? "Manage subscription" : "Compare paid plans"}
            </Link>
          </section>

          <section className="rounded-3xl border border-line bg-card px-5 py-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Public contact</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ent.publicDirectContact ? "bg-gold/15 text-goldink" : "bg-elev text-ink2"}`}>
                {ent.publicDirectContact ? "Visible" : "Hidden"}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {[
                { icon: Phone, label: "Phone", value: vendor.privatePhone },
                { icon: MessageCircle, label: "WhatsApp", value: vendor.privateWhatsapp }
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3 rounded-lg bg-elev px-3 py-2">
                  <c.icon className="h-4 w-4 text-ink2" aria-hidden />
                  <span className="text-xs text-ink2">{c.label}</span>
                  <span className="ml-auto font-mono text-xs">{ent.publicDirectContact ? c.value || "Not set" : "+234 ••• ••• ••••"}</span>
                  {!ent.publicDirectContact ? <Lock className="h-3.5 w-3.5 text-ink2" aria-hidden /> : null}
                </div>
              ))}
            </div>
            {!paid ? (
              <Link href="/vendor/subscriptions" className="mt-3 inline-flex min-h-10 items-center rounded-full bg-gold px-4 text-sm font-bold text-ongold">
                Unlock public contact
              </Link>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  hint,
  accent
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-line bg-card px-5 py-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-ink2">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ? "bg-gold/15 text-goldink" : "bg-forest/10 text-forest"}`}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 font-display text-[28px] font-medium leading-none">{value}</p>
      {hint ? <p className="mt-2 text-xs text-ink2">{hint}</p> : null}
    </div>
  );
}
