import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { AiProviderSettings } from "@/components/admin/ai-provider-settings";
import { aiProviderStatus, getAiSettings } from "@/lib/ai-settings";

export default async function Page() {
  const { editable } = await requireAdminScreen("ai");
  const logs = await prisma.aiSearchLog.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
  const settings = await getAiSettings();
  return (
    <div>
      <AdminPageHeader screen="ai" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel title="Provider" description="Keys stay in environment variables, never in the database.">
          <AiProviderSettings initial={settings} configured={aiProviderStatus()} editable={editable} />
        </Panel>
        <Panel title="Recent queries" className="xl:col-span-2" bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate">{l.query}</p>
                  <p className="text-[11px] text-ink2">{l.createdAt.toLocaleString("en-NG")}</p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="tabular-nums">{l.resultCount} hits</span>
                  <AdminStatusPill status={l.usedFallback ? "Fallback" : "Live"} />
                </div>
              </li>
            ))}
            {logs.length === 0 ? <p className="px-4 py-8 text-sm text-ink2">No AI searches logged yet.</p> : null}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
