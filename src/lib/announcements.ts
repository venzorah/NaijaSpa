import { randomUUID } from "crypto";
import { prisma, setConfig } from "./db";
import { ROLES } from "./rbac";
import { parseNotificationPreferences } from "./notification-preferences";
import { announcementEmail, mailConfigured, sendMail } from "./mail";
import { appUrl } from "./payments";
import type { AnnouncementImage, AnnouncementLink } from "./announcement-content";

export type { AnnouncementImage, AnnouncementLink } from "./announcement-content";
export {
  MAX_ANNOUNCEMENT_IMAGES,
  MAX_ANNOUNCEMENT_LINKS,
  isAnnouncementImageSrc,
  normalizeAnnouncementImages,
  normalizeAnnouncementLinks
} from "./announcement-content";

export const ANNOUNCEMENTS_CONFIG_KEY = "admin.announcements";
export const ANNOUNCEMENT_AUDIENCES = ["customers", "vendors", "all"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export type AnnouncementRecord = {
  id: string;
  at: string;
  audience: AnnouncementAudience;
  subject: string;
  title: string;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  inApp: boolean;
  imageCount: number;
  linkCount: number;
};

export function rolesForAudience(audience: AnnouncementAudience) {
  if (audience === "customers") return [ROLES.CUSTOMER];
  if (audience === "vendors") return [ROLES.VENDOR_OWNER, ROLES.VENDOR_STAFF];
  return [ROLES.CUSTOMER, ROLES.VENDOR_OWNER, ROLES.VENDOR_STAFF];
}

export function isSendableEmail(email: string) {
  const value = email.trim().toLowerCase();
  if (!value.includes("@") || value.length > 254) return false;
  if (value.startsWith("deleted-") && value.endsWith("@redacted.naijaspa")) return false;
  return true;
}

export function wantsAnnouncementEmail(prefsJson: string | null | undefined) {
  return parseNotificationPreferences(prefsJson).email;
}

export function parseAnnouncementHistory(raw: string | null | undefined): AnnouncementRecord[] {
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is AnnouncementRecord => Boolean(row && typeof row === "object" && typeof (row as { id?: unknown }).id === "string"))
      .map((row) => ({
        ...row,
        imageCount: typeof row.imageCount === "number" ? row.imageCount : 0,
        linkCount: typeof row.linkCount === "number" ? row.linkCount : 0
      }))
      .slice(0, 30);
  } catch {
    return [];
  }
}

export function absoluteAnnouncementHref(href: string) {
  if (href.startsWith("/")) return `${appUrl()}${href}`;
  return href;
}

function inAppUrl(role: string) {
  return role === ROLES.VENDOR_OWNER || role === ROLES.VENDOR_STAFF ? "/vendor/dashboard" : "/account/dashboard";
}

async function loadHistory() {
  const row = await prisma.systemConfig.findUnique({ where: { key: ANNOUNCEMENTS_CONFIG_KEY } });
  return parseAnnouncementHistory(row?.value);
}

export async function announcementAudienceCounts() {
  const [customers, vendors] = await Promise.all([
    prisma.user.count({ where: { status: "active", role: ROLES.CUSTOMER } }),
    prisma.user.count({ where: { status: "active", role: { in: [ROLES.VENDOR_OWNER, ROLES.VENDOR_STAFF] } } })
  ]);
  return { customers, vendors, all: customers + vendors };
}

export async function listAnnouncementHistory() {
  return loadHistory();
}

export async function sendAnnouncement(input: {
  audience: AnnouncementAudience;
  subject: string;
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  images?: AnnouncementImage[];
  links?: AnnouncementLink[];
  inApp: boolean;
}) {
  if (!mailConfigured() && process.env.NODE_ENV === "production") {
    const err = new Error("Email is not configured. Set SMTP_HOST on the server.");
    (err as Error & { status: number }).status = 503;
    throw err;
  }
  const users = await prisma.user.findMany({
    where: { status: "active", role: { in: rolesForAudience(input.audience) } },
    select: { id: true, email: true, name: true, role: true, notificationPreferencesJson: true }
  });
  const cta =
    input.ctaLabel && input.ctaHref
      ? { label: input.ctaLabel, href: absoluteAnnouncementHref(input.ctaHref) }
      : undefined;
  const images = (input.images ?? []).map((image) => ({
    src: absoluteAnnouncementHref(image.src),
    href: image.href ? absoluteAnnouncementHref(image.href) : undefined
  }));
  const links = (input.links ?? []).map((link) => ({
    label: link.label,
    href: absoluteAnnouncementHref(link.href)
  }));
  const mail = announcementEmail({ title: input.title, intro: input.intro, body: input.body, cta, images, links });
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const notify: { userId: string; title: string; body: string; actionUrl: string }[] = [];

  for (const user of users) {
    if (!isSendableEmail(user.email) || !wantsAnnouncementEmail(user.notificationPreferencesJson)) {
      skipped += 1;
      continue;
    }
    try {
      await sendMail({ to: user.email, subject: input.subject, html: mail.html, text: mail.text });
      sent += 1;
      if (input.inApp) {
        notify.push({
          userId: user.id,
          title: input.title,
          body: input.intro,
          actionUrl: inAppUrl(user.role)
        });
      }
    } catch {
      failed += 1;
    }
  }

  if (notify.length) {
    await prisma.notification.createMany({ data: notify });
  }

  const record: AnnouncementRecord = {
    id: randomUUID(),
    at: new Date().toISOString(),
    audience: input.audience,
    subject: input.subject,
    title: input.title,
    attempted: users.length,
    sent,
    failed,
    skipped,
    inApp: input.inApp,
    imageCount: images.length,
    linkCount: (cta ? 1 : 0) + links.length
  };
  const history = [record, ...(await loadHistory())].slice(0, 30);
  await setConfig(ANNOUNCEMENTS_CONFIG_KEY, JSON.stringify(history));
  return record;
}
