import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { PLACE_COOKIE, placeFromCookieOrDefault } from "@/lib/nigeria";
import { inHref } from "@/lib/place-urls";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const place = placeFromCookieOrDefault((await cookies()).get(PLACE_COOKIE)?.value);
  redirect(inHref(place));
}
