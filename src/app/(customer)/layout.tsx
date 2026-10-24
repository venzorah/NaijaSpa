import { CustomerShell } from "@/components/shell";
import { LocationGate } from "@/components/location-gate";
import { getSession } from "@/lib/auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  return (
    <CustomerShell signedIn={Boolean(user)}>
      <LocationGate />
      {children}
    </CustomerShell>
  );
}
