"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { formatNairaPlain, locationLabel } from "@/lib/booking-ui";
import { BookingStepper } from "@/components/booking-stepper";

type LocationType = "spa" | "hotel" | "home";
type Quote = { customerTotalKobo: number; surchargeKobo: number; basePriceKobo: number };

function BookForm() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [locationType, setLocationType] = useState<LocationType>(() => {
    const loc = search.get("location");
    return loc === "hotel" || loc === "home" || loc === "spa" ? loc : "spa";
  });
  const [details, setDetails] = useState(() => search.get("details") || "");
  const [startsAt, setStartsAt] = useState(() => search.get("startsAt") || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const pending = sessionStorage.getItem("naijaspa-pending-booking");
    if (!pending) return;
    try {
      const parsed = JSON.parse(pending) as {
        serviceId?: string;
        locationType?: LocationType;
        details?: string;
        startsAt?: string;
      };
      if (parsed.serviceId && parsed.serviceId !== serviceId) return;
      if (parsed.locationType) setLocationType(parsed.locationType);
      if (parsed.details) setDetails(parsed.details);
      if (parsed.startsAt) setStartsAt(parsed.startsAt);
    } catch {
      /* ignore */
    }
  }, [serviceId]);

  useEffect(() => {
    fetch(`/api/quote?serviceId=${serviceId}&location=${locationType}`)
      .then((r) => r.json())
      .then(setQuote)
      .catch(() => setQuote(null));
  }, [serviceId, locationType]);

  const needsAddress = locationType === "hotel" || locationType === "home";

  const localValue = useMemo(() => {
    if (!startsAt) return "";
    return startsAt.length === 16 ? startsAt : startsAt.slice(0, 16);
  }, [startsAt]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 pb-24">
      <BookingStepper current={3} />
      <h1 className="mt-6 font-display text-4xl">Review total</h1>
      <p className="mt-2 text-sm text-ink2">
        Confirm location and time. Payment is next. The booking is only confirmed after payment verification.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError("");
          setSubmitting(true);
          const payload = {
            serviceId,
            locationType,
            locationDetails: details,
            startsAt,
            idempotencyKey: crypto.randomUUID()
          };
          const res = await fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          setSubmitting(false);
          if (res.status === 401) {
            sessionStorage.setItem("naijaspa-pending-booking", JSON.stringify({ serviceId, locationType, details, startsAt }));
            const next = `/book/${serviceId}?${new URLSearchParams({ location: locationType, startsAt, details }).toString()}`;
            router.push(`/login?next=${encodeURIComponent(next)}`);
            return;
          }
          if (!res.ok) {
            setError(json.error || "Could not create booking");
            return;
          }
          sessionStorage.removeItem("naijaspa-pending-booking");
          router.push(`/checkout/${json.id}`);
        }}
      >
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Service location</legend>
          {(["spa", "hotel", "home"] as const).map((l) => (
            <label
              key={l}
              className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-sm font-semibold ${
                locationType === l ? "border-forest bg-forest/10" : "border-line bg-card"
              }`}
            >
              <input type="radio" name="loc" className="accent-forest" checked={locationType === l} onChange={() => setLocationType(l)} />
              {locationLabel(l)}
            </label>
          ))}
        </fieldset>
        {needsAddress && (
          <textarea
            required
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Address / hotel name and room"
            className="min-h-24 w-full rounded-2xl border border-line bg-card p-3"
          />
        )}
        <label className="block text-sm font-semibold">
          Date and time (Africa/Lagos)
          <input
            required
            type="datetime-local"
            value={localValue}
            onChange={(e) => setStartsAt(e.target.value)}
            className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-card px-3 font-normal"
          />
        </label>
        {quote && (
          <div className="space-y-2 rounded-[1.4rem] border border-line bg-card p-5 text-sm">
            <div className="flex justify-between text-ink2">
              <span>Base</span>
              <span>{formatNairaPlain(quote.basePriceKobo)}</span>
            </div>
            <div className="flex justify-between text-ink2">
              <span>{locationLabel(locationType)} surcharge</span>
              <span>{quote.surchargeKobo ? formatNairaPlain(quote.surchargeKobo) : "₦0"}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-bold">
              <span>Total</span>
              <span>{formatNairaPlain(quote.customerTotalKobo)}</span>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button disabled={submitting} className="min-h-12 w-full rounded-full bg-gold font-bold text-ongold disabled:opacity-60">
          {submitting ? "Saving…" : "Continue to payment"}
        </button>
      </form>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-4 py-8 text-sm text-ink2">Loading booking…</div>}>
      <BookForm />
    </Suspense>
  );
}
