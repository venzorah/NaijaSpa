"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function BookPage() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const router = useRouter();
  const [quote, setQuote] = useState<{ customerTotalKobo: number; surchargeKobo: number; basePriceKobo: number } | null>(null);
  const [locationType, setLocationType] = useState<"spa" | "hotel" | "home">("spa");
  const [details, setDetails] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/quote?serviceId=${serviceId}&location=${locationType}`)
      .then((r) => r.json())
      .then(setQuote)
      .catch(() => setQuote(null));
  }, [serviceId, locationType]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="font-display text-3xl">Complete booking</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          const res = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              serviceId,
              locationType,
              locationDetails: details,
              startsAt,
              idempotencyKey: crypto.randomUUID()
            })
          });
          const json = await res.json();
          if (res.status === 401) {
            sessionStorage.setItem("naijaspa-pending-booking", JSON.stringify({ serviceId, locationType, details, startsAt }));
            router.push(`/login?next=/book/${serviceId}`);
            return;
          }
          if (!res.ok) {
            setError(json.error || "Could not create booking");
            return;
          }
          router.push(`/checkout/${json.id}`);
        }}
      >
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Service location</legend>
          {(["spa", "hotel", "home"] as const).map((l) => (
            <label key={l} className="flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-card px-3">
              <input type="radio" name="loc" checked={locationType === l} onChange={() => setLocationType(l)} />
              {l === "spa" ? "Spa/Office" : l[0].toUpperCase() + l.slice(1)}
            </label>
          ))}
        </fieldset>
        {(locationType === "hotel" || locationType === "home") && (
          <textarea required value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Address / hotel name and room" className="min-h-24 w-full rounded-2xl border border-line bg-card p-3" />
        )}
        <label className="block text-sm">
          Date and time (Africa/Lagos)
          <input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-card px-3" />
        </label>
        {quote && (
          <div className="rounded-2xl border border-line bg-card p-4 text-sm">
            <p>Base {quote.basePriceKobo / 100}</p>
            <p>Surcharge {quote.surchargeKobo / 100}</p>
            <p className="font-bold">Total ₦{(quote.customerTotalKobo / 100).toLocaleString()}</p>
          </div>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button className="min-h-12 w-full rounded-full bg-gold font-bold text-ongold">Continue to payment</button>
      </form>
    </div>
  );
}
