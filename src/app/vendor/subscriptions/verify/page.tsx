import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { verifyPaystack } from "@/lib/payments";
import { VendorPageHeader } from "@/components/vendor/page-header";

export default async function VendorSubscriptionVerifyPage({
  searchParams
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const user = await getSession();
  if (!user?.vendorId) redirect("/login/vendor?next=/vendor/subscriptions");
  const query = await searchParams;
  const reference = query.reference || query.trxref;
  if (!reference) {
    return (
      <div>
        <VendorPageHeader title="Payment not found" description="Paystack did not return a reference." />
        <Link href="/vendor/subscriptions" className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
          Listing plans
        </Link>
      </div>
    );
  }
  const existing = await prisma.payment.findUnique({ where: { reference } });
  if (!existing || existing.purpose !== "subscription") redirect("/vendor/subscriptions");
  let status = existing.status;
  try {
    const verified = await verifyPaystack(reference);
    status = verified.status;
  } catch {
    /* webhook may still confirm */
  }
  const ok = status === "success";
  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/50 bg-gold/15">
          <Check className="h-10 w-10 text-goldink" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-4xl font-semibold text-ink">{ok ? "Listing plan updated" : "Payment still pending"}</h1>
        <p className="mt-2 max-w-sm text-sm text-ink2">
          {ok
            ? "Paystack confirmed this listing plan. Public contact and commission follow the new package."
            : "If you completed payment, wait a moment and refresh. The Paystack webhook will also activate the plan."}
        </p>
        <p className="mt-3 font-mono text-sm">{existing.reference} · {formatNgn(existing.amountKobo)}</p>
        <Link href="/vendor/subscriptions" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
          View listing plans
        </Link>
      </div>
    </div>
  );
}
