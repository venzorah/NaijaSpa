import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { VendorCampaignsConsole } from "@/components/vendor/campaigns-console";

export default async function Page() {
  const user = await getSession();
  const vendorId = user?.vendorId || "";
  const [campaigns, services, ent] = await Promise.all([
    prisma.campaign.findMany({ where: { vendorId }, include: { service: { select: { name: true } } }, orderBy: { startsAt: "desc" } }),
    prisma.service.findMany({ where: { vendorId, active: true }, select: { id: true, name: true } }),
    vendorId ? vendorEntitlement(vendorId) : Promise.resolve(null)
  ]);
  return (
    <VendorCampaignsConsole
      eligible={Boolean(ent?.sponsoredEligible)}
      services={services}
      rows={campaigns.map((c) => ({
        id: c.id,
        placement: c.placement,
        service: c.service?.name ?? "Business",
        active: c.active,
        impressions: c.impressions,
        clicks: c.clicks,
        window: `${c.startsAt.toLocaleDateString("en-NG")} – ${c.endsAt.toLocaleDateString("en-NG")}`
      }))}
    />
  );
}
