"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, FolderPlus, FolderTree, ImagePlus, Save } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { adminBtn, adminBtnOutline, adminField, FormRow } from "@/components/admin/form-row";
import { Panel } from "@/components/admin/panel";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { adminJson } from "@/components/admin/json";
import { categoryImage } from "@/lib/category-images";
import { cn } from "@/lib/cn";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  synonyms: string;
  metaTitle: string;
  metaDescription: string;
  imageUrl: string | null;
  active: boolean;
  services: number;
  vendors: number;
};

export function CategoriesConsole({ rows, editable }: { rows: AdminCategory[]; editable: boolean }) {
  const router = useRouter();
  const [list, setList] = useState(rows);
  const [selectedId, setSelectedId] = useState(rows[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const selected = list.find((c) => c.id === selectedId);

  useEffect(() => {
    setList(rows);
    setSelectedId((current) => (rows.some((c) => c.id === current) ? current : (rows[0]?.id ?? "")));
  }, [rows]);

  function move(index: number, dir: -1 | 1) {
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setList(next);
  }

  async function run(label: string, fn: () => Promise<void>) {
    setMessage("");
    try {
      await fn();
      setMessage(label);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Panel title="Display order" description="Order and images shown on the customer homepage and app" className="xl:col-span-3" bodyClassName="p-0">
        <div className="flex justify-end border-b border-line p-3">
          <button
            type="button"
            className={adminBtn}
            disabled={!editable}
            onClick={() =>
              run("Category created. Add an image and SEO, then activate.", async () => {
                await adminJson("/api/admin/categories", {
                  method: "POST",
                  body: JSON.stringify({ name: "New category", slug: `new-category-${Date.now().toString(36)}` })
                });
              })
            }
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={categoryImage(c.slug, c.imageUrl)} alt="" className="h-10 w-10 rounded-lg object-cover" />
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
            onClick={() =>
              run("Order published.", async () => {
                await adminJson(`/api/admin/categories/${list[0]?.id ?? "x"}`, {
                  method: "PATCH",
                  body: JSON.stringify({ order: list.map((c) => c.id) })
                });
              })
            }
          >
            <Save className="h-3.5 w-3.5" aria-hidden /> Publish order
          </button>
        </div>
      </Panel>
      <Panel title={selected ? `Edit · ${selected.name}` : "Edit category"} className="xl:col-span-2">
        {message ? <p className="mb-3 text-sm text-goldink">{message}</p> : null}
        {selected ? (
          <form
            key={`${selected.id}:${selected.imageUrl ?? ""}`}
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void run("Category saved.", async () => {
                await adminJson(`/api/admin/categories/${selected.id}`, {
                  method: "PATCH",
                  body: JSON.stringify({
                    name: String(fd.get("name") || ""),
                    slug: String(fd.get("slug") || ""),
                    description: String(fd.get("description") || ""),
                    synonyms: String(fd.get("synonyms") || ""),
                    metaTitle: String(fd.get("metaTitle") || ""),
                    metaDescription: String(fd.get("metaDescription") || ""),
                    imageUrl: String(fd.get("imageUrl") || "") || null
                  })
                });
              });
            }}
          >
            <div className="overflow-hidden rounded-xl border border-line bg-elev">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={categoryImage(selected.slug, selected.imageUrl)} alt="" className="h-36 w-full object-cover" />
              <div className="space-y-2 p-3">
                <p className="text-xs font-medium">Category image</p>
                <p className="text-[11px] text-ink2">Shown on the homepage, explore, and category landing. JPEG, PNG, WebP or GIF · 2 MB max.</p>
                <label className={`${adminBtnOutline} cursor-pointer ${!editable ? "pointer-events-none opacity-50" : ""}`}>
                  <ImagePlus className="h-3.5 w-3.5" aria-hidden /> Upload image
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={!editable}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      void run("Image uploaded.", async () => {
                        const data = new FormData();
                        data.set("file", file);
                        const res = await fetch(`/api/admin/categories/${selected.id}/image`, { method: "POST", body: data });
                        const json = (await res.json().catch(() => ({}))) as {
                          error?: string;
                          category?: { id: string; imageUrl: string | null };
                        };
                        if (!res.ok) throw new Error(json.error || "Upload failed");
                        if (json.category) {
                          setList((prev) =>
                            prev.map((c) => (c.id === json.category!.id ? { ...c, imageUrl: json.category!.imageUrl } : c))
                          );
                        }
                      });
                    }}
                  />
                </label>
                <FormRow label="Or image URL" htmlFor="cat-image" hint="Leave blank to keep the uploaded file. /photos/… or https://">
                  <input id="cat-image" name="imageUrl" disabled={!editable} defaultValue={selected.imageUrl ?? ""} className={adminField} />
                </FormRow>
              </div>
            </div>
            <FormRow label="Name" htmlFor="cat-name">
              <input id="cat-name" name="name" required disabled={!editable} defaultValue={selected.name} className={adminField} />
            </FormRow>
            <FormRow label="URL slug" htmlFor="cat-slug" hint={`naijaspa.com/category/${selected.slug}`}>
              <input id="cat-slug" name="slug" required disabled={!editable} defaultValue={selected.slug} className={`${adminField} font-mono text-xs`} />
            </FormRow>
            <FormRow label="Description" htmlFor="cat-desc" hint="Shown on the category page under the title.">
              <textarea id="cat-desc" name="description" rows={3} disabled={!editable} defaultValue={selected.description} className={adminField} />
            </FormRow>
            <FormRow label="Search synonyms" htmlFor="cat-syn" hint="Comma-separated terms that should match this category.">
              <input id="cat-syn" name="synonyms" disabled={!editable} defaultValue={selected.synonyms} className={adminField} />
            </FormRow>
            <FormRow label="Meta title" htmlFor="cat-meta-title" hint="Search result title. Defaults to the category name. Aim for under 60 characters.">
              <input id="cat-meta-title" name="metaTitle" maxLength={80} disabled={!editable} defaultValue={selected.metaTitle} className={adminField} />
            </FormRow>
            <FormRow label="Meta description" htmlFor="cat-meta-desc" hint="Search result snippet. Aim for under 160 characters.">
              <textarea id="cat-meta-desc" name="metaDescription" maxLength={320} rows={3} disabled={!editable} defaultValue={selected.metaDescription} className={adminField} />
            </FormRow>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
              {selected.active ? (
                <ConfirmAction
                  triggerLabel="Deactivate"
                  disabled={!editable}
                  title={`Deactivate ${selected.name}?`}
                  description="The category disappears from navigation and search filters."
                  confirmLabel="Deactivate category"
                  onConfirm={() =>
                    run("Category deactivated.", async () => {
                      await adminJson(`/api/admin/categories/${selected.id}`, { method: "PATCH", body: JSON.stringify({ active: false }) });
                    })
                  }
                />
              ) : (
                <button
                  type="button"
                  className={adminBtnOutline}
                  disabled={!editable}
                  onClick={() =>
                    run("Category activated.", async () => {
                      await adminJson(`/api/admin/categories/${selected.id}`, { method: "PATCH", body: JSON.stringify({ active: true }) });
                    })
                  }
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
