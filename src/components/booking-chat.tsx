"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";

type ChatRow = { id: string; body: string; mine: boolean; createdAt: string };

export function BookingChat({
  bookingId,
  apiPath,
  lockedHint
}: {
  bookingId: string;
  apiPath?: string;
  lockedHint?: string;
}) {
  const path = apiPath || `/api/account/bookings/${bookingId}/messages`;
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(Boolean(lockedHint));
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(path, { cache: "no-store" });
      const json = await res.json();
      if (res.status === 403) {
        setLocked(true);
        return;
      }
      if (!res.ok) throw new Error(json.error || "Could not load chat.");
      setLocked(false);
      setMessages(json.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load chat.");
    }
  }, [path]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send.");
      setDraft("");
      setMessages((rows) => [...rows, json.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send.");
    } finally {
      setBusy(false);
    }
  }

  if (locked) {
    return (
      <p className="flex items-start gap-2 rounded-2xl border border-line bg-card p-4 text-sm text-ink2">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
        {lockedHint || "In-app chat opens after Paystack confirms payment."}
      </p>
    );
  }

  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <h2 className="flex items-center gap-2 font-semibold text-ink">
        <MessageCircle className="h-4 w-4 text-leaf" aria-hidden />
        Booking chat
      </h2>
      <p className="mt-1 text-xs text-ink2">Messages stay on NaijaSpa for this paid booking only.</p>
      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-bg2 p-3">
        {messages.length === 0 ? <p className="text-sm text-ink2">No messages yet. Say hello to coordinate the visit.</p> : null}
        {messages.map((m) => (
          <p
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.mine ? "ml-auto bg-forest text-white" : "bg-card text-ink"}`}
          >
            {m.body}
          </p>
        ))}
        <div ref={bottom} />
      </div>
      <form className="mt-3 flex gap-2" onSubmit={(e) => void send(e)}>
        <input
          className="h-11 min-w-0 flex-1 rounded-full border border-line bg-bg px-4 text-sm"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Write a message…"
          aria-label="Chat message"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gold text-ongold disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
