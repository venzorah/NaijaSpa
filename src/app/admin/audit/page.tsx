import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";
import { PersonAvatar } from "@/components/admin/avatar";

export default async function AuditPage() {
  await requireAdminScreen("audit");
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 120,
    include: { actor: { select: { name: true } } }
  });
  return (
    <div>
      <AdminPageHeader screen="audit" />
      <Panel title="Immutable record" description="Administrative changes. Secrets are redacted before they are stored." bodyClassName="p-0">
        <ol className="divide-y divide-line">
          {logs.map((l) => (
            <li key={l.id} className="flex gap-3 px-4 py-3 text-sm">
              <PersonAvatar name={l.actor?.name || "System"} />
              <div className="min-w-0">
                <p>
                  <span className="font-medium">{l.actor?.name || "System"}</span> <span className="text-ink2">{l.action}</span>
                </p>
                <p className="truncate font-mono text-[11px] text-ink2">
                  {l.entityType}/{l.entityId} · {l.createdAt.toISOString()}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
