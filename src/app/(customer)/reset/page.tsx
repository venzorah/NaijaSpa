import { redirect } from "next/navigation";

export default async function ResetPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  const portal = typeof sp.portal === "string" ? sp.portal : "";
  const email = typeof sp.email === "string" ? sp.email : "";
  if (portal === "vendor" || portal === "admin") params.set("portal", portal);
  if (email) params.set("email", email);
  const q = params.toString();
  redirect(`/forgot${q ? `?${q}` : ""}`);
}
