import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ExploreSearch } from "@/components/explore-search";
import { PlaceSync } from "@/components/place-sync";
import { ExploreResultCard } from "@/components/explore-result-card";
import { CityCarousel } from "@/components/service-carousel";
import { listExploreCities, searchServices } from "@/lib/search";
import { PLACE_COOKIE, nigeriaStateLabel, parsePlaceCookie, serviceAreaState } from "@/lib/nigeria";
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
  const stored = parsePlaceCookie((await cookies()).get(PLACE_COOKIE)?.value);
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
    rankPlace
  });
  const siblingCities = await listExploreCities({
    state: searchedState,
    excludeCity: searchedCity,
    limit: searchedState ? 12 : 8
  });
  const label = [pathPlace?.neighbourhood, pathPlace?.city, pathPlace?.state].filter(Boolean).join(", ");
  const stateLabel = searchedState ? nigeriaStateLabel(searchedState) : "";
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <PlaceSync place={pathPlace} />
      <h1 className="font-display text-3xl">{label ? `Explore ${label}` : "Explore"}</h1>
      <p className="mt-2 text-sm text-ink2">
        {explicitPlace
          ? "Every therapist in this state, with your area shown first. Search other states without leaving this page."
          : "Search by state — listings cover the whole state, not only your live area."}
      </p>
      <ExploreSearch
        collapsed={Boolean(explicitPlace || filters.q || filters.location || filters.category)}
        values={{
          q: filters.q,
          state: pathPlace?.state,
          city: pathPlace?.city,
          neighbourhood: pathPlace?.neighbourhood,
          gender: filters.gender,
          location: filters.location
        }}
      />
      <div className="mt-2 flex gap-2 text-xs">
        <Link className="underline" href="/explore">
          Clear all
        </Link>
        <Link className="underline" href="/ai">
          Try Ask NaijaSpa AI
        </Link>
      </div>
      {data.results.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-line bg-card px-5 py-8">
          <p className="font-display text-2xl">{emptyCopy}</p>
          {siblingCities.length > 0 ? (
            <p className="mt-2 text-sm text-ink2">See therapists in other cities below.</p>
          ) : null}
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.results.map((r) => (
            <li key={r.service.id}>
              <ExploreResultCard result={r} />
            </li>
          ))}
        </ul>
      )}
      <CityCarousel
        id="explore-cities"
        title={cityRailTitle}
        subtitle={cityRailSubtitle}
        cities={siblingCities}
      />
    </div>
  );
}
