import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Fragment } from "react";
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
import { koboFromNaira } from "@/lib/money";
import {
  exploreHref,
  exploreQueryRedirect,
  filtersFromSearchParams,
  placeFromPath,
  placeHasLocation,
  placePath
} from "@/lib/place-urls";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;

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
  const filterPlace = explicitPlace ? pathPlace : null;
  const data = await searchServices({
    q: filters.q,
    state: searchedState,
    gender,
    category: filters.category,
    minPrice: filters.minPrice ? koboFromNaira(Number(filters.minPrice)) : undefined,
    maxPrice: filters.maxPrice ? koboFromNaira(Number(filters.maxPrice)) : undefined,
    minRating: filters.minRating ? Number(filters.minRating) : undefined,
    verified: filters.verified === "1",
    durationMin: filters.duration ? Number(filters.duration) : undefined,
    locationType: (filters.location as LocationType) || undefined,
    publicContact: filters.whatsapp === "1",
    sort: (filters.sort as "price" | "rating" | "relevance") || "relevance",
    page: filters.page ? Number(filters.page) : 1,
    take: PAGE_SIZE,
    rankPlace
  });
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  if (data.page > totalPages) {
    redirect(exploreHref(filterPlace, { ...filters, page: totalPages > 1 ? String(totalPages) : undefined }));
  }
  const pageHref = (page: number) => `${exploreHref(filterPlace, { ...filters, page: page > 1 ? String(page) : undefined })}#explore-results`;
  const pageNumbers = [...new Set([1, data.page - 1, data.page, data.page + 1, totalPages])]
    .filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const pageLinkClass = "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-line bg-card px-3 text-sm font-semibold hover:bg-elev";
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
      <ExploreSearchBar place={filterPlace} values={filters} suggestions={[...new Set(data.results.map((result) => result.service.name))].slice(0, 8)} />
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

        <div id="explore-results" className="scroll-mt-28">
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
          {data.total > 0 ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-ink2" role="status">
                Showing {(data.page - 1) * PAGE_SIZE + 1}–{Math.min(data.page * PAGE_SIZE, data.total)} of {data.total} treatments
              </p>
              {totalPages > 1 ? (
                <nav aria-label="Treatment pagination" className="flex flex-wrap items-center gap-2">
                  {data.page > 1 ? <Link href={pageHref(data.page - 1)} className={pageLinkClass}>Previous</Link> : <span aria-disabled="true" className={`${pageLinkClass} opacity-40`}>Previous</span>}
                  {pageNumbers.map((page, index) => (
                    <Fragment key={page}>
                      {index > 0 && page - pageNumbers[index - 1] > 1 ? <span className="px-1 text-ink2" aria-hidden="true">…</span> : null}
                      <Link href={pageHref(page)} aria-label={`Page ${page}`} aria-current={data.page === page ? "page" : undefined}
                        className={data.page === page ? "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full bg-ink px-3 text-sm font-bold text-bg" : pageLinkClass}>
                        {page}
                      </Link>
                    </Fragment>
                  ))}
                  {data.page < totalPages ? <Link href={pageHref(data.page + 1)} className={pageLinkClass}>Next</Link> : <span aria-disabled="true" className={`${pageLinkClass} opacity-40`}>Next</span>}
                </nav>
              ) : null}
            </div>
          ) : null}
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
