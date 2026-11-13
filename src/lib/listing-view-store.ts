import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./db";
import { isTrackingBot, type ListingTraffic } from "./listing-traffic";

export type ListingHitInput = ListingTraffic & {
  vendorId: string;
  serviceId?: string | null;
  kind: "view" | "click";
  path?: string;
  referrer?: string;
  ip?: string;
  userAgent?: string;
};

function hitId() {
  return `hit_${randomBytes(12).toString("hex")}`;
}

function ipHash(ip: string) {
  if (!ip || ip === "unknown") return "";
  return createHash("sha256").update(`naijaspa-hit:${ip}`).digest("hex").slice(0, 32);
}

export async function recordListingHit(input: ListingHitInput) {
  if (isTrackingBot(input.userAgent || "")) return { recorded: false as const, reason: "bot" };
  const id = hitId();
  const serviceId = input.serviceId || null;
  await prisma.$executeRaw`
    INSERT INTO "ListingHit" (
      "id", "vendorId", "serviceId", "kind", "channel", "source", "medium", "campaign",
      "content", "term", "path", "referrer", "ipHash", "userAgent", "createdAt"
    ) VALUES (
      ${id}, ${input.vendorId}, ${serviceId}, ${input.kind}, ${input.channel},
      ${input.source.slice(0, 120)}, ${input.medium.slice(0, 80)}, ${input.campaign.slice(0, 120)},
      ${input.content.slice(0, 120)}, ${input.term.slice(0, 120)}, ${(input.path || "").slice(0, 240)},
      ${(input.referrer || "").slice(0, 240)}, ${ipHash(input.ip || "")}, ${(input.userAgent || "").slice(0, 180)}, NOW()
    )
  `;
  if (input.kind === "view") {
    await prisma.$executeRaw`UPDATE "Vendor" SET "publicViewCount" = "publicViewCount" + 1 WHERE id = ${input.vendorId}`;
    if (serviceId) {
      await prisma.$executeRaw`UPDATE "Service" SET "publicViewCount" = "publicViewCount" + 1 WHERE id = ${serviceId}`;
    }
  } else if (input.channel === "admin") {
    await prisma.$executeRaw`UPDATE "Vendor" SET "adminClickCount" = "adminClickCount" + 1 WHERE id = ${input.vendorId}`;
  } else {
    await prisma.$executeRaw`UPDATE "Vendor" SET "publicClickCount" = "publicClickCount" + 1 WHERE id = ${input.vendorId}`;
    if (serviceId) {
      await prisma.$executeRaw`UPDATE "Service" SET "publicClickCount" = "publicClickCount" + 1 WHERE id = ${serviceId}`;
    }
  }
  return { recorded: true as const, id };
}

export async function recordAdminVendorClick(vendorId: string, actorId: string) {
  const id = `clk_${randomBytes(12).toString("hex")}`;
  if (actorId !== "system") {
    await prisma.$executeRaw`
      INSERT INTO "AdminListingClick" ("id", "vendorId", "actorId", "createdAt")
      VALUES (${id}, ${vendorId}, ${actorId}, NOW())
    `;
  }
  await prisma.$executeRaw`UPDATE "Vendor" SET "adminClickCount" = "adminClickCount" + 1 WHERE id = ${vendorId}`;
  return id;
}

export async function listVendorHits(vendorId: string) {
  return prisma.$queryRaw<
    Array<{
      id: string;
      kind: string;
      channel: string;
      source: string;
      medium: string;
      campaign: string;
      path: string;
      createdAt: Date;
      serviceId: string | null;
    }>
  >`
    SELECT "id", "kind", "channel", "source", "medium", "campaign", "path", "createdAt", "serviceId"
    FROM "ListingHit"
    WHERE "vendorId" = ${vendorId}
    ORDER BY "createdAt" DESC
    LIMIT 40
  `;
}

export async function vendorHitTotals(vendorId: string) {
  const rows = await prisma.$queryRaw<Array<{ kind: string; channel: string; count: bigint }>>`
    SELECT "kind", "channel", COUNT(*)::bigint AS "count"
    FROM "ListingHit"
    WHERE "vendorId" = ${vendorId}
    GROUP BY "kind", "channel"
  `;
  const totals = { views: 0, adClicks: 0, organicClicks: 0, adminClicks: 0 };
  for (const row of rows) {
    const n = Number(row.count);
    if (row.kind === "view") totals.views += n;
    else if (row.channel === "ad") totals.adClicks += n;
    else if (row.channel === "admin") totals.adminClicks += n;
    else totals.organicClicks += n;
  }
  return totals;
}
