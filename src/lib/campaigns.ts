import { z } from "zod";

export const CAMPAIGN_PLACEMENTS = {
  homepage_featured: "Homepage — Top-rated near you",
  homepage_premium: "Homepage — Premium",
  homepage_promo: "Homepage — Promo"
} as const;

export const campaignFields = z.object({
  vendorId: z.string().min(1),
  serviceId: z.string().min(1).nullable().optional(),
  placement: z.enum(["homepage_featured", "homepage_premium", "homepage_promo"]),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  priority: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true)
});

export function assertCampaignWindow(startsAt: Date, endsAt: Date) {
  if (endsAt <= startsAt) throw Object.assign(new Error("The end must be after the start."), { status: 400 });
}

export function campaignStatus(campaign: { active: boolean; startsAt: string; endsAt: string }, now = new Date()) {
  if (!campaign.active) return "Paused";
  if (new Date(campaign.endsAt) <= now) return "Expired";
  return new Date(campaign.startsAt) > now ? "Scheduled" : "Live";
}
