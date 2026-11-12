"use client";

import Link from "@/components/navigation-link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCheck, Megaphone } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { announcementPreview, formatAnnouncementWhen, parseAnnouncementInboxBody } from "@/lib/announcement-inbox";

export type InboxRow = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
};

export function AnnouncementMessageList({
  portal,
  rows,
  unread
}: {
  portal: "customer" | "vendor";
  rows: InboxRow[];
  unread: number;
}) {
  const listHref = portal === "vendor" ? "/vendor/messages" : "/account/messages";
  const markApi = portal === "vendor" ? "/api/vendor/messages" : "/api/account/messages";
  const header =
    portal === "vendor" ? (
      <VendorPageHeader
        eyebrow="NaijaSpa"
        title="Messages"
        description="Updates sent to you from NaijaSpa."
        actions={<AnnouncementMarkAll api={markApi} disabled={!unread} />}
      />
    ) : (
      <PageHeader
        title="Messages"
        subtitle="Updates sent to you from NaijaSpa."
        backHref="/account"
        right={<AnnouncementMarkAll api={markApi} disabled={!unread} />}
      />
    );

  return (
    <div className={portal === "customer" ? "mx-auto max-w-3xl px-4 pt-6 lg:px-8" : undefined}>
      {header}
      {rows.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No messages yet"
          text="When NaijaSpa sends an in-app announcement, it will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const unreadRow = !row.readAt;
            return (
              <li key={row.id}>
                <Link
                  href={`${listHref}/${row.id}`}
                  className={`flex gap-3 rounded-3xl border p-4 transition hover:border-gold/50 ${
                    unreadRow ? "border-gold/45 bg-gold/10" : "border-line bg-card"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                      unreadRow ? "bg-forest text-gold" : "bg-forest/10 text-forest"
                    }`}
                    aria-hidden
                  >
                    <Megaphone className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-goldink">From NaijaSpa</span>
                      {unreadRow ? (
                        <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-ongold">New</span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block font-display text-xl font-semibold text-ink">{row.title}</span>
                    <span className="mt-1 block text-sm text-ink2">{announcementPreview(row.body)}</span>
                    <span className="mt-2 block text-xs text-ink2">{formatAnnouncementWhen(row.createdAt)}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AnnouncementMessageReader({
  portal,
  title,
  body,
  createdAt
}: {
  portal: "customer" | "vendor";
  title: string;
  body: string;
  createdAt: string;
}) {
  const { text, cta } = parseAnnouncementInboxBody(body);
  const back = portal === "vendor" ? "/vendor/messages" : "/account/messages";

  return (
    <div className={portal === "customer" ? "mx-auto max-w-3xl px-4 pt-6 lg:px-8" : undefined}>
      {portal === "vendor" ? (
        <VendorPageHeader eyebrow="From NaijaSpa" title="Message" description={formatAnnouncementWhen(createdAt)} />
      ) : (
        <PageHeader title="Message" subtitle={formatAnnouncementWhen(createdAt)} backHref={back} />
      )}
      <article className="overflow-hidden rounded-3xl border border-gold/40 bg-card shadow-[0_16px_40px_rgba(6,78,59,0.08)]">
        <header className="bg-forest px-5 pb-6 pt-5 text-white">
          <BrandLogo forceDark className="h-10 w-auto max-w-[12rem] object-contain object-left sm:h-12" />
          <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#E3C766]">Announcement</p>
          <h1 className="mt-1 font-display text-3xl font-semibold leading-tight">{title}</h1>
        </header>
        <div className="h-1 bg-gold" aria-hidden />
        <div className="space-y-5 p-5 sm:p-6">
          <p className="whitespace-pre-wrap text-[15px] leading-7 text-ink">{text}</p>
          {cta ? (
            <Link
              href={cta.href}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-gold px-5 text-sm font-bold text-ongold"
            >
              {cta.label}
            </Link>
          ) : null}
          {portal === "vendor" ? (
            <div>
              <Link href={back} className="text-sm font-semibold text-goldink">
                Back to messages
              </Link>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}

function AnnouncementMarkAll({ api, disabled }: { api: string; disabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (disabled || busy) return;
    setBusy(true);
    try {
      await fetch(api, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={() => void run()}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line px-3 text-xs font-semibold text-ink2 disabled:opacity-50"
    >
      <CheckCheck className="h-4 w-4" aria-hidden />
      Mark all read
    </button>
  );
}
