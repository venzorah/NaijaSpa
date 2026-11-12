import { requireAdminScreen } from "@/lib/admin-auth";
import { AdminPageHeader } from "@/components/admin/page-header";
import { AnnouncementsConsole } from "@/components/admin/announcements-console";
import { hasPermission } from "@/lib/rbac";
import { mailConfigured } from "@/lib/mail";
import { announcementAudienceCounts, listAnnouncementHistory } from "@/lib/announcements";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { user, editable } = await requireAdminScreen("announcements");
  const [counts, history] = await Promise.all([announcementAudienceCounts(), listAnnouncementHistory()]);
  return (
    <div className="max-w-5xl">
      <AdminPageHeader screen="announcements" />
      <AnnouncementsConsole
        initial={{
          canEdit: editable && hasPermission(user, "cms.manage"),
          mailConfigured: mailConfigured() || process.env.NODE_ENV !== "production",
          counts,
          history
        }}
      />
    </div>
  );
}
