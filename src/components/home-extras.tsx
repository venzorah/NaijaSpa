import Link from "next/link";
import { ArrowRight, Headphones, MessageCircle, Store } from "lucide-react";
import { PHOTOS } from "@/lib/photos";

const STEPS = [
  { title: "Discover", text: "Browse verified spas and treatments in your city, or describe what you need to Ask NaijaSpa AI." },
  { title: "Book a slot", text: "Choose spa, hotel or home, pick a time, and see the full price in Naira before you pay." },
  { title: "Pay with Paystack", text: "Card, bank, USSD or transfer. Your booking confirms only after Paystack verifies the charge." },
  { title: "Unwind", text: "Show up, enjoy the treatment, then leave a review — only completed bookings can rate." }
];

export function HomeExtras() {
  return (
    <>
      <section className="mx-auto mt-14 max-w-7xl px-4 lg:px-8" aria-labelledby="how-it-works">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Simple & secure</p>
        <h2 id="how-it-works" className="font-display text-lg font-semibold text-ink">
          How NaijaSpa works
        </h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-3xl border border-line bg-card p-5">
              <span className="font-display text-lg font-semibold text-goldink">0{i + 1}</span>
              <h3 className="mt-2 font-semibold text-ink">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink2">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-14 max-w-7xl px-4 lg:px-8" aria-labelledby="vendor-cta">
        <div className="grid overflow-hidden rounded-[32px] border border-line bg-card md:grid-cols-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PHOTOS.packages} alt="" className="h-48 w-full object-cover md:h-full" />
          <div className="p-6 md:p-10">
            <Store className="h-7 w-7 text-leaf" aria-hidden />
            <h2 id="vendor-cta" className="mt-3 font-display text-lg font-semibold text-ink">
              Run a spa or mobile practice?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink2">
              List your services on NaijaSpa, get verified, manage bookings and get paid securely via Paystack.
            </p>
            <Link href="/become-a-vendor" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
              Become a vendor <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-7xl px-4 lg:px-8" aria-label="Support">
        <div className="flex flex-col items-start gap-4 rounded-3xl border border-line bg-bg2 p-5 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-leaf/15 text-leaf">
            <Headphones className="h-6 w-6" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-ink">Need a hand?</h2>
            <p className="text-sm text-ink2">Our Lagos-based support team is here 8 AM – 10 PM, every day.</p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Link
              href="/faq"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-gold/50 px-5 text-sm font-bold text-goldink sm:flex-none"
            >
              FAQs
            </Link>
            <Link
              href="/account/support"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-gold px-5 text-sm font-bold text-ongold sm:flex-none"
            >
              <MessageCircle className="mr-1 h-4 w-4" aria-hidden /> Get support
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
