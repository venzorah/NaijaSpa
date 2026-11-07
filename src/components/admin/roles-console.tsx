"use client";
import { AdminAccountControls } from "./account-controls";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALL_ADMIN, ROLES, type Permission } from "@/lib/rbac";
import { ADMIN_PERMISSION_ROWS } from "@/lib/admin";
import type { AdminRoleDefinition } from "@/lib/admin-role-store";
import { Panel } from "@/components/admin/panel";
import { EditorModal } from "@/components/admin/editor-modal";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { adminBtn, adminBtnOutline, adminField } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";

const labels: Record<string, string> = Object.fromEntries(ADMIN_PERMISSION_ROWS.map(row => [row.permission, row.action]));
labels["admin.access"] = "Open the admin dashboard";
labels["analytics.view"] = "View analytics";
labels["roles.manage"] = "System settings and roles overview (role changes remain super-admin only)";
export function RolesConsole({ roles, admins, editable, selfId }: { roles: AdminRoleDefinition[]; admins: { id: string; name: string; email: string; role: string; status: string }[]; editable: boolean; selfId: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminRoleDefinition | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function perform(fn: () => Promise<unknown>, success: string) {
    setBusy(true); setMessage("");
    try { await fn(); setMessage(success); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Request failed"); throw error; }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    {message ? <p role="status" className="text-sm text-goldink">{message}</p> : null}
    <Panel title="Roles & responsibilities" description="Permissions apply to pages and backend actions. Only super administrators can change roles and assignments.">
      <button type="button" className={adminBtn} disabled={!editable || busy} onClick={() => { setMessage(""); setEditing({ key: "", label: "", permissions: ["admin.access"], builtIn: false }); }}>Create role</button>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">{roles.map(role => <li key={role.key} className="rounded-xl border border-line p-4">
        <div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{role.label}</h2><p className="mt-1 text-xs text-ink2">{role.builtIn ? "Built-in" : "Custom"} · {admins.filter(user => user.role === role.key).length} accounts · {role.permissions.length} permissions</p></div><button type="button" className={adminBtnOutline} disabled={busy} onClick={() => { setMessage(""); setEditing({ ...role, permissions: [...role.permissions] }); }}>{editable && role.key !== ROLES.SUPER_ADMIN ? "Edit" : "View"}</button></div>
        <ul className="mt-3 space-y-1 text-xs text-ink2">{role.permissions.map(permission => <li key={permission}>{labels[permission]}</li>)}</ul>
      </li>)}</ul>
    </Panel>
    <Panel title="Admin account assignments" description="Assign roles to existing admin accounts. Reassignment signs the account out so it must sign in with its new access.">
      <div className="mb-4"><AdminAccountControls roles={roles} editable={editable} selfId={selfId}/></div><ul className="space-y-2">{admins.map(user => <li key={user.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3"><div><p className="text-sm font-medium">{user.name}{user.id === selfId ? " (you)" : ""}</p><p className="text-xs text-ink2">{user.email}</p></div>
        <select aria-label={`Role for ${user.name}`} className={`${adminField} max-w-72`} value={user.role} disabled={!editable || user.id === selfId || busy} onChange={e => { const role = e.target.value; void perform(() => adminJson("/api/admin/roles", { method: "PATCH", body: JSON.stringify({ userId: user.id, role }) }), "Role assigned. The account can sign in again.").catch(() => {}); }}>{roles.map(role => <option key={role.key} value={role.key}>{role.label}</option>)}</select>
        <AdminAccountControls user={user} roles={roles} editable={editable} selfId={selfId}/>
      </li>)}</ul>
    </Panel>
    {editing ? <EditorModal title={editing.key ? `Role · ${editing.label}` : "Create role"} busy={busy} onClose={() => setEditing(null)}>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (!editable || editing.key === ROLES.SUPER_ADMIN) return; void perform(() => adminJson("/api/admin/roles", { method: editing.key ? "PUT" : "POST", body: JSON.stringify(editing) }), editing.key ? "Role updated. Access changes apply on the next request." : "Role created.").then(() => setEditing(null)).catch(() => {}); }}>
        {message ? <p role="status" className="text-sm text-goldink">{message}</p> : null}
        <label className="block text-sm">Role name<input data-initial-focus required minLength={2} maxLength={80} className={`${adminField} mt-1`} value={editing.label} disabled={busy || !editable || editing.key === ROLES.SUPER_ADMIN} onChange={e => setEditing({ ...editing, label: e.target.value })} /></label>
        <fieldset disabled={busy || !editable || editing.key === ROLES.SUPER_ADMIN} className="space-y-2"><legend className="mb-2 text-sm font-semibold">Responsibilities</legend>{ALL_ADMIN.map(permission => <label key={permission} className="flex items-start gap-2 rounded-lg border border-line p-3 text-sm"><input type="checkbox" className="mt-1" disabled={permission === "admin.access"} checked={editing.permissions.includes(permission)} onChange={e => setEditing({ ...editing, permissions: e.target.checked ? [...editing.permissions, permission] : editing.permissions.filter(value => value !== permission) as Permission[] })} /><span>{labels[permission]}</span></label>)}</fieldset>
        <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-4">
          {!editing.builtIn && editing.key && editable ? <ConfirmAction triggerLabel="Remove role" title="Remove this role?" description="Assigned accounts must be reassigned first. Built-in roles cannot be removed." confirmLabel="Remove role" disabled={busy} onConfirm={async () => { await perform(() => adminJson("/api/admin/roles", { method: "DELETE", body: JSON.stringify(editing) }), "Role removed."); setEditing(null); }} /> : <span />}
          <div className="flex gap-2"><button type="button" className={adminBtnOutline} disabled={busy} onClick={() => setEditing(null)}>Close</button>{editable && editing.key !== ROLES.SUPER_ADMIN ? <button className={adminBtn} disabled={busy}>{busy ? "Saving…" : "Save role"}</button> : null}</div>
        </div>
      </form>
    </EditorModal> : null}
  </div>;
}
