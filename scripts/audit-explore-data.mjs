import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
try {
  const vendors = await db.vendor.findMany({ select: { slug: true, businessName: true, visibility: true, applicationStatus: true,
    verificationStatus: true, ratingAvg: true, reviewCount: true, state: true, city: true, staff: { select: { name: true, active: true } },
    services: { where: { active: true }, select: { name: true } }, owner: { select: { email: true } } } });
  const report = {
    source: process.env.USE_DEMO_LISTINGS === "true" ? "bundled-demo" : process.env.USE_DEMO_LISTINGS === "false" || /^postgres(ql)?:/.test(process.env.DATABASE_URL || "") ? "database" : "bundled-demo",
    unpublishedCount: vendors.filter((vendor) => vendor.visibility !== "public" || vendor.applicationStatus !== "approved").length,
    vendors: vendors.filter((vendor) => vendor.visibility === "public" && vendor.applicationStatus === "approved").map(({ owner, ...vendor }) => ({ ...vendor,
      provenance: ["paid.vendor@naijaspa.com", "free.vendor@naijaspa.com"].includes(owner.email) && ["osun-wellness", "calm-house-ikeja"].includes(vendor.slug) ? "seeded-example"
        : /^(integration-|feature-|search-feature-|flow-fix-|favourites-|explore-audit-)/.test(vendor.slug) ? "automated-test-fixture" : "not-established-by-this-audit" }))
  };
  await mkdir(".integration-tests", { recursive: true });
  await writeFile(".integration-tests/explore-data-audit.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await db.$disconnect(); }
