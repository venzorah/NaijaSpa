"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { formatNairaPlain, locationAddonLabel, locationLabel } from "@/lib/booking-ui";
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
    <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-6 sm:py-8">
      <BookingStepper current={3} />
      <h1 className="mt-6 font-display text-3xl leading-tight sm:text-4xl">Review total</h1>
      <p className="mt-2 text-sm text-ink2">
        Confirm location and time. Spa/Office has no extra charge. Hotel and Home add-ons are set by the vendor and added
        to the treatment total. Payment is next. The booking is only confirmed after payment verification.
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
            startsAt: new Date(`${localValue}:00+01:00`).toISOString(),
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
              className={`flex min-h-12 min-w-0 items-center gap-3 rounded-2xl border px-3 text-sm font-semibold sm:px-4 ${
                locationType === l ? "border-forest bg-forest/10" : "border-line bg-card"
              }`}
            >
              <input type="radio" name="loc" className="shrink-0 accent-forest" checked={locationType === l} onChange={() => setLocationType(l)} />
              <span className="min-w-0 break-words">{locationLabel(l)}</span>
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
            className="mt-1 box-border min-h-12 w-full min-w-0 max-w-full rounded-2xl border border-line bg-card px-3 font-normal"
          />
        </label>
        {quote && (
          <div className="space-y-2 rounded-[1.4rem] border border-line bg-card p-4 text-sm sm:p-5">
            <div className="flex justify-between gap-3 text-ink2">
              <span className="min-w-0">Base</span>
              <span className="shrink-0 tabular-nums">{formatNairaPlain(quote.basePriceKobo)}</span>
            </div>
            <div className="flex justify-between gap-3 text-ink2">
              <span className="min-w-0">{locationAddonLabel(locationType)}</span>
              <span className="shrink-0 tabular-nums">{quote.surchargeKobo ? formatNairaPlain(quote.surchargeKobo) : "₦0"}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-line pt-2 font-bold">
              <span>Total</span>
              <span className="shrink-0 tabular-nums">{formatNairaPlain(quote.customerTotalKobo)}</span>
            </div>
          </div>
        )}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          disabled={submitting}
          className="min-h-12 w-full rounded-full bg-gold px-4 text-center font-bold leading-snug text-ongold disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Continue to payment"}
        </button>
      </form>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="mx-auto w-full min-w-0 max-w-lg px-4 py-8 text-sm text-ink2">Loading booking…</div>}>
      <BookForm />
    </Suspense>
  );
}
