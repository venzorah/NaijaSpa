import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/rbac";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { publicContentUrl } from "@/lib/public-content";
import { mailConfigured } from "@/lib/mail";
import { normalizeAnnouncementImages, normalizeAnnouncementLinks } from "@/lib/announcement-content";
import {
  ANNOUNCEMENT_AUDIENCES,
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
  inApp: z.boolean().optional()
});

export async function GET() {
  try {
    const user = await requireAdmin(["cms.manage", "campaigns.manage"]);
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
      inApp: body.inApp !== false
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
