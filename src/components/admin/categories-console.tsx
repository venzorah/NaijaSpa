"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, FolderPlus, FolderTree, Save } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { cn } from "@/lib/cn";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
  services: number;
  vendors: number;
};

export function CategoriesConsole({ rows, editable }: { rows: AdminCategory[]; editable: boolean }) {
  const router = useRouter();
  const [list, setList] = useState(rows);
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "");
  const selected = list.find((c) => c.id === selectedId);

  function move(index: number, dir: -1 | 1) {
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Panel title="Display order" description="Order shown on the customer homepage and app" className="xl:col-span-3" bodyClassName="p-0">
        <div className="flex justify-end border-b border-line p-3">
          <button
            type="button"
            className={adminBtn}
            disabled={!editable}
            onClick={async () => {
              await adminJson("/api/admin/categories", {
                method: "POST",
                body: JSON.stringify({ name: "New category", slug: `new-category-${Date.now().toString(36)}` })
              });
              router.refresh();
            }}
          >
            <FolderPlus className="h-3.5 w-3.5" aria-hidden /> New category
          </button>
        </div>
        {list.length === 0 ? (
          <EmptyState icon={FolderTree} title="No categories" text="Create your first category to start organising services." />
        ) : (
          <ol className="divide-y divide-line">
            {list.map((c, i) => (
              <li key={c.id} className={cn("flex items-center gap-3 px-4 py-2.5", c.id === selectedId && "bg-gold/5")}>
                <span className="w-5 text-right font-mono text-[11px] text-ink2">{i + 1}</span>
                <div className="flex flex-col">
                  <button type="button" className="rounded p-0.5 hover:bg-elev disabled:opacity-30" disabled={!editable || i === 0} aria-label={`Move ${c.name} up`} onClick={() => move(i, -1)}>
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button type="button" className="rounded p-0.5 hover:bg-elev disabled:opacity-30" disabled={!editable || i === list.length - 1} aria-label={`Move ${c.name} down`} onClick={() => move(i, 1)}>
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>
                <button type="button" onClick={() => setSelectedId(c.id)} className="min-w-0 flex-1 text-left">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="block text-[11px] text-ink2">
                    /{c.slug} · {c.services} services · {c.vendors} vendors
                  </span>
                </button>
                <AdminStatusPill status={c.active ? "Active" : "Inactive"} />
              </li>
            ))}
          </ol>
        )}
        <div className="flex justify-end border-t border-line p-3">
          <button
            type="button"
            className={adminBtnOutline}
            disabled={!editable}
            onClick={async () => {
              await adminJson(`/api/admin/categories/${list[0]?.id ?? "x"}`, {
                method: "PATCH",
                body: JSON.stringify({ order: list.map((c) => c.id) })
              });
              router.refresh();
            }}
          >
            <Save className="h-3.5 w-3.5" aria-hidden /> Publish order
          </button>
        </div>
      </Panel>
      <Panel title={selected ? `Edit · ${selected.name}` : "Edit category"} className="xl:col-span-2">
        {selected ? (
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              await adminJson(`/api/admin/categories/${selected.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  name: String(fd.get("name") || ""),
                  slug: String(fd.get("slug") || ""),
                  description: String(fd.get("description") || "")
                })
              });
              router.refresh();
            }}
          >
            <FormRow label="Name" htmlFor="cat-name">
              <input id="cat-name" name="name" disabled={!editable} defaultValue={selected.name} className={adminField} />
            </FormRow>
            <FormRow label="URL slug" htmlFor="cat-slug" hint={`naijaspa.com/category/${selected.slug}`}>
              <input id="cat-slug" name="slug" disabled={!editable} defaultValue={selected.slug} className={`${adminField} font-mono text-xs`} />
            </FormRow>
            <FormRow label="Description" htmlFor="cat-desc">
              <textarea id="cat-desc" name="description" rows={3} disabled={!editable} defaultValue={selected.description} className={adminField} />
            </FormRow>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              {selected.active ? (
                <ConfirmAction
                  triggerLabel="Deactivate"
                  disabled={!editable}
                  title={`Deactivate ${selected.name}?`}
                  description="The category disappears from navigation and search filters."
                  confirmLabel="Deactivate category"
                  onConfirm={async () => {
                    await adminJson(`/api/admin/categories/${selected.id}`, { method: "PATCH", body: JSON.stringify({ active: false }) });
                    router.refresh();
                  }}
                />
              ) : (
                <button
                  type="button"
                  className={adminBtnOutline}
                  disabled={!editable}
                  onClick={async () => {
                    await adminJson(`/api/admin/categories/${selected.id}`, { method: "PATCH", body: JSON.stringify({ active: true }) });
                    router.refresh();
                  }}
                >
                  Activate
                </button>
              )}
              <button type="submit" className={adminBtn} disabled={!editable}>
                <Save className="h-3.5 w-3.5" aria-hidden /> Save changes
              </button>
            </div>
          </form>
        ) : (
          <EmptyState icon={FolderTree} title="Nothing selected" text="Pick a category to edit." />
        )}
      </Panel>
    </div>
  );
}
