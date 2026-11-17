import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CustomerHome } from "@/components/customer-home";
import { COOKIE, getSession } from "@/lib/auth";
import { getHomeCatalog } from "@/lib/catalog";
import { appLaunchPath } from "@/lib/portal-auth";
import { inHref, parsePlacePath, placeHasLocation } from "@/lib/place-urls";
import type { LivePlace } from "@/lib/nigeria";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "NaijaSpa" },
  applicationName: "NaijaSpa",
  appleWebApp: { title: "NaijaSpa" }
};

async function HomeCatalog({ place }: { place: LivePlace }) {
  const { categories, rails, nearby, faqs, hero, spotlight, layout } = await getHomeCatalog(place);
  return (
    <CustomerHome
      place={place}
      categories={categories}
      rails={rails}
      nearby={nearby}
      faqs={faqs}
      hero={hero}
      spotlight={spotlight}
      layout={layout}
    />
  );
}

export default async function LocalizedHomePage({ params }: { params: Promise<{ place?: string[] }> }) {
  if ((await cookies()).get(COOKIE)?.value) {
    const portal = appLaunchPath((await getSession())?.role);
    if (portal) redirect(portal);
  }
  const { place: segments } = await params;
  if (!segments?.length) redirect("/");
  const place = parsePlacePath(segments);
  if (!place || !placeHasLocation(place)) notFound();
  if (segments.length > 3) notFound();
  const canonical = inHref(place);
  const current = `/in/${segments.join("/")}`;
  if (canonical !== current) redirect(canonical);
  return (
    <Suspense fallback={<div className="min-h-[70vh]" aria-hidden />}>
      <HomeCatalog place={place} />
    </Suspense>
  );
}
