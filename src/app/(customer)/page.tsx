import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CustomerHome } from "@/components/customer-home";
import { getHomeCatalog } from "@/lib/catalog";
import { PLACE_COOKIE, parsePlaceCookie } from "@/lib/nigeria";
import { inHref } from "@/lib/place-urls";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const place = parsePlaceCookie((await cookies()).get(PLACE_COOKIE)?.value);
  const localHref = inHref(place);
  if (localHref !== "/") redirect(localHref);
  const { categories, rails, nearby, faqs, hero } = await getHomeCatalog(null);
  return <CustomerHome place={null} categories={categories} rails={rails} nearby={nearby} faqs={faqs} hero={hero} />;
}
