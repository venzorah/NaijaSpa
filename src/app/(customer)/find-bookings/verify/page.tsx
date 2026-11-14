import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { GuestOtpVerifyScreen } from "@/components/guest-otp-screen";
import { normalizeGuestEmail, normalizeNgPhone } from "@/lib/phone";

export default async function GuestOtpVerifyPage({
  searchParams
}: {
  searchParams: Promise<{ phone?: string; email?: string }>;
}) {
  const user = await getSession();
  if (user?.role === "customer") redirect("/account/bookings");
  const params = await searchParams;
  const phone = params.phone || "";
  const email = (params.email || "").trim().toLowerCase();
  if (email) {
    if (!normalizeGuestEmail(email)) redirect("/find-bookings");
    return <GuestOtpVerifyScreen email={email} />;
  }
  if (!normalizeNgPhone(phone)) redirect("/find-bookings");
  return <GuestOtpVerifyScreen phone={phone} />;
}
