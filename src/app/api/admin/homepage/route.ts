import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { getSession, requireUser } from "@/lib/auth";
import { assertPermission, assertAnyPermission, hasPermission } from "@/lib/rbac";
import { prisma, setConfig } from "@/lib/db";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import {
  HOME_SECTION_IDS,
  HOME_SECTIONS_CONFIG_KEY,
  parseHomeSections
} from "@/lib/home-sections";

const sectionSchema = z.object({
  id: z.enum(HOME_SECTION_IDS),
  title: z.string().max(80),
  subtitle: z.string().max(240),
  visible: z.boolean(),
  source: z.enum(["auto", "manual"]),
  serviceIds: z.array(z.string().min(1).max(64)).max(48),
  vendorIds: z.array(z.string().min(1).max(64)).max(48),
  categorySlugs: z.array(z.string().min(1).max(80)).max(24)
});

async function loadLayout() {
  const row = await prisma.systemConfig.findUnique({ where: { key: HOME_SECTIONS_CONFIG_KEY } });
  return parseHomeSections(row?.value);
}

export async function GET() {
  try {
    const user = requireUser(await getSession());
    assertAnyPermission(user, ["cms.manage", "campaigns.manage"]);
    const [layout, categories, vendors, services] = await Promise.all([
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
      })
    ]);
    return NextResponse.json({
      canEdit: hasPermission(user, "cms.manage"),
      layout,
      categories,
      vendors,
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
    const user = requireUser(await getSession());
    assertPermission(user, "cms.manage");
    const before = await loadLayout();
    const body = z.object({ sections: z.array(sectionSchema).min(1).max(HOME_SECTION_IDS.length) }).parse(await req.json());
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
