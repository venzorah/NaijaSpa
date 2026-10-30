import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/settings-form";
import { parseNotificationPreferences } from "@/lib/notification-preferences";

export default async function SettingsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/settings");
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    include: { customerProfile: true }
  });
  if (!row) redirect("/login?next=/account/settings");
  const [first, ...rest] = row.name.split(" ");
  return (
    <SettingsForm
      firstName={first || ""}
      lastName={rest.join(" ")}
      email={row.email}
      phone={row.phone || ""}
      city={row.customerProfile?.city || ""}
      neighbourhood={row.customerProfile?.neighbourhood || ""}
      locale={row.locale || "en"}
      notificationPreferences={parseNotificationPreferences(row.notificationPreferencesJson)}
    />
  );
}
