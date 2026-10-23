"use client";

import { useEffect, useState } from "react";

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Array<{ id: string; businessName: string; applicationStatus: string; city: string }>>([]);
  const [msg, setMsg] = useState("");
  async function load() {
    const res = await fetch("/api/admin/vendors");
    const json = await res.json();
    setVendors(json.vendors || []);
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <div>
      <h1 className="font-display text-3xl">Vendors</h1>
      <form
        className="mt-4 grid gap-2 rounded-2xl border border-line bg-card p-4 md:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const res = await fetch("/api/admin/vendors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: fd.get("email"), businessName: fd.get("businessName"), city: fd.get("city") })
          });
          const json = await res.json();
          setMsg(json.setupUrl ? `Invite created. Setup path: ${json.setupUrl}` : json.error);
          load();
        }}
      >
        <input name="email" type="email" required placeholder="Vendor email" className="min-h-11 rounded-xl bg-elev px-3" />
        <input name="businessName" required placeholder="Business name" className="min-h-11 rounded-xl bg-elev px-3" />
        <input name="city" required placeholder="City" className="min-h-11 rounded-xl bg-elev px-3" />
        <button className="rounded-full bg-gold font-bold text-ongold">Create & invite</button>
      </form>
      {msg && <p className="mt-2 text-sm text-ink2">{msg}</p>}
      <ul className="mt-6 space-y-2">
        {vendors.map((v) => (
          <li key={v.id} className="flex items-center justify-between rounded-2xl border border-line bg-card p-3 text-sm">
            <span>
              {v.businessName} · {v.city} · {v.applicationStatus}
            </span>
            <button
              className="rounded-full border border-line px-3 py-1"
              onClick={async () => {
                await fetch(`/api/admin/vendors/${v.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ applicationStatus: "approved", visibility: "public", verificationStatus: "verified" })
                });
                load();
              }}
            >
              Approve
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
