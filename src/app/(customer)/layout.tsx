import { CustomerShell } from "@/components/shell";
import { LocationGate } from "@/components/location-gate";
import { hasSessionCookie } from "@/lib/auth";
import { getActiveTickerItems } from "@/lib/ticker-cache";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const signedIn = await hasSessionCookie();
  const tickerItems = await getActiveTickerItems().catch(() => []);
  return (
    <CustomerShell signedIn={signedIn} tickerItems={tickerItems}>
      <LocationGate />
      {children}
    </CustomerShell>
  );
}
