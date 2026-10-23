import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getSession();
  const { theme } = z.object({ theme: z.enum(["dark", "light"]) }).parse(await req.json());
  if (session) {
    await prisma.user.update({ where: { id: session.id }, data: { theme } });
  }
  return NextResponse.json({ ok: true });
}
