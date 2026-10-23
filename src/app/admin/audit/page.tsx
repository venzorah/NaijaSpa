import { prisma } from "@/lib/db";

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div>
      <h1 className="font-display text-3xl">Audit log</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {logs.map((l) => (
          <li key={l.id} className="rounded-xl border border-line bg-card p-3">
            {l.createdAt.toISOString()} · {l.action} · {l.entityType}/{l.entityId}
          </li>
        ))}
      </ul>
    </div>
  );
}
