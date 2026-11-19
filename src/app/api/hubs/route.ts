import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { MARKETPLACE_HUBS_KEY, nigeriaStateHubs, parseMarketplaceHubs } from "@/lib/hubs";

export const revalidate = 120;

export async function GET() {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: MARKETPLACE_HUBS_KEY } });
    const extras = parseMarketplaceHubs(row?.value);
    const hubs = nigeriaStateHubs().map((hub) => extras.find((extra) => extra.state === hub.state) || hub);
    return NextResponse.json({ hubs });
  } catch {
    return NextResponse.json({ hubs: nigeriaStateHubs() });
  }
}
