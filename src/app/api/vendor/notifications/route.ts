import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
export async function PATCH(req: Request) { try {
    const user = await requireVendor();
    const { id } = z.object({ id: z.string().min(1).optional() }).parse(await req.json());
    await prisma.notification.updateMany({ where: { userId: user.id, readAt: null, ...(id ? { id } : {}) }, data: { readAt: new Date() } });
    return NextResponse.json({ ok: true });
}
catch (e) {
    return jsonError(e);
} }
