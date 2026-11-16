import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { GuestOtpRequestScreen } from "@/components/guest-otp-screen";
import { portalNext } from "@/lib/portal-auth";

export default async function FindBookingsPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [user, sp] = await Promise.all([getSession(), searchParams]);
  if (user?.role === "customer") redirect(sp.next ? portalNext(sp.next, "customer") : "/account/bookings");
  return <GuestOtpRequestScreen resume={sp.next} />;
}
