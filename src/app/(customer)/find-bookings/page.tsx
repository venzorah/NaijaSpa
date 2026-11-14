import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { GuestOtpRequestScreen } from "@/components/guest-otp-screen";

export default async function FindBookingsPage() {
  const user = await getSession();
  if (user?.role === "customer") redirect("/account/bookings");
  return <GuestOtpRequestScreen />;
}
