"use client";

import { useEffect, useState } from "react";

type VendorService = {
  id: string;
  name: string;
  basePriceKobo: number;
  hotelAddonKobo: number;
  homeAddonKobo: number;
};

function naira(kobo: number) {
  return Math.round(kobo / 100);
}

function kobo(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export default function VendorServices() {
  const [services, setServices] = useState<VendorService[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { hotel: string; home: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = () => {
    fetch("/api/vendor/services")
      .then((r) => r.json())
      .then((j) => {
        const rows = (j.services || []) as VendorService[];
        setServices(rows);
        setDrafts(
          Object.fromEntries(
            rows.map((s) => [s.id, { hotel: String(naira(s.hotelAddonKobo ?? 0)), home: String(naira(s.homeAddonKobo ?? 0)) }])
          )
        );
      });
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setSaving(id);
    setMessage("");
    const res = await fetch("/api/vendor/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        hotelAddonKobo: kobo(draft.hotel),
        homeAddonKobo: kobo(draft.home)
      })
    });
    setSaving(null);
    if (!res.ok) {
      setMessage("Could not save add-on prices.");
      return;
    }
    setMessage("Add-on prices saved. They are added to the treatment total at checkout.");
    load();
  };

  return (
    <div>
      <h1 className="font-display text-3xl">Services</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink2">
        Spa/Office has no extra charge. Set your Hotel service and Home service add-on prices in naira. The selected
        add-on is added to the treatment total.
      </p>
      {message ? <p className="mt-3 text-sm font-medium text-forest">{message}</p> : null}
      <ul className="mt-4 space-y-3">
        {services.map((s) => {
          const draft = drafts[s.id] ?? { hotel: "0", home: "0" };
          return (
            <li key={s.id} className="rounded-2xl border border-line bg-card p-4">
              <p className="font-semibold">
                {s.name} · ₦{naira(s.basePriceKobo).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-ink2">Spa/Office extra: ₦0</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  Hotel service add-on ₦
                  <input
                    type="number"
                    min={0}
                    value={draft.hotel}
                    onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: { ...draft, hotel: e.target.value } }))}
                    className="ml-2 min-h-11 w-28 rounded-xl border border-line bg-elev px-2"
                  />
                </label>
                <label className="text-sm">
                  Home service add-on ₦
                  <input
                    type="number"
                    min={0}
                    value={draft.home}
                    onChange={(e) => setDrafts((d) => ({ ...d, [s.id]: { ...draft, home: e.target.value } }))}
                    className="ml-2 min-h-11 w-28 rounded-xl border border-line bg-elev px-2"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => save(s.id)}
                disabled={saving === s.id}
                className="mt-3 min-h-11 rounded-full bg-gold px-5 font-bold text-ongold disabled:opacity-50"
              >
                {saving === s.id ? "Saving…" : "Save add-ons"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
