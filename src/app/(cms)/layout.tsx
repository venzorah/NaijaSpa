import { CustomerShell } from "@/components/shell";
import { hasSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TICKER_CONFIG_KEY, activeTickerItems, parseTickerSlots } from "@/lib/ticker";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const signedIn = await hasSessionCookie();
  let tickerItems: ReturnType<typeof activeTickerItems> = [];
  try {
    const tickerRow = await prisma.systemConfig.findUnique({ where: { key: TICKER_CONFIG_KEY } });
    tickerItems = activeTickerItems(parseTickerSlots(tickerRow?.value));
  } catch {
    tickerItems = [];
  }
  return (
    <CustomerShell signedIn={signedIn} tickerItems={tickerItems}>
      {children}
    </CustomerShell>
  );
}
