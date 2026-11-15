import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PLACE_COOKIE, placeFromCookieOrDefault } from "@/lib/nigeria";
import { appLaunchPath } from "@/lib/portal-auth";
import { inHref } from "@/lib/place-urls";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [session, jar] = await Promise.all([getSession(), cookies()]);
  const portal = appLaunchPath(session?.role);
  if (portal) redirect(portal);
  const place = placeFromCookieOrDefault(jar.get(PLACE_COOKIE)?.value);
  redirect(inHref(place));
}
