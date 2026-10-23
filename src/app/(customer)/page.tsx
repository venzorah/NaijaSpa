import Link from "next/link";
import { MapPin, Sparkles } from "lucide-react";
import { getHomeCatalog, usingDemoListings } from "@/lib/catalog";
import { ServiceCarousel, VendorCarousel } from "@/components/service-carousel";

export const dynamic = "force-dynamic";

function greeting() {
  const hour = (new Date().getUTCHours() + 1) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const { categories, rails, nearby, faqs } = await getHomeCatalog();
  const demo = usingDemoListings();

  return (
    <div>
      {demo && (
        <p className="border-b border-gold/30 bg-gold/10 px-4 py-2 text-center text-xs text-goldink">
          Preview listings are showing until a live database is connected on this host. They are removed automatically when{" "}
          <code>DATABASE_URL</code> points at production Postgres.
        </p>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-4 pt-6 lg:px-8">
        <p className="text-sm text-ink2">{greeting()},</p>
        <h1 className="font-display text-4xl font-semibold leading-tight md:text-6xl">Find your calm.</h1>
        <p className="mt-3 max-w-xl text-ink2">
          Verified spas, massage therapists and wellness studios. Book Spa/Office, hotel or home visits in Naira.
        </p>
        <Link
          href="/explore?city=Lagos"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold"
        >
          <MapPin className="h-4 w-4 text-goldink" />
          Lagos · change location
        </Link>
        <form action="/explore" className="mt-4 flex flex-col gap-2 rounded-3xl border border-line bg-card p-3 sm:flex-row">
          <input name="q" placeholder="Search massage, therapist, spa…" className="min-h-12 flex-1 rounded-2xl bg-elev px-4 text-sm outline-none" />
          <input name="city" placeholder="Lagos" defaultValue="Lagos" className="min-h-12 rounded-2xl bg-elev px-4 text-sm outline-none sm:w-40" />
          <button className="min-h-12 rounded-full bg-gold px-6 text-sm font-bold text-ongold">Search</button>
        </form>
      </section>

      <section className="mx-auto max-w-7xl">
        <h2 className="px-4 font-display text-2xl lg:px-8">Quick categories</h2>
        <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:px-8">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/explore?category=${c.slug}`}
              className="shrink-0 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 lg:px-8">
        <Link
          href="/ai"
          className="flex items-start gap-3 rounded-3xl border border-gold/40 bg-gold/10 p-5"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold text-ongold">
            <Sparkles className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold">Ask NaijaSpa AI</span>
            <span className="mt-1 block text-sm text-ink2">Describe how you feel. We match you to a verified treatment.</span>
          </span>
        </Link>
      </section>

      <ServiceCarousel
        id="featured-services"
        title="Featured"
        subtitle="Hand-picked treatments and sponsored placements from verified providers."
        seeAllHref="/explore"
        cards={rails.featured}
      />
      <ServiceCarousel
        id="premium-services"
        title="Premium"
        subtitle="Paid-plan vendors with enhanced visibility and public contact."
        seeAllHref="/explore?sort=rating"
        cards={rails.premium}
        accent="leaf"
      />
      <ServiceCarousel
        id="promo-services"
        title="Promo"
        subtitle="Limited-time prices and campaign offers."
        seeAllHref="/explore?sort=price"
        cards={rails.promo}
      />

      <VendorCarousel title="Nearby spas & studios" vendors={nearby} />

      <section className="mx-auto mt-10 max-w-7xl px-4 lg:px-8">
        <h2 className="font-display text-2xl">How NaijaSpa works</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {["Search verified providers", "Choose location and time", "Pay securely — confirmed only after verification"].map((s, i) => (
            <li key={s} className="rounded-3xl border border-line bg-card p-5">
              <p className="text-goldink">{i + 1}</p>
              <p className="mt-2 font-semibold">{s}</p>
            </li>
          ))}
        </ol>
        <Link href="/vendor/onboarding" className="mt-6 inline-flex rounded-full border border-gold/50 px-5 py-3 text-sm font-bold text-goldink">
          Become a vendor
        </Link>
      </section>

      <section className="mx-auto mt-10 max-w-3xl px-4 lg:px-8">
        <h2 className="font-display text-2xl">FAQs</h2>
        <dl className="mt-4 space-y-3">
          {faqs.map((f) => (
            <div key={f.question} className="rounded-2xl border border-line bg-card p-4">
              <dt className="font-semibold">{f.question}</dt>
              <dd className="mt-1 text-sm text-ink2">{f.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="mx-auto mt-16 max-w-7xl px-4 pb-10 text-sm text-ink2 lg:px-8">
        <div className="flex flex-wrap gap-4">
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Vendor</Link>
          <Link href="/admin">Admin</Link>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} NaijaSpa · WELLNESS · BEAUTY · RELAXATION · MORE</p>
      </footer>
    </div>
  );
}
