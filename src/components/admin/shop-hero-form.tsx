"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminImageField } from "@/components/admin/image-field";
import { adminBtn, adminField } from "@/components/admin/form-row";
import { adminJson } from "@/components/admin/json";
import type { ShopHeroSlide } from "@/lib/shop/hero";

export function ShopHeroForm() {
  const [slides, setSlides] = useState<ShopHeroSlide[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const data = await adminJson<{ slides: ShopHeroSlide[] }>("/api/admin/shop/hero");
    setSlides(data.slides);
  }, []);
  useEffect(() => {
    void load().catch((e) => setMessage(e instanceof Error ? e.message : "Could not load hero slides."));
  }, [load]);

  if (!slides) return <p className="mt-4 text-sm">Loading…</p>;

  return (
    <form
      key={JSON.stringify(slides)}
      className="mt-6 grid gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (busy) return;
        const fd = new FormData(e.currentTarget);
        const next = slides.map((_, index) => ({
          kicker: String(fd.get(`kicker-${index}`) || ""),
          title: String(fd.get(`title-${index}`) || ""),
          body: String(fd.get(`body-${index}`) || ""),
          imageUrl: String(fd.get(`imageUrl-${index}`) || ""),
          primaryLabel: String(fd.get(`primaryLabel-${index}`) || ""),
          primaryHref: String(fd.get(`primaryHref-${index}`) || ""),
          secondaryLabel: String(fd.get(`secondaryLabel-${index}`) || ""),
          secondaryHref: String(fd.get(`secondaryHref-${index}`) || "")
        }));
        setBusy(true);
        setMessage("");
        void adminJson("/api/admin/shop/hero", { method: "PUT", body: JSON.stringify({ slides: next }) })
          .then(() => load())
          .then(() => setMessage("Saved. Shop homepage uses these three slides."))
          .catch((err) => setMessage(err instanceof Error ? err.message : "Could not save"))
          .finally(() => setBusy(false));
      }}
    >
      <p className="text-sm text-ink2">
        Shop paths start with <code>/search</code> or <code>/sell</code>. Links to the main site must be full https URLs such as{" "}
        <code>https://naijaspa.com</code>.
      </p>
      {slides.map((slide, index) => (
        <section key={slide.id} className="rounded-3xl border border-line bg-card p-5">
          <h2 className="mb-4 font-display text-xl">Slide {index + 1}</h2>
          <fieldset disabled={busy} className="grid gap-3 disabled:opacity-60">
            <label className="block text-sm">
              Kicker
              <input name={`kicker-${index}`} required maxLength={80} defaultValue={slide.kicker} className={`${adminField} mt-1`} />
            </label>
            <label className="block text-sm">
              Title
              <input name={`title-${index}`} required maxLength={120} defaultValue={slide.title} className={`${adminField} mt-1`} />
            </label>
            <label className="block text-sm">
              Details
              <textarea name={`body-${index}`} required maxLength={280} defaultValue={slide.body} rows={3} className={`${adminField} mt-1`} />
            </label>
            <AdminImageField name={`imageUrl-${index}`} label="Product sample" defaultValue={slide.imageUrl} onBusyChange={setBusy} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Primary button
                <input name={`primaryLabel-${index}`} required maxLength={40} defaultValue={slide.primaryLabel} className={`${adminField} mt-1`} />
              </label>
              <label className="block text-sm">
                Primary link
                <input name={`primaryHref-${index}`} required maxLength={500} defaultValue={slide.primaryHref} className={`${adminField} mt-1`} />
              </label>
              <label className="block text-sm">
                Secondary button
                <input name={`secondaryLabel-${index}`} required maxLength={40} defaultValue={slide.secondaryLabel} className={`${adminField} mt-1`} />
              </label>
              <label className="block text-sm">
                Secondary link
                <input name={`secondaryHref-${index}`} required maxLength={500} defaultValue={slide.secondaryHref} className={`${adminField} mt-1`} />
              </label>
            </div>
          </fieldset>
        </section>
      ))}
      <button className={adminBtn} disabled={busy}>
        {busy ? "Saving…" : "Save all three slides"}
      </button>
      {message ? <p className="text-sm text-goldink">{message}</p> : null}
    </form>
  );
}
