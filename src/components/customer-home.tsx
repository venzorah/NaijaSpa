import Link from "next/link";
import { Sparkles } from "lucide-react";
import { DarkRoomTeaser } from "@/components/dark-room-teaser";
import { CategoryCarousel } from "@/components/category-carousel";
import { HeroSlider } from "@/components/hero-slider";
import { ParallaxBand } from "@/components/parallax-band";
import { ServiceCarousel, VendorCarousel } from "@/components/service-carousel";
import { PlaceSync } from "@/components/place-sync";
import { HomeExtras } from "@/components/home-extras";
import { exploreHref } from "@/lib/place-urls";
import type { HomeHeroAd, HomeHeroBanner } from "@/lib/home-hero";
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
  faqs,
  hero
}: {
  place: LivePlace | null;
  categories: Category[];
  rails: { featured: HomeCard[]; premium: HomeCard[]; promo: HomeCard[] };
  nearby: NearbyVendor[];
  faqs: { question: string; answer: string }[];
  hero: { banner: HomeHeroBanner; ads: HomeHeroAd[] };
}) {
  const browse = (query?: Record<string, string | undefined>) => exploreHref(place, query);

  return (
    <div>
      <PlaceSync place={place} />
      <HeroSlider greeting={`${greeting()},`} categories={categories} place={place} banner={hero.banner} ads={hero.ads} />

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
            ? `Every therapist in ${place.state === "FCT" ? "Abuja / FCT" : place.state || "your state"}, with ${[place.neighbourhood, place.city].filter(Boolean).join(", ") || "your area"} shown first.`
            : "Allow location on first visit to see every therapist in your state, closest first."
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

      <VendorCarousel title="Spas & studios in your state" vendors={nearby} />

      <HomeExtras />

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

    </div>
  );
}
