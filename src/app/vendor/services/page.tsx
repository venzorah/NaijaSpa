"use client";

import { useEffect, useState } from "react";

export default function VendorServices() {
  const [services, setServices] = useState<Array<{ id: string; name: string; basePriceKobo: number }>>([]);
  useEffect(() => {
    fetch("/api/vendor/services")
      .then((r) => r.json())
      .then((j) => setServices(j.services || []));
  }, []);
  return (
    <div>
      <h1 className="font-display text-3xl">Services</h1>
      <p className="text-sm text-ink2">Unlimited listings on every plan. Deactivate rather than destroy records tied to bookings.</p>
      <ul className="mt-4 space-y-2">
        {services.map((s) => (
          <li key={s.id} className="rounded-2xl border border-line bg-card p-3">
            {s.name} · ₦{(s.basePriceKobo / 100).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
