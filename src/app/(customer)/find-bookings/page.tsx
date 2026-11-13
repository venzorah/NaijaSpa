import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { FindBookingsForm } from "@/components/find-bookings-form";

export default async function FindBookingsPage() {
  const user = await getSession();
  if (user?.role === "customer") redirect("/account/bookings");
  return <FindBookingsForm />;
}
