import { NextResponse } from "next/server";
import { getSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { saveFavourite } from "@/lib/favourites";

export async function GET() {
  try {
    const user = requireUser(await getSession());
    const items = await prisma.favourite.findMany({ where: { userId: user.id }, include: { service: true } });
    return NextResponse.json({ items });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    const item = await saveFavourite(user.id, await req.json());
    return NextResponse.json({ item });
  } catch (e) {
    return jsonError(e);
  }
}
