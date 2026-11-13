import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { TICKER_CONFIG_KEY, activeTickerItems, parseTickerSlots } from "@/lib/ticker";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: TICKER_CONFIG_KEY } });
    return NextResponse.json({ items: activeTickerItems(parseTickerSlots(row?.value)) });
  } catch (e) {
    return jsonError(e);
  }
}
