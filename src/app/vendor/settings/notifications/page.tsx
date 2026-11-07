import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { parseNotificationPreferences } from "@/lib/notification-preferences";
import { VendorNotificationPreferences } from "@/components/vendor/notification-preferences";
export default async function Page() { const user = await requireVendor(); const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { notificationPreferencesJson: true } }); return <VendorNotificationPreferences initial={parseNotificationPreferences(row.notificationPreferencesJson)}/>; }
