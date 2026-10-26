import { redirect } from "next/navigation";
import { ADMIN_DASHBOARD } from "@/lib/rbac";

export default async function AdminRootPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(sp)) {
    if (typeof value === "string") q.set(key, value);
    else if (Array.isArray(value)) value.forEach((item) => q.append(key, item));
  }
  const qs = q.toString();
  redirect(`${ADMIN_DASHBOARD}${qs ? `?${qs}` : ""}`);
}
