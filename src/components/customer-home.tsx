import Link from "next/link";
import { Sparkles } from "lucide-react";
import { DarkRoomTeaser } from "@/components/dark-room-teaser";
import { CategoryCarousel } from "@/components/category-carousel";
import { HeroSlider } from "@/components/hero-slider";
import { ParallaxBand } from "@/components/parallax-band";
import { ServiceCarousel, VendorCarousel } from "@/components/service-carousel";
import { PlaceSync } from "@/components/place-sync";
import { exploreHref } from "@/lib/place-urls";
import type { HomeCard, NearbyVendor } from "@/lib/home-types";
import type { LivePlace } from "@/lib/nigeria";

function greeting() {
  const hour = (new Date().getUTCHours() + 1) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type Category = { slug: string; name: string; imageUrl?: string | null };

export function CustomerHome({
  place,
  categories,
  rails,
  nearby,
  faqs
}: {
  place: LivePlace | null;
  categories: Category[];
  rails: { featured: HomeCard[]; premium: HomeCard[]; promo: HomeCard[] };
  nearby: NearbyVendor[];
  faqs: { question: string; answer: string }[];
}) {
  const browse = (query?: Record<string, string | undefined>) => exploreHref(place, query);

  return (
    <div>
      <PlaceSync place={place} />
      <HeroSlider greeting={`${greeting()},`} categories={categories} place={place} />

      <CategoryCarousel categories={categories} place={place} />

      <section className="mx-auto mt-8 max-w-7xl px-4 lg:px-8">
        <Link href="/ai" className="flex items-start gap-3 rounded-3xl border border-gold/40 bg-gold/10 p-5">
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
        title="Top-rated near you"
        subtitle={
          place?.city || place?.state
            ? `Therapists in ${[place.neighbourhood, place.city, place.state].filter(Boolean).join(", ")} show first, then others across Nigeria.`
            : "Allow location on first visit to see therapists in your city first, then others."
        }
        seeAllHref={browse()}
        cards={rails.featured}
      />

      <ParallaxBand
        image="/photos/band-spa.jpg"
        kicker="At your pace"
        title="Heat, stone and silence."
        body="Hot stone, hammam and deep tissue — book the hour your body has been asking for."
        href={browse({ category: "spa" })}
        cta="Browse spa treatments"
      />

      <ServiceCarousel
        id="premium-services"
        title="Premium"
        subtitle="Paid-plan vendors with enhanced visibility and public contact."
        seeAllHref={browse({ sort: "rating" })}
        cards={rails.premium}
        accent="leaf"
      />
      <ServiceCarousel
        id="promo-services"
        title="Promo"
        subtitle="Limited-time prices and campaign offers."
        seeAllHref={browse({ sort: "price" })}
        cards={rails.promo}
      />

      <ParallaxBand
        image="/photos/band-couples.jpg"
        kicker="Together"
        title="Two tables. One still room."
        body="Couples rituals with two therapists, private suites, and prices in Naira."
        href={browse({ category: "couples" })}
        cta="See couples bookings"
      />

      <VendorCarousel title="Nearby spas & studios" vendors={nearby} />

      <section className="mx-auto mt-10 max-w-7xl px-4 lg:px-8">
        <h2 className="font-display text-2xl">How NaijaSpa works</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {["Search verified providers", "Choose location and time", "Pay securely — confirmed only after verification"].map(
            (s, i) => (
              <li key={s} className="rounded-3xl border border-line bg-card p-5">
                <p className="text-goldink">{i + 1}</p>
                <p className="mt-2 font-semibold">{s}</p>
              </li>
            )
          )}
        </ol>
        <Link href="/vendor/onboarding" className="mt-6 inline-flex rounded-full border border-gold/50 px-5 py-3 text-sm font-bold text-goldink">
          Become a vendor
        </Link>
      </section>

      <DarkRoomTeaser />

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
          <Link href="/login">Customer login</Link>
          <Link href="/login/vendor">Vendor login</Link>
          <Link href="/login/admin">Admin login</Link>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} NaijaSpa · WELLNESS · BEAUTY · RELAXATION · MORE</p>
      </footer>
    </div>
  );
}
