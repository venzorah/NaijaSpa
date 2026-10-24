import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_MARKETPLACE_HUBS, MARKETPLACE_HUBS_KEY, parseMarketplaceHubs } from "@/lib/hubs";

export const revalidate = 120;

export async function GET() {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: MARKETPLACE_HUBS_KEY } });
    return NextResponse.json({ hubs: parseMarketplaceHubs(row?.value) });
  } catch {
    return NextResponse.json({ hubs: DEFAULT_MARKETPLACE_HUBS });
  }
}
