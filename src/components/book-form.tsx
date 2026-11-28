"use client";
import { useToast, useToastMessage } from "@/components/vendor/toasts";
import { NavBackButton } from "@/components/nav-history";
import { bookingResumePath, PENDING_BOOKING_KEY, type PendingBooking } from "@/lib/nav-history";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatNairaPlain, locationAddonLabel, locationLabel } from "@/lib/booking-ui";
import { BookingStepper } from "@/components/booking-stepper";

type LocationType = "spa" | "hotel" | "home";
type Quote = { customerTotalKobo: number; surchargeKobo: number; basePriceKobo: number };

function savePending(row: PendingBooking) {
  try {
    sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(row));
  } catch {
    /* private mode */
  }
}

function clearPending() {
  try {
    sessionStorage.removeItem(PENDING_BOOKING_KEY);
  } catch {
    /* private mode */
  }
}

export function BookForm({ loggedIn }: { loggedIn: boolean }) {
  const { serviceId } = useParams<{ serviceId: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [locationType, setLocationType] = useState<LocationType>(() => {
    const loc = search.get("location");
    return loc === "hotel" || loc === "home" || loc === "spa" ? loc : "spa";
  });
  const [details, setDetails] = useState(() => search.get("details") || "");
  const [startsAt, setStartsAt] = useState(() => search.get("startsAt") || "");
  const [error, setError] = useToastMessage();
  const [submitting, setSubmitting] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quotedFor, setQuotedFor] = useState("");
  const [guestMode, setGuestMode] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const quoteReady = Boolean(quote && quotedFor === `${serviceId}:${locationType}`);
  const autoPay = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [serviceId]);

  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_BOOKING_KEY);
    if (!pending) return;
    try {
      const parsed = JSON.parse(pending) as PendingBooking;
      if (parsed.serviceId && parsed.serviceId !== serviceId) return;
      if (parsed.locationType) setLocationType(parsed.locationType);
      if (parsed.details) setDetails(parsed.details);
      if (parsed.startsAt) setStartsAt(parsed.startsAt);
    } catch {
      /* ignore */
    }
  }, [serviceId]);

  useEffect(() => {
    if (loggedIn) return;
    savePending({ serviceId, locationType, details, startsAt });
  }, [loggedIn, serviceId, locationType, details, startsAt]);

  useEffect(() => {
    const controller = new AbortController();
    setQuote(null);
    setQuotedFor("");
    setQuoteError("");
    fetch(`/api/quote?${new URLSearchParams({ serviceId, location: locationType })}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load the price. Refresh to try again.");
        if (!controller.signal.aborted) {
          setQuote(data);
          setQuotedFor(`${serviceId}:${locationType}`);
        }
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setQuoteError(error.message);
      });
    return () => controller.abort();
  }, [serviceId, locationType]);

  const needsAddress = locationType === "hotel" || locationType === "home";

  const localValue = useMemo(() => {
    if (!startsAt) return "";
    return startsAt.length === 16 ? startsAt : startsAt.slice(0, 16);
  }, [startsAt]);

  const resumeHref = bookingResumePath({ serviceId, locationType, details, startsAt });
  const loginHref = `/login?next=${encodeURIComponent(resumeHref)}`;
  const registerHref = `/register?next=${encodeURIComponent(resumeHref)}`;
  const guestFindHref = `/find-bookings?next=${encodeURIComponent(resumeHref)}`;

  const submitBooking = useCallback(async () => {
    if (!quoteReady || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const appointment = new Date(`${localValue}:00+01:00`);
      if (!Number.isFinite(appointment.getTime()) || appointment <= new Date()) throw new Error("Choose a valid future appointment.");
      const appointmentPayload = {
        serviceId,
        locationType,
        locationDetails: details,
        customerNotes: guestNotes,
        startsAt: appointment.toISOString(),
        idempotencyKey: crypto.randomUUID()
      };
      const res = await fetch(guestMode && !loggedIn ? "/api/bookings/guest" : "/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          guestMode && !loggedIn
            ? { ...appointmentPayload, name: guestName, phone: guestPhone, email: guestEmail }
            : appointmentPayload
        )
      });
      const json = await res.json();
      if (res.status === 401) {
        savePending({ serviceId, locationType, details, startsAt });
        setGuestMode(true);
        setError("Continue as a guest below, or sign in to use your account.");
        return;
      }
      if (!res.ok) {
        setError(json.error || "Could not create booking");
        if (res.status === 404) {
          setQuote(null);
          setQuoteError(json.error || "This service is no longer available.");
          clearPending();
        }
        return;
      }
      clearPending();
      toast.success("Booking details saved. Continue to payment.");
      router.push(`/checkout/${json.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [
    quoteReady,
    submitting,
    localValue,
    serviceId,
    locationType,
    details,
    guestNotes,
    guestMode,
    loggedIn,
    guestName,
    guestPhone,
    guestEmail,
    startsAt,
    setError,
    toast,
    router
  ]);

  useEffect(() => {
    if (!loggedIn || autoPay.current || submitting || !quoteReady || !localValue) return;
    if (search.get("continue") !== "pay") return;
    autoPay.current = true;
    void submitBooking();
  }, [loggedIn, submitting, quoteReady, localValue, search, submitBooking]);

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg px-4 py-6 sm:py-8">
      <div className="mb-4">
        <NavBackButton fallback={`/services/${encodeURIComponent(serviceId)}`} />
      </div>
      <BookingStepper current={3} />
      <h1 className="mt-6 font-display text-3xl leading-tight sm:text-4xl">Review total</h1>
      <p className="mt-2 text-sm text-ink2">
        Confirm location and time. Spa/Office has no extra charge. Hotel and Home add-ons are set by the vendor and added
        to the treatment total. Payment is next. The booking is only confirmed after payment verification.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submitBooking();
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
        {quoteReady && quote && (
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
        {quoteError ? (
          <p role="alert" className="text-sm text-red-500">
            {quoteError}{" "}
            <Link href="/explore" className="font-semibold underline">
              Back to Explore
            </Link>
          </p>
        ) : !quoteReady ? (
          <p role="status" className="text-sm text-ink2">
            Checking service and price…
          </p>
        ) : null}
        {!loggedIn ? (
          <div className="space-y-3 rounded-3xl border border-line bg-card p-4">
            <p className="text-sm font-semibold text-ink">How do you want to continue?</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setGuestMode(true)}
                className={`min-h-12 rounded-2xl border px-3 text-sm font-semibold ${guestMode ? "border-forest bg-forest/10 text-ink" : "border-line"}`}
              >
                Guest booking
              </button>
              <Link
                href={loginHref}
                onClick={() => savePending({ serviceId, locationType, details, startsAt })}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-gold/50 px-3 text-center text-sm font-semibold text-goldink"
              >
                Sign in
              </Link>
              <Link
                href={registerHref}
                onClick={() => savePending({ serviceId, locationType, details, startsAt })}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-line px-3 text-center text-sm font-semibold"
              >
                Create account
              </Link>
            </div>
            {guestMode ? (
              <div className="space-y-3 pt-1">
                <label className="block text-sm font-semibold">
                  Full name
                  <input required value={guestName} onChange={(e) => setGuestName(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-bg px-3 font-normal" />
                </label>
                <label className="block text-sm font-semibold">
                  Phone number
                  <input required value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} inputMode="tel" placeholder="0803…" className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-bg px-3 font-normal" />
                </label>
                <label className="block text-sm font-semibold">
                  Email
                  <input required type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="you@email.com" className="mt-1 min-h-12 w-full rounded-2xl border border-line bg-bg px-3 font-normal" />
                </label>
                <p className="text-xs text-ink2">Use this email later to find the booking with a 6-digit code. Guest recovery is by email, not SMS.</p>
                <label className="block text-sm font-semibold">
                  Additional instructions (optional)
                  <textarea value={guestNotes} onChange={(e) => setGuestNotes(e.target.value)} maxLength={1000} className="mt-1 min-h-20 w-full rounded-2xl border border-line bg-bg p-3 font-normal" />
                </label>
                <p className="text-xs text-ink2">
                  Already started as a guest?{" "}
                  <Link href={guestFindHref} className="font-semibold underline">
                    Find a guest booking
                  </Link>
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <label className="block text-sm font-semibold">
            Additional instructions (optional)
            <textarea value={guestNotes} onChange={(e) => setGuestNotes(e.target.value)} maxLength={1000} className="mt-1 min-h-20 w-full rounded-2xl border border-line bg-card p-3 font-normal" />
          </label>
        )}
        {error && !quoteError && <p role="alert" className="text-sm text-red-500">{error}</p>}
        <button
          disabled={submitting || !quoteReady || (!loggedIn && !guestMode)}
          className="min-h-12 w-full rounded-full bg-gold px-4 text-center font-bold leading-snug text-ongold disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Continue to payment"}
        </button>
      </form>
    </div>
  );
}
