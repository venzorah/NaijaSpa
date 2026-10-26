"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/star-rating";

export function WriteReviewForm({
  bookingId,
  serviceName,
  vendorName,
  serviceSlug
}: {
  bookingId: string;
  serviceName: string;
  vendorName: string;
  serviceSlug: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      className="rounded-3xl border border-line bg-card p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        if (rating < 1) {
          setError("Tap a star to rate this visit.");
          return;
        }
        setBusy(true);
        try {
          const res = await fetch("/api/account/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookingId, rating, body })
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(json.error || "Could not send your review.");
            return;
          }
          router.replace(`/account/bookings/${encodeURIComponent(bookingId)}/review`);
          router.refresh();
        } catch {
          setError("Could not send your review.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="text-sm text-ink2">
        {serviceName} · {vendorName}
      </p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink2">Your rating</p>
      <div className="mt-1">
        <StarRating value={rating} onChange={setRating} />
      </div>
      <label htmlFor="review-body" className="mt-5 block text-xs font-semibold uppercase tracking-wide text-ink2">
        Write a review
      </label>
      <textarea
        id="review-body"
        required
        minLength={10}
        maxLength={2000}
        rows={5}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="How was the treatment, space, and therapist?"
        className="mt-1 w-full rounded-2xl border border-line bg-elev px-3 py-2 text-sm text-ink"
      />
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gold px-5 text-sm font-bold text-ongold disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send review"}
      </button>
    </form>
  );
}
