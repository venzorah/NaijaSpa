import { notFound, redirect } from "next/navigation";
import { CustomerHome } from "@/components/customer-home";
import { getHomeCatalog } from "@/lib/catalog";
import { inHref, parsePlacePath, placeHasLocation } from "@/lib/place-urls";

export const dynamic = "force-dynamic";

export default async function LocalizedHomePage({ params }: { params: Promise<{ place?: string[] }> }) {
  const { place: segments } = await params;
  if (!segments?.length) redirect("/");
  const place = parsePlacePath(segments);
  if (!place || !placeHasLocation(place)) notFound();
  if (segments.length > 3) notFound();
  const canonical = inHref(place);
  const current = `/in/${segments.join("/")}`;
  if (canonical !== current) redirect(canonical);
  const { categories, rails, nearby, faqs } = await getHomeCatalog(place);
  return <CustomerHome place={place} categories={categories} rails={rails} nearby={nearby} faqs={faqs} />;
}
