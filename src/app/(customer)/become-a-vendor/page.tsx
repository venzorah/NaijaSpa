import Link from "next/link";
import { BadgeCheck, CalendarCheck, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export default function BecomeVendorPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-8">
      <PageHeader title="Become a vendor" subtitle="Grow your spa or mobile practice with NaijaSpa." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [Users, "Reach new clients", "Wellness seekers in Lagos, Abuja, Port Harcourt, Delta and Anambra."],
          [CalendarCheck, "Bookings in the app", "Manage services, galleries and appointments."],
          [Wallet, "Paid via Paystack", "Payouts after verified payments."],
          [BadgeCheck, "Get verified", "Stand out with the Verified badge."]
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Users;
          return (
            <div key={t as string} className="rounded-3xl border border-line bg-card p-5">
              <I className="h-6 w-6 text-leaf" aria-hidden />
              <p className="mt-3 font-semibold text-ink">{t as string}</p>
              <p className="mt-1 text-sm text-ink2">{d as string}</p>
            </div>
          );
        })}
      </div>
      <h2 className="mt-10 font-display text-2xl font-semibold text-ink">Plans</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-line bg-card p-5">
          <p className="font-display text-2xl font-semibold text-ink">Free listing</p>
          <p className="text-sm text-ink2">Commission on each verified booking, set by NaijaSpa commercial settings.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-ink2">
            <li>✓ Profile, galleries and services</li>
            <li>✓ In-app bookings</li>
            <li>✓ Paystack payouts after verification</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-gold bg-card p-5">
          <p className="font-display text-2xl font-semibold text-ink">Paid plan</p>
          <p className="text-sm text-ink2">Lower commission, public phone & WhatsApp, and eligibility for sponsored placement.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-ink2">
            <li>✓ Everything in Free</li>
            <li>✓ Public contact buttons when entitled</li>
            <li>✓ Enhanced visibility</li>
          </ul>
        </div>
      </div>
      <div className="mt-8 rounded-3xl border border-gold/40 bg-card p-6">
        <h2 className="font-display text-2xl font-semibold">Apply to join</h2>
        <p className="mt-2 text-sm text-ink2">Create a therapist account, complete onboarding, then wait for admin approval.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/register" className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
            Create an account
          </Link>
          <Link href="/login/vendor" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold">
            Vendor sign in
          </Link>
          <Link href="/vendor/onboarding" className="inline-flex min-h-11 items-center rounded-full border border-gold/50 px-5 text-sm font-semibold text-goldink">
            Open onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}
