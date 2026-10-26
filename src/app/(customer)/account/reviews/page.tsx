import Link from "next/link";
import { redirect } from "next/navigation";
import { Star } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StarRating } from "@/components/star-rating";

export default async function Page() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/reviews");
  const [reviews, completed] = await Promise.all([
    prisma.review.findMany({
      where: { userId: user.id },
      include: { booking: { include: { service: true, vendor: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.booking.findMany({
      where: { customerId: user.id, status: "completed", review: { is: null } },
      include: { service: true, vendor: true }
    })
  ]);
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
      <PageHeader title="Reviews" subtitle="Only customers with completed bookings can review — keeping ratings genuine." />
      <h2 className="font-display text-2xl font-semibold text-ink">Waiting for your review</h2>
      {completed.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-bg2 p-4 text-sm text-ink2">You’re all caught up. Reviews unlock after each completed appointment.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {completed.map((b) => (
            <li key={b.id} className="rounded-3xl border border-gold/40 bg-card p-5">
              <p className="font-semibold text-ink">{b.service.name}</p>
              <p className="text-xs text-ink2">{b.vendor.businessName}</p>
              <Link
                href={`/account/bookings/${b.id}/review`}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-bold text-ongold"
              >
                <Star className="mr-1.5 h-4 w-4" aria-hidden /> Write a review
              </Link>
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-10 font-display text-2xl font-semibold text-ink">Your reviews</h2>
      <ul className="mt-4 space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-3xl border border-line bg-card p-5">
            <p className="font-semibold text-ink">{r.booking?.vendor.businessName ?? "NaijaSpa"}</p>
            <p className="text-xs text-ink2">{r.booking?.service.name ?? "Treatment"}</p>
            <div className="mt-1">
              <StarRating value={Number(r.rating) || 0} readOnly size="sm" />
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink">{r.body}</p>
            {r.booking?.service.slug ? (
              <Link href={`/services/${encodeURIComponent(r.booking.service.slug)}`} className="mt-3 inline-block text-sm font-semibold text-leaf">
                View on service page
              </Link>
            ) : null}
          </li>
        ))}
        {reviews.length === 0 ? <p className="text-sm text-ink2">No reviews posted yet.</p> : null}
      </ul>
    </div>
  );
}
