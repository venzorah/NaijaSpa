import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { VendorNotifications } from "@/components/vendor/notifications";
export default async function Page() { const user = await requireVendor(); const rows = await prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100 }); return <VendorNotifications rows={rows.map(r => ({ id: r.id, title: r.title, body: r.body, createdAt: r.createdAt.toISOString(), readAt: r.readAt?.toISOString() ?? null, actionUrl: r.actionUrl.startsWith('/vendor/') && !r.actionUrl.includes('\\') ? r.actionUrl : '/vendor/bookings' }))}/>; }
