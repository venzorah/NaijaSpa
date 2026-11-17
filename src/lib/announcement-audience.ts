import type { AnnouncementImage, AnnouncementLink } from "./announcement-content";

export const ANNOUNCEMENT_AUDIENCES = ["customers", "vendors", "incomplete_vendors", "all", "individuals"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];
export const ANNOUNCEMENT_AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  customers: "Customers",
  vendors: "All therapists",
  incomplete_vendors: "Incomplete listings",
  all: "Everyone",
  individuals: "Individuals"
};
export const ANNOUNCEMENT_CHANNELS = ["email", "message", "both"] as const;
export type AnnouncementChannel = (typeof ANNOUNCEMENT_CHANNELS)[number];

export type AnnouncementSendInput = {
  id?: string;
  audience: AnnouncementAudience;
  subject: string;
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  images?: AnnouncementImage[];
  links?: AnnouncementLink[];
  channel: AnnouncementChannel;
  userIds?: string[];
};

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
  channel: AnnouncementChannel;
  queued?: boolean;
  imageCount: number;
  linkCount: number;
  error?: string;
};
