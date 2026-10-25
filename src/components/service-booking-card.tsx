"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatNairaPlain, locationAddonLabel, locationLabel } from "@/lib/booking-ui";
import { BookingStepper } from "@/components/booking-stepper";
import type { LocationType } from "@/lib/commercial";

type Quote = { basePriceKobo: number; surchargeKobo: number; customerTotalKobo: number };
type Treatment = { id: string; slug: string; name: string; durationMin: number; basePriceKobo: number };

const TIMES = [
  { value: "09:00", label: "9:00 AM" },
  { value: "11:30", label: "11:30 AM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "17:30", label: "5:30 PM" }
];

function lagosParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { weekday: get("weekday"), day: get("day"), month: get("month") };
}

function nextDays(n = 5) {
  const days: { key: string; weekday: string; day: string; month: string }[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    days.push({ key: `${y}-${m}-${day}`, ...lagosParts(d) });
  }
  return days;
}

export function ServiceBookingCard({
  serviceId,
  treatments,
  currentSlug,
  durationMin,
  quotes,
  cancellationPolicy
}: {
  serviceId: string;
  treatments: Treatment[];
  currentSlug: string;
  durationMin: number;
  quotes: { l: LocationType; q: Quote }[];
  cancellationPolicy?: string | null;
}) {
  const router = useRouter();
  const [days, setDays] = useState<ReturnType<typeof nextDays>>([]);
  const [locationType, setLocationType] = useState<LocationType>(quotes[0]?.l ?? "spa");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [details, setDetails] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const upcoming = nextDays(5);
    setDays(upcoming);
    setDay((current) => current || upcoming[0]?.key || "");
  }, []);

  const quote = quotes.find((x) => x.l === locationType)?.q ?? quotes[0]?.q;
  const needsAddress = locationType === "hotel" || locationType === "home";
  const canLeaveLocation = Boolean(quote) && (!needsAddress || details.trim().length > 3);
  const canLeaveTime = Boolean(day && time);

  const continueToBook = () => {
    const startsAt = time ? `${day}T${time}` : "";
    const params = new URLSearchParams({
      location: locationType,
      startsAt,
      details
    });
    router.push(`/book/${serviceId}?${params.toString()}`);
  };

  const cta = () => {
    if (step === 1) {
      if (!canLeaveLocation) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!canLeaveTime) return;
      setStep(3);
      return;
    }
    continueToBook();
  };

  const ctaLabel =
    step === 1 ? "Continue" : step === 2 ? (time ? "Review total" : "Select a time") : "Continue to payment";

  return (
    <aside className="min-w-0 w-full rounded-[1.6rem] border border-line bg-card p-4 shadow-sm sm:p-6">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <p className="min-w-0 font-display text-3xl leading-none sm:text-4xl">
          {quote ? formatNairaPlain(quote.customerTotalKobo) : "—"}
        </p>
        <p className="shrink-0 text-sm text-ink2">/ {durationMin} min</p>
      </div>

      <div className="mt-5">
        <BookingStepper current={step} />
      </div>

      {treatments.length > 1 && (
        <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-ink2">
          Treatment
          <select
            className="mt-2 min-h-12 w-full min-w-0 max-w-full rounded-2xl border border-line bg-card px-3 text-sm font-medium text-ink"
            value={currentSlug}
            onChange={(e) => router.push(`/services/${encodeURIComponent(e.target.value)}`)}
          >
            {treatments.map((t) => (
              <option key={t.id} value={t.slug}>
                {/\d+\s*min/i.test(t.name) ? t.name : `${t.name} · ${t.durationMin} min`}
              </option>
            ))}
          </select>
        </label>
      )}

      {step === 1 && (
        <fieldset className="mt-5">
          <legend className="text-xs font-semibold uppercase tracking-wide text-ink2">1. Choose location</legend>
          <p className="mt-1 text-xs text-ink2">Spa/Office has no extra. Hotel and Home add-ons are set by the vendor and added to the total.</p>
          <div className="mt-2 grid grid-cols-1 gap-2">
            {quotes.map(({ l, q }) => (
              <label
                key={l}
                className={`flex min-h-12 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-2xl border px-3 text-sm font-semibold sm:gap-3 sm:px-4 ${
                  locationType === l ? "border-forest bg-forest/10" : "border-line bg-card"
                }`}
              >
                <span className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <input
                    type="radio"
                    name="location"
                    value={l}
                    className="shrink-0 accent-forest"
                    checked={locationType === l}
                    onChange={() => setLocationType(l)}
                  />
                  <span className="min-w-0 break-words">{locationLabel(l)}</span>
                </span>
                <span className="shrink-0 text-xs font-medium text-ink2">
                  {l === "spa" || !q.surchargeKobo ? "No extra" : `+ ${formatNairaPlain(q.surchargeKobo)}`}
                </span>
              </label>
            ))}
          </div>
          {needsAddress && (
            <textarea
              required
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder={locationType === "hotel" ? "Hotel name and room" : "Home address"}
              className="mt-3 min-h-24 w-full rounded-2xl border border-line bg-card p-3 text-sm"
            />
          )}
        </fieldset>
      )}

      {step === 2 && (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink2">2. Pick a time</p>
          <p className="mt-1 text-xs text-ink2">Times are Africa/Lagos.</p>
          <div className="mt-3 flex gap-2 overflow-x-auto overscroll-x-contain pb-1">
            {days.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDay(d.key)}
                className={`flex min-h-16 min-w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-2xl border px-2 text-xs ${
                  day === d.key ? "border-forest bg-forest text-white" : "border-line bg-card"
                }`}
              >
                <span className="uppercase tracking-wide opacity-80">{d.weekday}</span>
                <span className="text-lg font-bold leading-none">{d.day}</span>
              </button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {TIMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTime(t.value)}
                className={`min-h-12 rounded-2xl border text-sm font-semibold ${
                  time === t.value ? "border-forest bg-forest/10" : "border-line bg-card"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button type="button" className="mt-3 text-sm font-semibold text-goldink" onClick={() => setStep(1)}>
            ← Change location
          </button>
        </div>
      )}

      {step === 3 && quote && (
        <div className="mt-5 space-y-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink2">3. Review total</p>
          <div className="flex justify-between gap-3 text-ink2">
            <span className="min-w-0">Treatment · {durationMin} min</span>
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
          {day && time && (
            <p className="pt-1 text-xs text-ink2">
              {day} at {time} · {locationLabel(locationType)}
            </p>
          )}
          <button type="button" className="text-sm font-semibold text-goldink" onClick={() => setStep(2)}>
            ← Change time
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={cta}
        disabled={(step === 1 && !canLeaveLocation) || (step === 2 && !canLeaveTime)}
        className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-gold px-4 text-center font-bold leading-snug text-ongold disabled:opacity-50"
      >
        {ctaLabel}
      </button>
      <p className="mt-3 text-center text-xs text-ink2">
        {cancellationPolicy?.trim() || "Free cancellation up to 12 hours before."} Booking is only confirmed after
        payment verification.
      </p>
    </aside>
  );
}
