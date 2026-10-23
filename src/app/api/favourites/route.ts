import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

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
    const body = z.object({ vendorId: z.string().optional(), serviceId: z.string().optional() }).parse(await req.json());
    const item = await prisma.favourite.create({ data: { userId: user.id, vendorId: body.vendorId, serviceId: body.serviceId } });
    return NextResponse.json({ item });
  } catch (e) {
    return jsonError(e);
  }
}
