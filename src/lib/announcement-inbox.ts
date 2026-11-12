export const ANNOUNCEMENT_CTA_MARK = "\n\nNAIJASPA_CTA:";

export function encodeAnnouncementInboxBody(
  intro: string,
  body: string,
  cta?: { label: string; href: string } | null
) {
  const text = [intro.trim(), body.trim()].filter(Boolean).join("\n\n");
  if (!cta?.label?.trim() || !cta.href?.trim() || !isSafeInboxCtaHref(cta.href)) return text;
  return `${text}${ANNOUNCEMENT_CTA_MARK}${cta.label.trim()}\t${cta.href.trim()}`;
}

export function parseAnnouncementInboxBody(body: string) {
  const i = body.lastIndexOf(ANNOUNCEMENT_CTA_MARK);
  if (i < 0) return { text: body.trim(), cta: null as { label: string; href: string } | null };
  const payload = body.slice(i + ANNOUNCEMENT_CTA_MARK.length);
  const tab = payload.indexOf("\t");
  if (tab < 1) return { text: body.trim(), cta: null };
  const label = payload.slice(0, tab).trim();
  const href = payload.slice(tab + 1).trim();
  if (!label || !isSafeInboxCtaHref(href)) return { text: body.trim(), cta: null };
  return { text: body.slice(0, i).trim(), cta: { label, href } };
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
