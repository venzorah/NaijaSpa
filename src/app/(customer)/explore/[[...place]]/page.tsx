import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PlaceSync } from "@/components/place-sync";
import { ExploreResultCard } from "@/components/explore-result-card";
import { ExploreFilters, ExploreSort } from "@/components/explore-filters";
import { CityCarousel } from "@/components/service-carousel";
import { ExploreSearchBar } from "@/components/explore-search-bar";
import { EmptyState } from "@/components/empty-state";
import { SearchX } from "lucide-react";
import { listExploreCities, searchServices } from "@/lib/search";
import { PLACE_COOKIE, nigeriaStateLabel, placeFromCookieOrDefault, serviceAreaState } from "@/lib/nigeria";
import { demoCategories } from "@/lib/demo-catalog";
import type { LocationType } from "@/lib/commercial";
import type { TherapistGender } from "@/lib/nigeria";
import {
  exploreHref,
  exploreQueryRedirect,
  filtersFromSearchParams,
  placeFromPath,
  placeHasLocation,
  placePath
} from "@/lib/place-urls";

export const dynamic = "force-dynamic";

export default async function ExplorePage({
  params,
  searchParams
}: {
  params: Promise<{ place?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ place: segments }, sp] = await Promise.all([params, searchParams]);
  const fromQuery = exploreQueryRedirect(sp);
  if (fromQuery) redirect(fromQuery);

  const pathPlace = placeFromPath(segments);
  const stored = placeFromCookieOrDefault((await cookies()).get(PLACE_COOKIE)?.value);
  const filters = filtersFromSearchParams(sp);
  if (pathPlace && placeHasLocation(pathPlace)) {
    const canonicalPath = `/explore${placePath(pathPlace)}`;
    const currentPath = `/explore/${(segments ?? []).join("/")}`;
    if (canonicalPath !== currentPath) redirect(exploreHref(pathPlace, filters));
  }
  const gender = filters.gender === "male" || filters.gender === "female" ? (filters.gender as TherapistGender) : undefined;
  const explicitPlace = placeHasLocation(pathPlace);
  const searchedCity = pathPlace?.city || undefined;
  const searchedState = serviceAreaState(pathPlace) || undefined;
  const rankPlace = pathPlace && explicitPlace ? pathPlace : stored;
  const filterPlace = explicitPlace ? pathPlace : stored;
  const data = await searchServices({
    q: filters.q,
    state: searchedState,
    gender,
    category: filters.category,
    minPrice: filters.minPrice ? Number(filters.minPrice) * 100 : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) * 100 : undefined,
    minRating: filters.minRating ? Number(filters.minRating) : undefined,
    verified: filters.verified === "1",
    durationMin: filters.duration ? Number(filters.duration) : undefined,
    locationType: (filters.location as LocationType) || undefined,
    publicContact: filters.whatsapp === "1",
    sort: (filters.sort as "price" | "rating" | "relevance") || "relevance",
    page: filters.page ? Number(filters.page) : 1,
    take: 24,
    rankPlace
  });
  const siblingCities = await listExploreCities({
    state: searchedState,
    excludeCity: searchedCity,
    limit: searchedState ? 12 : 8
  });
  const label = [pathPlace?.neighbourhood, pathPlace?.city, pathPlace?.state].filter(Boolean).join(", ");
  const stateLabel = searchedState ? nigeriaStateLabel(searchedState) : "";
  const around = label || stateLabel;
  const emptyCopy = explicitPlace
    ? `No therapist available yet in ${stateLabel || label}.`
    : "No services match those filters.";
  const cityRailTitle = searchedState
    ? searchedCity
      ? `Other cities in ${stateLabel}`
      : `Cities in ${stateLabel}`
    : "Cities with therapists";
  const cityRailSubtitle = searchedState
    ? "Therapists cover the whole state. These cities help you browse by area."
    : "Popular cities with listings across Nigeria.";
  let categories = demoCategories.map((c) => ({ slug: c.slug, name: c.name }));
  try {
    const { prisma } = await import("@/lib/db");
    const rows = await prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true }
    });
    if (rows.length) categories = rows;
  } catch {
    /* demo list */
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 lg:px-8">
      <PlaceSync place={pathPlace} />
      <h1 className="font-display text-[34px] font-semibold text-ink md:text-4xl">Explore</h1>
      <p className="text-sm text-ink2">Find the right treatment, therapist and setting.</p>
      <ExploreSearchBar place={filterPlace} values={filters} />
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {data.total} {data.total === 1 ? "treatment" : "treatments"}
          {around ? ` around ${around}` : ""}
        </h2>
        <ExploreSort place={filterPlace} values={filters} />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[17.5rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-28">
          <details className="lg:hidden" open={!explicitPlace}>
            <summary className="cursor-pointer list-none rounded-full bg-elev px-4 py-3 text-sm font-bold">
              Filters
            </summary>
            <div className="mt-3">
              <ExploreFilters place={filterPlace} values={filters} categories={categories} />
            </div>
          </details>
          <div className="hidden lg:block">
            <ExploreFilters place={filterPlace} values={filters} categories={categories} />
          </div>
        </div>

        <div>
          {data.results.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={emptyCopy}
              text={siblingCities.length > 0 ? "See therapists in other cities below, or try Ask NaijaSpa AI." : "Try widening your price range or removing a filter."}
              actionHref="/ai"
              actionLabel="Ask NaijaSpa AI"
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.results.map((r) => (
                <li key={r.service.id}>
                  <ExploreResultCard result={r} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <CityCarousel
        id="explore-cities"
        title={cityRailTitle}
        subtitle={cityRailSubtitle}
        cities={siblingCities}
      />
    </div>
  );
}
