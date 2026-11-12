import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission, ROLES } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/db";
import { publicContentUrl } from "@/lib/public-content";
import { mailConfigured } from "@/lib/mail";
import { normalizeAnnouncementImages, normalizeAnnouncementLinks } from "@/lib/announcement-content";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_CHANNELS,
  MAX_ANNOUNCEMENT_RECIPIENTS,
  announcementAudienceCounts,
  listAnnouncementHistory,
  sendAnnouncement
} from "@/lib/announcements";

export const runtime = "nodejs";
export const maxDuration = 300;

const postSchema = z.object({
  audience: z.enum(ANNOUNCEMENT_AUDIENCES),
  subject: z.string().trim().min(4).max(120),
  title: z.string().trim().min(4).max(80),
  intro: z.string().trim().min(8).max(400),
  body: z.string().trim().min(12).max(4000),
  ctaLabel: z.string().trim().max(40).optional(),
  ctaHref: z.string().trim().max(500).optional(),
  images: z.array(z.unknown()).max(6).optional(),
  links: z.array(z.unknown()).max(8).optional(),
  inApp: z.boolean().optional(),
  channel: z.enum(ANNOUNCEMENT_CHANNELS).optional(),
  userIds: z.array(z.string().min(1).max(64)).max(MAX_ANNOUNCEMENT_RECIPIENTS).optional()
});

function searchPeople(q: string) {
  return prisma.user.findMany({
    where: {
      status: "active",
      role: { in: [ROLES.CUSTOMER, ROLES.VENDOR_OWNER, ROLES.VENDOR_STAFF] },
      OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }]
    },
    take: 20,
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true }
  });
}

export async function GET(req?: Request) {
  try {
    const user = await requireAdmin(["cms.manage", "campaigns.manage"]);
    const q = req ? new URL(req.url).searchParams.get("q")?.trim() ?? "" : "";
    if (q.length >= 2) {
      return NextResponse.json({ people: await searchPeople(q.slice(0, 80)) });
    }
    const [counts, history] = await Promise.all([announcementAudienceCounts(), listAnnouncementHistory()]);
    return NextResponse.json({
      canEdit: hasPermission(user, "cms.manage"),
      mailConfigured: mailConfigured() || process.env.NODE_ENV !== "production",
      counts,
      history
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin("cms.manage");
    const body = postSchema.parse(await req.json());
    const ctaHref = body.ctaHref?.trim();
    const ctaLabel = body.ctaLabel?.trim();
    if ((ctaHref && !ctaLabel) || (ctaLabel && !ctaHref)) {
      const err = new Error("Add both a button label and a link, or leave both blank.");
      (err as Error & { status: number }).status = 400;
      throw err;
    }
    if (ctaHref && !publicContentUrl.safeParse(ctaHref).success) {
      const err = new Error("Use a site path starting with / or an https:// URL.");
      (err as Error & { status: number }).status = 400;
      throw err;
    }
    const images = normalizeAnnouncementImages(body.images);
    const links = normalizeAnnouncementLinks(body.links);
    const channel =
      body.channel ?? (body.inApp === false ? "email" : "both");
    const result = await sendAnnouncement({
      audience: body.audience,
      subject: body.subject,
      title: body.title,
      intro: body.intro,
      body: body.body,
      ctaLabel: ctaLabel || undefined,
      ctaHref: ctaHref || undefined,
      images,
      links,
      channel,
      userIds: body.audience === "individuals" ? body.userIds : undefined
    });
    await audit({
      actorId: user.id,
      action: "announcement.send",
      entityType: "Announcement",
      entityId: result.id,
      after: result
    });
    return NextResponse.json({ result });
  } catch (e) {
    return jsonError(e);
  }
}
