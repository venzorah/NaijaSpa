import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getHomeCatalog, usingDemoListings } from "@/lib/catalog";
import { CategoryCarousel } from "@/components/category-carousel";
import { HeroSlider } from "@/components/hero-slider";
import { ParallaxBand } from "@/components/parallax-band";
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

      <HeroSlider greeting={`${greeting()},`} categories={categories} />

      <CategoryCarousel categories={categories} />

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

      <ParallaxBand
        image="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=2000&q=80"
        kicker="At your pace"
        title="Heat, stone and silence."
        body="Hot stone, hammam and deep tissue — book the hour your body has been asking for."
        href="/explore?category=spa"
        cta="Browse spa treatments"
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

      <ParallaxBand
        image="https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=2000&q=80"
        kicker="Together"
        title="Two tables. One still room."
        body="Couples rituals with two therapists, private suites, and prices in Naira."
        href="/explore?category=couples"
        cta="See couples bookings"
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
