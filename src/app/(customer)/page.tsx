import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, getSession } from "@/lib/auth";
import { PLACE_COOKIE, placeFromCookieOrDefault } from "@/lib/nigeria";
import { appLaunchPath } from "@/lib/portal-auth";
import { inHref } from "@/lib/place-urls";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jar = await cookies();
  if (jar.get(COOKIE)?.value) {
    const portal = appLaunchPath((await getSession())?.role);
    if (portal) redirect(portal);
  }
  const place = placeFromCookieOrDefault(jar.get(PLACE_COOKIE)?.value);
  redirect(inHref(place));
}
