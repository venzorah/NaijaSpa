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
import { DEFAULT_HOME_SECTIONS, homeSection, orderedHomeSections, type HomeSection } from "@/lib/home-sections";
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

      {orderedHomeSections(layout).map((section) => {
        if (section.id === "featured") {
          return (
            <div key={section.id}>
              {section.visible ? (
                <HomeServiceGrid
                  id="featured-services"
                  title={section.title}
                  subtitle={featuredSubtitle}
                  seeAllHref={browse()}
                  cards={rails.featured}
                />
              ) : null}
              {section.visible && !rails.featured.length ? (
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
            </div>
          );
        }
        if (section.id === "nearby") {
          return section.visible ? <VendorCarousel key={section.id} title={section.title} vendors={nearby} /> : null;
        }
        if (section.id === "spotlight") {
          return section.visible ? (
            <HomeServiceGrid
              key={section.id}
              id="spotlight-partners"
              title={section.title}
              layout="spotlight"
              subtitle={section.subtitle}
              seeAllHref={browse()}
              cards={spotlightCards}
            />
          ) : null;
        }
        if (section.id === "collections") {
          return <HomeDiscovery key={section.id} place={place} layout={layout} />;
        }
        if (section.id === "bandSpa") {
          return section.visible ? (
            <ParallaxBand
              key={section.id}
              image="/photos/band-spa.jpg"
              kicker="At your pace"
              title={section.title}
              body={section.subtitle}
              href={spaHref}
              cta="Browse spa treatments"
            />
          ) : null;
        }
        if (section.id === "premium") {
          return section.visible ? (
            <ServiceCarousel
              key={section.id}
              id="premium-services"
              title={section.title}
              subtitle={section.subtitle}
              seeAllHref={browse({ sort: "rating" })}
              cards={rails.premium}
              accent="leaf"
            />
          ) : null;
        }
        if (section.id === "promo") {
          return section.visible ? (
            <ServiceCarousel
              key={section.id}
              id="promo-services"
              title={section.title}
              subtitle={section.subtitle}
              seeAllHref={browse({ sort: "price" })}
              cards={rails.promo}
            />
          ) : null;
        }
        if (section.id === "bandCouples") {
          return section.visible ? (
            <ParallaxBand
              key={section.id}
              image="/photos/band-couples.jpg"
              kicker="Together"
              title={section.title}
              body={section.subtitle}
              href={couplesHref}
              cta="See couples bookings"
            />
          ) : null;
        }
        return null;
      })}

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
