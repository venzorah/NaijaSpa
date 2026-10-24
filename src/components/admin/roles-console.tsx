"use client";

import { useRouter } from "next/navigation";
import { ADMIN_ROLE_LABELS } from "@/lib/admin";
import { Panel } from "@/components/admin/panel";
import { adminField } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";

const ROLES = Object.keys(ADMIN_ROLE_LABELS);

export function RolesConsole({
  admins,
  editable,
  selfId
}: {
  admins: { id: string; name: string; email: string; role: string }[];
  editable: boolean;
  selfId: string;
}) {
  const router = useRouter();
  return (
    <Panel title="Admin accounts" description="Gmail cannot create admins. Assign roles only among people who already have admin access.">
      <ul className="space-y-2">
        {admins.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-[11px] text-ink2">{a.email}</p>
            </div>
            <select
              defaultValue={a.role}
              disabled={!editable || a.id === selfId}
              className={`${adminField} w-56`}
              onChange={async (e) => {
                await adminJson("/api/admin/roles", { method: "PATCH", body: JSON.stringify({ userId: a.id, role: e.target.value }) });
                router.refresh();
              }}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ADMIN_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
