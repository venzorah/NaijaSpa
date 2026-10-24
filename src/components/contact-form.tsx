"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { GoldButton } from "@/components/shell";

const field = "mt-1 h-12 w-full rounded-xl border border-line bg-bg2 px-3 text-ink";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  if (sent) {
    return (
      <div className="py-10 text-center" role="status">
        <CheckCircle2 className="mx-auto h-12 w-12 text-leaf" aria-hidden />
        <p className="mt-3 font-semibold text-ink">Message sent</p>
        <p className="text-sm text-ink2">We’ll reply to your email. You can also write concierge@naijaspa.com.</p>
      </div>
    );
  }
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const name = String(fd.get("name") || "");
        const email = String(fd.get("email") || "");
        const message = String(fd.get("message") || "");
        window.location.href = `mailto:concierge@naijaspa.com?subject=${encodeURIComponent(`NaijaSpa contact from ${name}`)}&body=${encodeURIComponent(`${message}\n\n${email}`)}`;
        setSent(true);
      }}
    >
      <label className="block text-sm text-ink2">
        Name
        <input name="name" required className={field} />
      </label>
      <label className="block text-sm text-ink2">
        Email
        <input name="email" type="email" required className={field} />
      </label>
      <label className="block text-sm text-ink2">
        Message
        <textarea name="message" required className="mt-1 min-h-[120px] w-full rounded-xl border border-line bg-bg2 px-3 py-2 text-ink" />
      </label>
      <GoldButton type="submit">Send message</GoldButton>
    </form>
  );
}
