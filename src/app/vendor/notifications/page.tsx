import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { VendorNotifications } from "@/components/vendor/notifications";
import { isAnnouncementInboxActionUrl, parseAnnouncementInboxBody } from "@/lib/announcement-inbox";
export default async function Page() {
  const user = await requireVendor();
  const rows = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <VendorNotifications
      rows={rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: parseAnnouncementInboxBody(r.body).text,
        createdAt: r.createdAt.toISOString(),
        readAt: r.readAt?.toISOString() ?? null,
        actionUrl: isAnnouncementInboxActionUrl(r.actionUrl)
          ? `/vendor/messages/${r.id}`
          : r.actionUrl.startsWith("/vendor/") && !r.actionUrl.includes("\\")
            ? r.actionUrl
            : "/vendor/bookings"
      }))}
    />
  );
}
