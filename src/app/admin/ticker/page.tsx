import { requireAdminScreen } from "@/lib/admin-auth";
import { AdminPageHeader } from "@/components/admin/page-header";
import { TickerConsole } from "@/components/admin/ticker-console";
import { prisma } from "@/lib/db";
import { TICKER_CONFIG_KEY, parseTickerSlots } from "@/lib/ticker";

export const dynamic = "force-dynamic";

export default async function TickerPage() {
  const { editable } = await requireAdminScreen("ticker");
  const row = await prisma.systemConfig.findUnique({ where: { key: TICKER_CONFIG_KEY } });
  return (
    <div className="max-w-3xl">
      <AdminPageHeader screen="ticker" />
      <TickerConsole initial={parseTickerSlots(row?.value)} canEdit={editable} />
    </div>
  );
}
