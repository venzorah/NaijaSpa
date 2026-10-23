import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { assertVideoLinksAllowed, assertVideoUrl, MAX_VIDEO_LINKS } from "@/lib/galleries";
import { jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    if (!user.vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const entitlement = await vendorEntitlement(user.vendorId);
    assertVideoLinksAllowed(entitlement);
    const body = z.object({ url: z.string(), title: z.string().max(120).optional() }).parse(await req.json());
    const count = await prisma.vendorVideoLink.count({ where: { vendorId: user.vendorId } });
    if (count >= MAX_VIDEO_LINKS) {
      return NextResponse.json({ error: `You can add at most ${MAX_VIDEO_LINKS} video links` }, { status: 400 });
    }
    const link = await prisma.vendorVideoLink.create({
      data: {
        vendorId: user.vendorId,
        url: assertVideoUrl(body.url),
        title: body.title?.trim() ?? "",
        sortOrder: count
      }
    });
    return NextResponse.json({ link });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = requireUser(await getSession());
    if (!user.vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const entitlement = await vendorEntitlement(user.vendorId);
    assertVideoLinksAllowed(entitlement);
    const id = new URL(req.url).searchParams.get("id") || "";
    const existing = await prisma.vendorVideoLink.findFirst({ where: { id, vendorId: user.vendorId } });
    if (!existing) return NextResponse.json({ error: "Video link not found" }, { status: 404 });
    await prisma.vendorVideoLink.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
