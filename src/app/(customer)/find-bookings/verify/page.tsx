import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { GuestPhoneVerifyScreen } from "@/components/guest-otp-screen";
import { normalizeNgPhone } from "@/lib/phone";

export default async function GuestOtpVerifyPage({
  searchParams
}: {
  searchParams: Promise<{ phone?: string }>;
}) {
  const user = await getSession();
  if (user?.role === "customer") redirect("/account/bookings");
  const phone = (await searchParams).phone || "";
  if (phone && !normalizeNgPhone(phone)) redirect("/find-bookings");
  return <GuestPhoneVerifyScreen phone={phone} />;
}
