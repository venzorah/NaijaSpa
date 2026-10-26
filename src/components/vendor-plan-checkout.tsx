"use client";

import Link from "next/link";
import { ListingPlanCard } from "@/components/listing-plan-card";
import { vendorPlanCta, type VendorListingPlanView } from "@/lib/vendor-plans";

export function VendorPlanCheckout({
  plans,
  current,
  canPay
}: {
  plans: VendorListingPlanView[];
  current: { code: string; priceKobo: number } | null;
  canPay: boolean;
}) {
  return (
    <div>
      {!canPay ? <p className="mb-3 text-sm text-ink2">Only the spa owner can subscribe or upgrade.</p> : null}
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const cta = vendorPlanCta(plan, current);
          const currentCard = cta.kind === "current";
          const payHref = `/vendor/subscriptions/checkout?plan=${encodeURIComponent(plan.code)}`;
          return (
            <li key={plan.code}>
              <ListingPlanCard plan={plan} selected={currentCard} badge={currentCard ? "Current" : cta.kind === "upgrade" ? "Upgrade" : undefined}>
                {cta.kind === "current" || cta.kind === "free" ? (
                  <p className="mt-4 text-xs text-ink2">
                    {cta.kind === "current" ? "This is your active listing plan." : "Free is the default. Paid plans return here if you miss renewal."}
                  </p>
                ) : canPay ? (
                  <Link
                    href={payHref}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-full bg-gold px-4 text-sm font-bold text-ongold"
                  >
                    {cta.label}
                  </Link>
                ) : (
                  <p className="mt-4 text-xs text-ink2">Ask the spa owner to pay for this plan.</p>
                )}
              </ListingPlanCard>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
