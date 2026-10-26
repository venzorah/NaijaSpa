import Link from "next/link";
import { BadgeCheck, CalendarCheck, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ListingPlanCard } from "@/components/listing-plan-card";
import { listPublicVendorPlans } from "@/lib/vendor-plans-live";
import { LIVE_VENDOR_PLANS } from "@/lib/vendor-plans";

export default async function BecomeVendorPage() {
  let plans = LIVE_VENDOR_PLANS.map((p) => ({
    code: p.code,
    name: p.name,
    priceKobo: p.priceKobo,
    durationDays: p.durationDays,
    commissionBps: p.commissionBps,
    publicDirectContact: p.publicDirectContact,
    enhancedVisibility: p.enhancedVisibility,
    sponsoredEligible: p.sponsoredEligible
  }));
  try {
    plans = await listPublicVendorPlans();
  } catch {
    /* keep defaults */
  }
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 lg:px-8">
      <PageHeader title="Become a vendor" subtitle="Therapist listing plans for spas and independent practitioners. These are not customer booking memberships." />
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
      <h2 className="mt-10 font-display text-2xl font-semibold text-ink">Listing plans</h2>
      <p className="mt-2 text-sm text-ink2">Choose Free at signup, then subscribe or upgrade from your vendor dashboard.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <ListingPlanCard key={plan.code} plan={plan} />
        ))}
      </div>
      <div className="mt-8 rounded-3xl border border-gold/40 bg-card p-6">
        <h2 className="font-display text-2xl font-semibold">Apply to join</h2>
        <p className="mt-2 text-sm text-ink2">Create a therapist account, pick a listing plan during onboarding, then wait for admin approval. You can upgrade any time after signup.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/register?asVendor=1" className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
            Create a therapist account
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
