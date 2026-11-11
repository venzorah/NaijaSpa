import Link from "next/link";
import { Sparkles } from "lucide-react";
import { DarkRoomTeaser } from "@/components/dark-room-teaser";
import { CategoryCarousel } from "@/components/category-carousel";
import { HeroSlider } from "@/components/hero-slider";
import { ParallaxBand } from "@/components/parallax-band";
import { ServiceCarousel, VendorCarousel } from "@/components/service-carousel";
import { PlaceSync } from "@/components/place-sync";
import { HomeExtras } from "@/components/home-extras";
import { HomeDiscovery } from "@/components/home-discovery";
import { HomeServiceGrid } from "@/components/home-service-grid";
import { categoryHref } from "@/lib/category-images";
import { exploreHref } from "@/lib/place-urls";
import type { HomeHeroAd, HomeHeroBanner } from "@/lib/home-hero";
import { DEFAULT_HOME_SECTIONS, homeSection, type HomeSection } from "@/lib/home-sections";
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
  hero,
  spotlight,
  layout = DEFAULT_HOME_SECTIONS
}: {
  place: LivePlace | null;
  categories: Category[];
  rails: { featured: HomeCard[]; premium: HomeCard[]; promo: HomeCard[] };
  nearby: NearbyVendor[];
  faqs: { question: string; answer: string }[];
  hero: { banner: HomeHeroBanner; ads: HomeHeroAd[] };
  spotlight?: HomeCard[];
  layout?: HomeSection[];
}) {
  const browse = (query?: Record<string, string | undefined>) => exploreHref(place, query);
  const featured = homeSection(layout, "featured");
  const nearbySection = homeSection(layout, "nearby");
  const spotlightSection = homeSection(layout, "spotlight");
  const premium = homeSection(layout, "premium");
  const promo = homeSection(layout, "promo");
  const bandSpa = homeSection(layout, "bandSpa");
  const bandCouples = homeSection(layout, "bandCouples");
  const featuredSubtitle =
    featured.subtitle ||
    (place?.city || place?.state
      ? `Every therapist in ${place.state === "FCT" ? "Abuja / FCT" : place.state || "your state"}, with ${[place.neighbourhood, place.city].filter(Boolean).join(", ") || "your area"} shown first.`
      : "Allow location on first visit to see every therapist in your state, closest first.");
  const spotlightCards =
    spotlight ?? [...new Map([...rails.featured, ...rails.premium, ...rails.promo].filter((c) => c.sponsored).map((c) => [c.service.id, c])).values()];
  const spaHref = categoryHref(bandSpa.categorySlugs[0] || "spa");
  const couplesHref = categoryHref(bandCouples.categorySlugs[0] || "couples");

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

      {featured.visible ? (
        <HomeServiceGrid
          id="featured-services"
          title={featured.title}
          subtitle={featuredSubtitle}
          seeAllHref={browse()}
          cards={rails.featured}
        />
      ) : null}

      {featured.visible && !rails.featured.length ? (
        <section className="mx-auto mt-10 max-w-7xl px-4 lg:px-8">
          <div className="rounded-3xl border border-line bg-card p-6">
            <h2 className="font-display text-2xl">Discover treatments</h2>
            <p className="mt-2 text-sm text-ink2">
              {place?.state
                ? `No published treatments are available in ${place.state === "FCT" ? "Abuja / FCT" : place.state} yet.`
                : "No treatments are available for this selection yet."}
            </p>
            <Link className="mt-4 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold" href="/explore?state=all">
              Browse all locations →
            </Link>
          </div>
        </section>
      ) : null}

      {nearbySection.visible ? <VendorCarousel title={nearbySection.title} vendors={nearby} /> : null}
      {spotlightSection.visible ? (
        <HomeServiceGrid
          id="spotlight-partners"
          title={spotlightSection.title}
          layout="spotlight"
          subtitle={spotlightSection.subtitle}
          seeAllHref={browse()}
          cards={spotlightCards}
        />
      ) : null}

      <HomeDiscovery place={place} layout={layout} />

      {bandSpa.visible ? (
        <ParallaxBand
          image="/photos/band-spa.jpg"
          kicker="At your pace"
          title={bandSpa.title}
          body={bandSpa.subtitle}
          href={spaHref}
          cta="Browse spa treatments"
        />
      ) : null}

      {premium.visible ? (
        <ServiceCarousel
          id="premium-services"
          title={premium.title}
          subtitle={premium.subtitle}
          seeAllHref={browse({ sort: "rating" })}
          cards={rails.premium}
          accent="leaf"
        />
      ) : null}
      {promo.visible ? (
        <ServiceCarousel
          id="promo-services"
          title={promo.title}
          subtitle={promo.subtitle}
          seeAllHref={browse({ sort: "price" })}
          cards={rails.promo}
        />
      ) : null}

      {bandCouples.visible ? (
        <ParallaxBand
          image="/photos/band-couples.jpg"
          kicker="Together"
          title={bandCouples.title}
          body={bandCouples.subtitle}
          href={couplesHref}
          cta="See couples bookings"
        />
      ) : null}

      <HomeExtras />

      <DarkRoomTeaser />

      <section className="mx-auto mt-10 max-w-3xl px-4 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-2xl">Frequently asked</h2>
          <Link href="/faq" className="text-sm font-semibold text-goldink">
            All FAQs →
          </Link>
        </div>
        <dl className="mt-4 space-y-3">
          {faqs.map((f) => (
            <div key={f.question}>
              <dt className="sr-only">{f.question}</dt>
              <dd>
                <details className="rounded-2xl border border-line bg-card p-4">
                  <summary className="cursor-pointer font-semibold">{f.question}</summary>
                  <p className="mt-3 text-sm text-ink2">{f.answer}</p>
                </details>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
