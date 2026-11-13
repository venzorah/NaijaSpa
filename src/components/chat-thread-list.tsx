import Link from "@/components/navigation-link";
import { MessageCircle } from "lucide-react";
import type { ChatThread } from "@/lib/chat-threads";

export function ChatThreadList({
  threads,
  hrefFor,
  empty
}: {
  threads: ChatThread[];
  hrefFor: (bookingId: string) => string;
  empty: string;
}) {
  if (!threads.length) {
    return (
      <p className="flex items-start gap-2 rounded-3xl border border-line bg-card p-5 text-sm text-ink2">
        <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-leaf" aria-hidden />
        {empty}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
      {threads.map((thread) => (
        <li key={thread.bookingId}>
          <Link href={hrefFor(thread.bookingId)} className="flex min-h-[72px] items-start gap-3 px-4 py-3 hover:bg-elev">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-bold text-gold">
              {thread.peerName.trim().slice(0, 1).toUpperCase() || "N"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-ink">{thread.peerName}</span>
                {thread.lastAt ? (
                  <span className="shrink-0 text-[11px] text-ink2">
                    {new Date(thread.lastAt).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block truncate text-xs text-ink2">{thread.serviceName}</span>
              <span className="mt-0.5 block truncate text-sm text-ink">{thread.preview}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
