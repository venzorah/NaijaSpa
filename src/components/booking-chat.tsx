"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, MessageCircle, Send, X } from "lucide-react";
import { CHAT_IMAGE_MAX_BYTES } from "@/lib/chat-images";
import { ProtectedChatPhoto } from "@/components/protected-chat-photo";

type ChatRow = {
  id: string;
  body: string;
  senderId?: string;
  mine: boolean;
  createdAt: string;
  hasImage?: boolean;
  imageExpired?: boolean;
  imageExpiresAt?: string | null;
};

export function BookingChat({
  bookingId,
  apiPath,
  lockedHint,
  readOnly = false,
  layout = "card",
  customerId,
  customerName,
  vendorName,
  hideHeader = false
}: {
  bookingId: string;
  apiPath?: string;
  lockedHint?: string;
  readOnly?: boolean;
  layout?: "card" | "thread";
  customerId?: string;
  customerName?: string;
  vendorName?: string;
  hideHeader?: boolean;
}) {
  const path = apiPath || `/api/account/bookings/${bookingId}/messages`;
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(Boolean(lockedHint));
  const bottom = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fetchGen = useRef(0);

  const load = useCallback(async () => {
    const gen = ++fetchGen.current;
    try {
      const res = await fetch(path, { cache: "no-store" });
      const json = await res.json();
      if (gen !== fetchGen.current) return;
      if (res.status === 403) {
        setLocked(true);
        return;
      }
      if (!res.ok) throw new Error(json.error || "Could not load chat.");
      setLocked(false);
      setError("");
      setMessages(json.messages || []);
    } catch (e) {
      if (gen !== fetchGen.current) return;
      setError((current) => current || (e instanceof Error ? e.message : "Could not load chat."));
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

  function pickPhoto(file: File | null) {
    if (file && file.size > CHAT_IMAGE_MAX_BYTES) {
      setError("Photos must be 2 MB or smaller.");
      if (fileRef.current) fileRef.current.value = "";
      setPhoto(null);
      return;
    }
    setError("");
    setPhoto(file);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (readOnly || (!body && !photo) || busy) return;
    if (photo && photo.size > CHAT_IMAGE_MAX_BYTES) {
      setError("Photos must be 2 MB or smaller.");
      return;
    }
    setBusy(true);
    setError("");
    fetchGen.current += 1;
    try {
      let res: Response;
      if (photo) {
        const form = new FormData();
        if (body) form.set("body", body);
        form.set("file", photo);
        res = await fetch(path, { method: "POST", body: form });
      } else {
        res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body })
        });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not send.");
      setDraft("");
      setPhoto(null);
      if (fileRef.current) fileRef.current.value = "";
      setMessages((rows) => (rows.some((row) => row.id === json.message.id) ? rows : [...rows, json.message]));
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

  const thread = layout === "thread";

  return (
    <section className={`flex flex-col rounded-3xl border border-line bg-card p-5 ${thread ? "min-h-[28rem] flex-1" : ""}`}>
      {hideHeader ? null : (
        <>
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <MessageCircle className="h-4 w-4 text-leaf" aria-hidden />
            {readOnly ? "Conversation" : "Booking chat"}
          </h2>
          <p className="mt-1 text-xs text-ink2">
            {readOnly
              ? "Read only. Photos delete 10 minutes after they are sent."
              : "Photos delete 10 minutes after they are sent. Saving and screenshots are blocked in NaijaSpa."}
          </p>
        </>
      )}
      <div className={`space-y-2 overflow-y-auto rounded-2xl bg-bg2 p-3 ${thread ? "min-h-0 flex-1" : "mt-3 max-h-72"} ${hideHeader ? "" : "mt-3"}`}>
        {messages.length === 0 ? <p className="text-sm text-ink2">No messages yet. Say hello to coordinate the visit.</p> : null}
        {messages.map((m) => {
          const fromCustomer = customerId ? m.senderId === customerId : m.mine;
          const outgoing = customerId ? !fromCustomer : m.mine;
          const label = customerId ? (fromCustomer ? customerName : vendorName) : null;
          return (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${outgoing ? "ml-auto bg-forest text-white" : "bg-card text-ink"}`}
            >
              {label ? <p className={`mb-1 text-[10px] font-semibold ${outgoing ? "text-white/70" : "text-ink2"}`}>{label}</p> : null}
              {m.hasImage ? <ProtectedChatPhoto src={`${path}/${m.id}/image`} expiresAt={m.imageExpiresAt || null} mine={outgoing} /> : null}
              {m.imageExpired && !m.hasImage ? (
                <p className={`text-xs ${outgoing ? "text-white/80" : "text-ink2"}`}>Photo expired after 10 minutes.</p>
              ) : null}
              {m.body ? <p className={m.hasImage || m.imageExpired ? "mt-1" : ""}>{m.body}</p> : null}
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {readOnly ? null : (
        <form className="mt-3 space-y-2" onSubmit={(e) => void send(e)}>
          {photo ? (
            <div className="flex items-center gap-2 rounded-full bg-bg2 px-3 py-1 text-xs text-ink2">
              <span className="truncate">{photo.name}</span>
              <button
                type="button"
                className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-full"
                aria-label="Remove photo"
                onClick={() => pickPhoto(null)}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : null}
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => pickPhoto(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-bg text-ink"
              aria-label="Attach photo"
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
            </button>
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
              disabled={busy || (!draft.trim() && !photo)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-gold text-ongold disabled:opacity-50"
              aria-label="Send"
            >
              <Send className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </form>
      )}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
