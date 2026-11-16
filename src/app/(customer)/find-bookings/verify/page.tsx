import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { GuestOtpVerifyScreen } from "@/components/guest-otp-screen";
import { portalNext } from "@/lib/portal-auth";
import { normalizeGuestEmail, normalizeNgPhone } from "@/lib/phone";

export default async function GuestOtpVerifyPage({
  searchParams
}: {
  searchParams: Promise<{ phone?: string; email?: string; next?: string }>;
}) {
  const user = await getSession();
  const params = await searchParams;
  if (user?.role === "customer") redirect(params.next ? portalNext(params.next, "customer") : "/account/bookings");
  const phone = params.phone || "";
  const email = (params.email || "").trim().toLowerCase();
  if (email) {
    if (!normalizeGuestEmail(email)) redirect("/find-bookings");
    return <GuestOtpVerifyScreen email={email} next={params.next} />;
  }
  if (!normalizeNgPhone(phone)) redirect("/find-bookings");
  return <GuestOtpVerifyScreen phone={phone} next={params.next} />;
}
