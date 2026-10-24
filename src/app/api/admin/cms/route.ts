import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

function pageKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const RESERVED = new Set(["admin", "vendor", "login", "api", "account", "explore", "category", "in"]);

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin("cms.manage");
    const body = z
      .object({
        key: z.string().min(2).max(80),
        title: z.string().min(2).max(120),
        body: z.string().max(20000).optional(),
        metaTitle: z.string().max(80).optional(),
        metaDescription: z.string().max(320).optional()
      })
      .parse(await req.json());
    const key = pageKey(body.key);
    if (!key || RESERVED.has(key)) throw Object.assign(new Error("Choose a different page slug"), { status: 400 });
    const block = await prisma.cmsBlock.create({
      data: {
        key,
        title: body.title.trim(),
        body: body.body ?? "",
        metaTitle: body.metaTitle ?? "",
        metaDescription: body.metaDescription ?? "",
        published: false
      }
    });
    await audit({ actorId: actor.id, action: "cms.create", entityType: "CmsBlock", entityId: block.id, after: block });
    return NextResponse.json({ block });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin("cms.manage");
    const body = z
      .object({
        id: z.string(),
        title: z.string().optional(),
        body: z.string().optional(),
        metaTitle: z.string().max(80).optional(),
        metaDescription: z.string().max(320).optional(),
        published: z.boolean().optional()
      })
      .parse(await req.json());
    const before = await prisma.cmsBlock.findUniqueOrThrow({ where: { id: body.id } });
    const block = await prisma.cmsBlock.update({
      where: { id: body.id },
      data: {
        title: body.title,
        body: body.body,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        published: body.published
      }
    });
    await audit({ actorId: actor.id, action: "cms.update", entityType: "CmsBlock", entityId: body.id, before, after: block });
    return NextResponse.json({ block });
  } catch (e) {
    return jsonError(e);
  }
}
