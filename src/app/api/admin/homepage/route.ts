import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/rbac";
import { prisma, setConfig } from "@/lib/db";
import { LIVE_PRODUCT_STATUS } from "@/lib/shop/constants";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import {
  EXTRA_SECTION_ID,
  HOME_SECTION_IDS,
  HOME_SECTIONS_CONFIG_KEY,
  isHomeSectionId,
  MAX_HOME_SECTIONS,
  parseHomeSections
} from "@/lib/home-sections";

const sectionSchema = z.object({
  id: z.string().min(1).max(48),
  kind: z.enum(HOME_SECTION_IDS).optional(),
  title: z.string().max(80),
  subtitle: z.string().max(240),
  visible: z.boolean(),
  source: z.enum(["auto", "manual"]),
  serviceIds: z.array(z.string().min(1).max(64)).max(48),
  vendorIds: z.array(z.string().min(1).max(64)).max(48),
  categorySlugs: z.array(z.string().min(1).max(80)).max(24),
  productIds: z.array(z.string().min(1).max(64)).max(48).default([]),
  sortOrder: z.number().int().min(1).max(MAX_HOME_SECTIONS)
});

const putSchema = z.object({
  sections: z
    .array(sectionSchema)
    .min(HOME_SECTION_IDS.length)
    .max(MAX_HOME_SECTIONS)
    .superRefine((rows, ctx) => {
      const ids = rows.map((row) => row.id);
      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({ code: "custom", message: "Each homepage section needs its own id." });
      }
      for (const id of HOME_SECTION_IDS) {
        if (!ids.includes(id)) {
          ctx.addIssue({ code: "custom", message: "Keep the original homepage sections. Hide one instead of deleting it." });
          break;
        }
      }
      for (const row of rows) {
        if (isHomeSectionId(row.id)) continue;
        if (!EXTRA_SECTION_ID.test(row.id) || !row.kind) {
          ctx.addIssue({ code: "custom", message: "Added sections need a type (featured, providers, collections, and so on)." });
          break;
        }
      }
      const orders = rows.map((row) => row.sortOrder);
      if (new Set(orders).size !== orders.length) {
        ctx.addIssue({ code: "custom", message: "Give each section a unique order number. 1 is first." });
      }
    })
});

async function loadLayout() {
  const row = await prisma.systemConfig.findUnique({ where: { key: HOME_SECTIONS_CONFIG_KEY } });
  return parseHomeSections(row?.value);
}

export async function GET() {
  try {
    const user = await requireAdmin(["cms.manage", "campaigns.manage"]);
    const [layout, categories, vendors, services, products] = await Promise.all([
      loadLayout(),
      prisma.category.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: { slug: true, name: true }
      }),
      prisma.vendor.findMany({
        where: { applicationStatus: "approved" },
        orderBy: { businessName: "asc" },
        take: 300,
        select: { id: true, businessName: true, city: true, state: true }
      }),
      prisma.service.findMany({
        where: { active: true, vendor: { applicationStatus: "approved" } },
        orderBy: { name: "asc" },
        take: 400,
        select: {
          id: true,
          name: true,
          vendorId: true,
          vendor: { select: { businessName: true } },
          category: { select: { slug: true, name: true } }
        }
      }),
      prisma.shopProduct
        .findMany({
          where: { status: LIVE_PRODUCT_STATUS, vendor: { shopStatus: "approved" } },
          orderBy: { updatedAt: "desc" },
          take: 300,
          select: {
            id: true,
            name: true,
            slug: true,
            vendor: { select: { businessName: true } },
            category: { select: { name: true } }
          }
        })
        .catch(() => [])
    ]);
    return NextResponse.json({
      canEdit: hasPermission(user, "cms.manage"),
      layout,
      categories,
      vendors,
      products,
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        vendorId: service.vendorId,
        vendorName: service.vendor.businessName,
        categorySlug: service.category?.slug ?? "",
        categoryName: service.category?.name ?? ""
      }))
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireAdmin("cms.manage");
    const before = await loadLayout();
    const body = putSchema.parse(await req.json());
    const layout = parseHomeSections(JSON.stringify(body.sections));
    await setConfig(HOME_SECTIONS_CONFIG_KEY, JSON.stringify(layout));
    revalidateTag("home-catalog");
    await audit({
      actorId: user.id,
      action: "homeSections.update",
      entityType: "SystemConfig",
      entityId: HOME_SECTIONS_CONFIG_KEY,
      before,
      after: layout
    });
    return NextResponse.json({ layout });
  } catch (e) {
    return jsonError(e);
  }
}
