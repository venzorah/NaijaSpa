import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { announcementInboxWhere } from "@/lib/announcement-inbox";
import { AnnouncementMessageList } from "@/components/announcement-inbox";

export default async function VendorMessagesPage() {
  const user = await requireVendor();
  const rows = await prisma.notification.findMany({
    where: announcementInboxWhere(user.id),
    orderBy: { createdAt: "desc" },
    take: 80
  });
  return (
    <AnnouncementMessageList
      portal="vendor"
      unread={rows.filter((row) => !row.readAt).length}
      rows={rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        readAt: row.readAt?.toISOString() ?? null
      }))}
    />
  );
}
