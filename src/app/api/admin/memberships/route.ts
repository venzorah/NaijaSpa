import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { hasPermission } from "@/lib/rbac";

export async function GET() {
  try {
    const actor = await requireAdmin(["memberships.manage", "campaigns.manage", "finance.view"]);
    const promos = await prisma.promotion.findMany({ orderBy: { code: "asc" } });
    return NextResponse.json({
      canEdit: hasPermission(actor.role, "memberships.manage"),
      promos
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST() {
  return NextResponse.json({ error: "Customer memberships are not offered." }, { status: 410 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Customer memberships are not offered." }, { status: 410 });
}
