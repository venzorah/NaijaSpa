"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { adminBtn, adminField, FormRow } from "@/components/admin/form-row";
import { Panel } from "@/components/admin/panel";
import { adminJson } from "@/components/admin/json";
import {
  HOME_SECTION_IDS,
  HOME_SECTION_META,
  type HomeSection,
  type HomeSectionPickKind
} from "@/lib/home-sections";

type Option = { id: string; label: string; hint?: string };
type Payload = {
  canEdit: boolean;
  layout: HomeSection[];
  categories: { slug: string; name: string }[];
  vendors: { id: string; businessName: string; city: string; state: string }[];
  services: { id: string; name: string; vendorId: string; vendorName: string; categorySlug: string; categoryName: string }[];
};

function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

function Picker({
  label,
  hint,
  options,
  selected,
  disabled,
  onChange
}: {
  label: string;
  hint: string;
  options: Option[];
  selected: string[];
  disabled: boolean;
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(q));
  }, [options, query]);
  return (
    <FormRow label={label} hint={hint}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={disabled}
        placeholder={`Search ${label.toLowerCase()}`}
        className={`${adminField} mb-2`}
      />
      <div className="max-h-48 overflow-auto rounded-xl border border-line">
        {filtered.length ? (
          filtered.map((option) => (
            <label key={option.id} className="flex cursor-pointer items-start gap-2 border-b border-line px-3 py-2 text-sm last:border-0">
              <input
                type="checkbox"
                className="mt-0.5"
                disabled={disabled}
                checked={selected.includes(option.id)}
                onChange={() => onChange(toggleId(selected, option.id))}
              />
              <span>
                <span className="block font-medium">{option.label}</span>
                {option.hint ? <span className="block text-[11px] text-ink2">{option.hint}</span> : null}
              </span>
            </label>
          ))
        ) : (
          <p className="px-3 py-2 text-sm text-ink2">No matches.</p>
        )}
      </div>
      {selected.length ? <p className="mt-1 text-[11px] text-ink2">{selected.length} selected. Tick order is display order.</p> : null}
    </FormRow>
  );
}

export function HomepageConsole({ initial }: { initial: Payload }) {
  const [layout, setLayout] = useState(initial.layout);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const categoryOptions = initial.categories.map((row) => ({ id: row.slug, label: row.name, hint: row.slug }));
  const vendorOptions = initial.vendors.map((row) => ({
    id: row.id,
    label: row.businessName,
    hint: [row.city, row.state].filter(Boolean).join(", ")
  }));
  const serviceOptions = initial.services.map((row) => ({
    id: row.id,
    label: row.name,
    hint: [row.vendorName, row.categoryName].filter(Boolean).join(" · ")
  }));

  function patch(id: HomeSection["id"], next: Partial<HomeSection>) {
    setLayout((rows) => rows.map((row) => (row.id === id ? { ...row, ...next } : row)));
  }

  async function save() {
    if (busy || !initial.canEdit) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await adminJson<{ layout: HomeSection[] }>("/api/admin/homepage", {
        method: "PUT",
        body: JSON.stringify({ sections: layout })
      });
      setLayout(result.layout);
      setMessage("Saved. The public homepage now uses these sections.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const pickers: Record<HomeSectionPickKind, { label: string; hint: string; options: Option[]; key: "serviceIds" | "vendorIds" | "categorySlugs" }> = {
    services: { label: "Services", hint: "Chosen treatments appear first, in tick order.", options: serviceOptions, key: "serviceIds" },
    vendors: { label: "Providers", hint: "All live treatments from these providers can fill the section.", options: vendorOptions, key: "vendorIds" },
    categories: { label: "Categories", hint: "Limit the section to treatments or tiles in these categories.", options: categoryOptions, key: "categorySlugs" }
  };

  return (
    <div className="grid gap-4">
      {message ? <p role="status" className="text-sm text-goldink">{message}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-ink2">
          The hero banner and category tiles are not edited here. Automatic keeps ranking and paid ads. Manual shows only what you pick. Hide a rail to remove it without deleting ads.
        </p>
        <button className={adminBtn} disabled={!initial.canEdit || busy} onClick={() => void save()}>
          <Save className="h-3.5 w-3.5" />
          {busy ? "Saving…" : "Save homepage"}
        </button>
      </div>
      {HOME_SECTION_IDS.map((id) => {
        const section = layout.find((row) => row.id === id);
        if (!section) return null;
        const meta = HOME_SECTION_META[id];
        return (
          <Panel key={id} title={meta.label} description={meta.hint}>
            <div className="grid gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={section.visible}
                  disabled={!initial.canEdit}
                  onChange={(e) => patch(id, { visible: e.target.checked })}
                />
                Show on homepage
              </label>
              <FormRow label="Heading" htmlFor={`${id}-title`}>
                <input
                  id={`${id}-title`}
                  className={adminField}
                  maxLength={80}
                  disabled={!initial.canEdit}
                  value={section.title}
                  onChange={(e) => patch(id, { title: e.target.value })}
                />
              </FormRow>
              <FormRow label="Supporting line" htmlFor={`${id}-subtitle`}>
                <input
                  id={`${id}-subtitle`}
                  className={adminField}
                  maxLength={240}
                  disabled={!initial.canEdit}
                  value={section.subtitle}
                  onChange={(e) => patch(id, { subtitle: e.target.value })}
                />
              </FormRow>
              <FormRow label="What to show">
                <select
                  className={adminField}
                  disabled={!initial.canEdit}
                  value={section.source}
                  onChange={(e) => patch(id, { source: e.target.value === "manual" ? "manual" : "auto" })}
                >
                  <option value="auto">Automatic (ads and live ranking, optionally limited by category)</option>
                  <option value="manual">Manual picks only</option>
                </select>
              </FormRow>
              {meta.picks.map((kind) => {
                const picker = pickers[kind];
                return (
                  <Picker
                    key={kind}
                    label={picker.label}
                    hint={section.source === "auto" && kind !== "categories" ? "Used when you switch to manual picks." : picker.hint}
                    options={picker.options}
                    selected={section[picker.key]}
                    disabled={!initial.canEdit}
                    onChange={(next) => patch(id, { [picker.key]: next })}
                  />
                );
              })}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
