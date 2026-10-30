import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { categoryMediaUrl, resolveCategoryMediaPath } from "@/lib/category-media";
import { prisma } from "@/lib/db";
import { getMediaObject } from "@/lib/object-storage";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif"
};

export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!/^[a-zA-Z0-9._-]+$/.test(file)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const fromDb = await prisma.category
    .findFirst({
      where: { imageUrl: categoryMediaUrl(file) },
      select: { imagePayload: true, imageMime: true }
    })
    .catch(() => null);
  if (fromDb?.imagePayload) {
    const body = Buffer.from(fromDb.imagePayload);
    return new NextResponse(body, {
      headers: {
        "Content-Type": fromDb.imageMime || MIME[path.extname(file).slice(1).toLowerCase()] || "application/octet-stream",
        "Content-Length": String(body.length),
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  }
  if (fromDb) {
    try {
      const object = await getMediaObject(`categories/${file}`);
      if (object) return new NextResponse(object.bytes, { headers: { "Content-Type": object.mime, "Content-Length": String(object.bytes.length), "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
    } catch { return NextResponse.json({ error: "Media storage is temporarily unavailable" }, { status: 503 }); }
  }
  const resolved = resolveCategoryMediaPath(file);
  if (!resolved) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const info = await stat(resolved);
    if (!info.isFile()) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const ext = path.extname(resolved).slice(1).toLowerCase();
    const body = await readFile(resolved);
    return new NextResponse(body, {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
