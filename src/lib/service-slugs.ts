import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export function serviceSlugBase(name: string, business: string) {
  const part = (value: string, fallback: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100).replace(/-+$/g, "") || fallback;
  return `${part(name, "service")}-${part(business, "spa")}`;
}

export async function lockServiceSlugs(tx: Prisma.TransactionClient) {
  // Reserve the shared current-slug/old-slug namespace during short writes.
  // A single transaction lock also protects collisions between suffixed names.
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(77107419)`;
}

export async function availableServiceSlug(tx: Prisma.TransactionClient, base: string, ownId?: string) {
  for (let number = 1; number <= 10000; number++) {
    const slug = number === 1 ? base : `${base}-${number}`;
    const service = await tx.service.findUnique({ where: { slug }, select: { id: true } });
    const alias = await tx.serviceSlugAlias.findUnique({ where: { slug }, select: { serviceId: true } });
    if ((!service || service.id === ownId) && (!alias || alias.serviceId === ownId)) return slug;
  }
  throw Object.assign(new Error("Could not reserve a service URL. Please try again."), { status: 409 });
}

export async function createServiceWithSlug(data: Omit<Prisma.ServiceUncheckedCreateInput, "slug">) {
  const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: data.vendorId }, select: { businessName: true, slug: true } });
  return prisma.$transaction(async tx => {
    await lockServiceSlugs(tx);
    const slug = await availableServiceSlug(tx, serviceSlugBase(data.name, vendor.businessName || vendor.slug));
    const service = await tx.service.create({ data: { ...data, slug } });
    await tx.serviceSlugAlias.create({ data: { slug, serviceId: service.id } });
    return service;
  }, { timeout: 10000 });
}

/** Convert existing URLs once; later edits preserve their established permalink. */
export async function backfillServiceSlugs() {
  return prisma.$transaction(async tx => {
    await lockServiceSlugs(tx);
    const rows = await tx.service.findMany({ where: { slugAliases: { none: {} } },
      select: { id: true, slug: true, name: true, vendor: { select: { businessName: true, slug: true } } }, orderBy: { id: "asc" } });
    const changed: { id: string; before: string; after: string }[] = [];
    for (const row of rows) {
      const slug = await availableServiceSlug(tx, serviceSlugBase(row.name, row.vendor.businessName || row.vendor.slug), row.id);
      await tx.serviceSlugAlias.create({ data: { slug: row.slug, serviceId: row.id } });
      if (slug !== row.slug) {
        await tx.service.update({ where: { id: row.id }, data: { slug } });
        changed.push({ id: row.id, before: row.slug, after: slug });
      }
    }
    return changed;
  }, { timeout: 120000 });
}
