"use client";

import { useRouter } from "next/navigation";
import { Pause, Play } from "lucide-react";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminBtnOutline } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";

export function CampaignsConsole({
  rows,
  editable
}: {
  rows: {
    id: string;
    vendor: string;
    placement: string;
    service: string;
    active: boolean;
    priority: number;
    impressions: number;
    clicks: number;
    window: string;
  }[];
  editable: boolean;
}) {
  const router = useRouter();
  return (
    <Panel title="Placements" bodyClassName="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line text-[11px] uppercase tracking-wide text-ink2">
            <tr>
              <th className="px-4 py-2 font-medium">Vendor</th>
              <th className="px-2 py-2 font-medium">Placement</th>
              <th className="px-2 py-2 font-medium">Window</th>
              <th className="px-2 py-2 text-right font-medium">Imps</th>
              <th className="px-2 py-2 text-right font-medium">Clicks</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2">
                  <p className="text-xs font-medium">{c.vendor}</p>
                  <p className="text-[11px] text-ink2">{c.service}</p>
                </td>
                <td className="px-2 py-2 text-xs">{c.placement}</td>
                <td className="px-2 py-2 text-xs">{c.window}</td>
                <td className="px-2 py-2 text-right text-xs tabular-nums">{c.impressions}</td>
                <td className="px-2 py-2 text-right text-xs tabular-nums">{c.clicks}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <AdminStatusPill status={c.active ? "Live" : "Paused"} />
                    <button
                      type="button"
                      className={adminBtnOutline}
                      disabled={!editable}
                      onClick={async () => {
                        await adminJson(`/api/admin/campaigns/${c.id}`, { method: "PATCH", body: JSON.stringify({ active: !c.active }) });
                        router.refresh();
                      }}
                    >
                      {c.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="px-4 py-8 text-sm text-ink2">No sponsored campaigns yet.</p> : null}
      </div>
    </Panel>
  );
}
