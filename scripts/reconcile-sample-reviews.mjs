import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
const apply = process.argv.includes("--apply");
try {
  for (const [slug, email, rating, count] of [["osun-wellness", "paid.vendor@naijaspa.com", 4.9, 128], ["calm-house-ikeja", "free.vendor@naijaspa.com", 4.6, 41]]) {
    const result = await db.$transaction(async (tx) => {
      const vendor = await tx.vendor.findFirst({ where: { slug, owner: { email } } });
      if (!vendor) return { slug, skipped: true };
      const stats = await tx.review.aggregate({ where: { vendorId: vendor.id, status: "published" }, _avg: { rating: true }, _count: { _all: true } });
      const data = { ratingAvg: Math.round(Number(stats._avg.rating || 0) * 10) / 10, reviewCount: stats._count._all };
      // Clear only the known seed badge, not subsequent independently changed records.
      if (Number(vendor.ratingAvg) === rating && vendor.reviewCount === count && vendor.verificationStatus === "verified") data.verificationStatus = "unverified";
      if (apply) await tx.vendor.update({ where: { id: vendor.id }, data });
      return { slug, applied: apply, before: { ratingAvg: Number(vendor.ratingAvg), reviewCount: vendor.reviewCount, verificationStatus: vendor.verificationStatus }, after: data };
    });
    console.log(JSON.stringify(result));
  }
} finally { await db.$disconnect(); }
