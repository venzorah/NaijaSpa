import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { TICKER_CONFIG_KEY, activeTickerItems, parseTickerSlots } from "./ticker";

export const getActiveTickerItems = unstable_cache(
  async () => {
    const row = await prisma.systemConfig.findUnique({ where: { key: TICKER_CONFIG_KEY } });
    return activeTickerItems(parseTickerSlots(row?.value));
  },
  ["topbar-ticker"],
  { revalidate: 120, tags: ["system-config"] }
);
