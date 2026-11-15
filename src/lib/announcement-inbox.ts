export const ANNOUNCEMENT_CTA_MARK = "\n\nNAIJASPA_CTA:";
export const ANNOUNCEMENT_LINKS_MARK = "\n\nNAIJASPA_LINKS:";

export type InboxCta = { label: string; href: string };

function safeLink(label: string, href: string): InboxCta | null {
  const nextLabel = label.trim().slice(0, 40);
  const nextHref = href.trim();
  if (!nextLabel || !isSafeInboxCtaHref(nextHref)) return null;
  return { label: nextLabel, href: nextHref };
}

export function encodeAnnouncementInboxBody(
  intro: string,
  body: string,
  cta?: InboxCta | null,
  links?: InboxCta[] | null
) {
  let text = [intro.trim(), body.trim()].filter(Boolean).join("\n\n");
  const button = cta ? safeLink(cta.label, cta.href) : null;
  if (button) text += `${ANNOUNCEMENT_CTA_MARK}${button.label}\t${button.href}`;
  const extra = (links ?? []).map((link) => safeLink(link.label, link.href)).filter((row): row is InboxCta => Boolean(row));
  if (extra.length) text += `${ANNOUNCEMENT_LINKS_MARK}${JSON.stringify(extra)}`;
  return text;
}

function parseStoredLinks(raw: string): InboxCta[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        return safeLink(String((row as { label?: unknown }).label ?? ""), String((row as { href?: unknown }).href ?? ""));
      })
      .filter((row): row is InboxCta => Boolean(row));
  } catch {
    return [];
  }
}

export function parseAnnouncementInboxBody(body: string) {
  let rest = body;
  let links: InboxCta[] = [];
  const linksAt = rest.lastIndexOf(ANNOUNCEMENT_LINKS_MARK);
  if (linksAt >= 0) {
    links = parseStoredLinks(rest.slice(linksAt + ANNOUNCEMENT_LINKS_MARK.length));
    rest = rest.slice(0, linksAt);
  }
  const i = rest.lastIndexOf(ANNOUNCEMENT_CTA_MARK);
  if (i < 0) return { text: rest.trim(), cta: null as InboxCta | null, links };
  const payload = rest.slice(i + ANNOUNCEMENT_CTA_MARK.length);
  const tab = payload.indexOf("\t");
  if (tab < 1) return { text: rest.trim(), cta: null, links };
  const cta = safeLink(payload.slice(0, tab), payload.slice(tab + 1));
  if (!cta) return { text: rest.trim(), cta: null, links };
  return { text: rest.slice(0, i).trim(), cta, links };
}

export function isSafeInboxCtaHref(href: string) {
  if (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) return true;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function announcementInboxPath(role: string, id: string) {
  return role === "vendor_owner" || role === "vendor_staff" ? `/vendor/messages/${id}` : `/account/messages/${id}`;
}

export function announcementInboxListPath(role: string) {
  return role === "vendor_owner" || role === "vendor_staff" ? "/vendor/messages" : "/account/messages";
}

export function isAnnouncementInboxActionUrl(url: string | null | undefined) {
  if (!url) return false;
  return (
    url.startsWith("/account/messages") ||
    url.startsWith("/vendor/messages") ||
    url === "/account/dashboard" ||
    url === "/vendor/dashboard"
  );
}

export function announcementInboxWhere(userId: string) {
  return {
    userId,
    OR: [
      { actionUrl: { startsWith: "/account/messages" } },
      { actionUrl: { startsWith: "/vendor/messages" } },
      { actionUrl: "/account/dashboard" },
      { actionUrl: "/vendor/dashboard" }
    ]
  };
}

export function announcementPreview(body: string, max = 140) {
  const one = parseAnnouncementInboxBody(body)
    .text.replace(/\s+/g, " ")
    .trim();
  return one.length > max ? `${one.slice(0, max - 1)}…` : one;
}

export function formatAnnouncementWhen(iso: string | Date) {
  const date = iso instanceof Date ? iso : new Date(iso);
  return date.toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos"
  });
}
