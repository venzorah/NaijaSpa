import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isAnnouncementInboxActionUrl } from "@/lib/announcement-inbox";
import { AnnouncementMessageReader } from "@/components/announcement-inbox";

export default async function AccountMessagePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/messages");
  const { id } = await params;
  const row = await prisma.notification.findFirst({ where: { id, userId: user.id } });
  if (!row || !isAnnouncementInboxActionUrl(row.actionUrl)) notFound();
  if (!row.readAt) {
    await prisma.notification.updateMany({ where: { id: row.id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  }
  return (
    <AnnouncementMessageReader
      portal="customer"
      title={row.title}
      body={row.body}
      createdAt={row.createdAt.toISOString()}
    />
  );
}
