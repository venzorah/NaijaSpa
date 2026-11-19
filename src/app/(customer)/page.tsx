import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, getSession } from "@/lib/auth";
import { PLACE_COOKIE, parsePlaceCookie } from "@/lib/nigeria";
import { appLaunchPath } from "@/lib/portal-auth";
import { inHref, placeHasLocation } from "@/lib/place-urls";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jar = await cookies();
  if (jar.get(COOKIE)?.value) {
    const portal = appLaunchPath((await getSession())?.role);
    if (portal) redirect(portal);
  }
  const place = parsePlaceCookie(jar.get(PLACE_COOKIE)?.value);
  if (place && placeHasLocation(place)) redirect(inHref(place));
  return <div className="min-h-[70vh]" aria-busy="true" aria-label="Detecting your location" />;
}
