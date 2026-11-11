import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export function vendorSlugBase(businessName: string) {
  const name = businessName.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100).replace(/-+$/g, "");
  return `vendor-${name || "spa"}`;
}

async function lock(tx: Prisma.TransactionClient) {
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(77107420)`;
}

export async function availableVendorSlug(tx: Prisma.TransactionClient, base: string, ownId: string) {
  for (let n = 1; n <= 10000; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const vendor = await tx.vendor.findUnique({ where: { slug }, select: { id: true } });
    const alias = await tx.vendorSlugAlias.findUnique({ where: { slug }, select: { vendorId: true } });
    if ((!vendor || vendor.id === ownId) && (!alias || alias.vendorId === ownId)) return slug;
  }
  throw Object.assign(new Error("Could not reserve a business URL. Please try again."), { status: 409 });
}

async function rename(tx: Prisma.TransactionClient, row: { id: string; slug: string }, businessName: string, data: Prisma.VendorUpdateInput = {}) {
  const slug = await availableVendorSlug(tx, vendorSlugBase(businessName), row.id);
  // Reserve both names forever so an old link cannot be taken by another business.
  for (const name of new Set([row.slug, slug])) {
    const alias = await tx.vendorSlugAlias.findUnique({ where: { slug: name } });
    if (alias && alias.vendorId !== row.id) throw new Error("Business URL reservation conflict");
    if (!alias) await tx.vendorSlugAlias.create({ data: { slug: name, vendorId: row.id } });
  }
  return tx.vendor.update({ where: { id: row.id }, data: { ...data, slug } });
}

export async function updateVendorWithSlug(id: string, data: Prisma.VendorUpdateInput & { businessName: string }) {
  return prisma.$transaction(async tx => {
    await lock(tx);
    const row = await tx.vendor.findUniqueOrThrow({ where: { id }, select: { id: true, slug: true } });
    return rename(tx, row, data.businessName, data);
  }, { timeout: 10000 });
}

export async function backfillVendorSlugs() {
  return prisma.$transaction(async tx => {
    await lock(tx);
    const rows = await tx.vendor.findMany({ orderBy: { id: "asc" }, select: { id: true, slug: true, businessName: true } });
    let changed = 0;
    for (const row of rows) {
      const vendor = await rename(tx, row, row.businessName);
      if (vendor.slug !== row.slug) changed++;
    }
    return { total: rows.length, changed };
  }, { timeout: 120000 });
}
