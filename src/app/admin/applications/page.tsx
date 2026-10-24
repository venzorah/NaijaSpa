import { requireAdminScreen } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ApplicationsConsole } from "@/components/admin/applications-console";

export default async function ApplicationsPage() {
  const { user, editable } = await requireAdminScreen("applications");
  const vendors = await prisma.vendor.findMany({
    include: { owner: { select: { name: true, email: true } }, documents: true },
    orderBy: { updatedAt: "desc" }
  });
  return (
    <div>
      <AdminPageHeader screen="applications" />
      <ApplicationsConsole
        editable={editable}
        canViewProtected={hasPermission(user.role, "vendors.verify")}
        rows={vendors.map((v) => ({
          id: v.id,
          businessName: v.businessName,
          city: v.city,
          ownerName: v.owner.name,
          ownerEmail: v.owner.email,
          applicationStatus: v.applicationStatus,
          submitted: v.updatedAt.toLocaleDateString("en-NG"),
          documents: v.documents.map((d) => ({
            id: d.id,
            kind: d.kind,
            status: d.status,
            filePath: d.filePath,
            notes: d.notes
          }))
        }))}
      />
    </div>
  );
}
