import { Megaphone } from "lucide-react";
import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { formatCount } from "@/lib/money";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { CampaignsConsole } from "@/components/admin/campaigns-console";

export default async function Page() {
  const { editable } = await requireAdminScreen("campaigns");
  const rows = await prisma.campaign.findMany({ include: { vendor: true, service: true }, orderBy: { priority: "desc" } });
  const impressions = rows.reduce((s, c) => s + c.impressions, 0);
  const clicks = rows.reduce((s, c) => s + c.clicks, 0);
  return (
    <div>
      <AdminPageHeader screen="campaigns" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Campaigns" value={formatCount(rows.length)} icon={Megaphone} />
        <StatCard label="Live" value={formatCount(rows.filter((c) => c.active).length)} />
        <StatCard label="Impressions" value={formatCount(impressions)} />
        <StatCard label="Clicks" value={formatCount(clicks)} />
      </div>
      <CampaignsConsole
        editable={editable}
        rows={rows.map((c) => ({
          id: c.id,
          vendor: c.vendor.businessName,
          placement: c.placement,
          service: c.service?.name ?? "—",
          active: c.active,
          priority: c.priority,
          impressions: c.impressions,
          clicks: c.clicks,
          window: `${c.startsAt.toLocaleDateString("en-NG")} – ${c.endsAt.toLocaleDateString("en-NG")}`
        }))}
      />
    </div>
  );
}
