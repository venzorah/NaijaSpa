import { NextResponse } from "next/server";
import { z } from "zod";
import { askNaijaSpa } from "@/lib/ai-search";
import { getSession } from "@/lib/auth";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";

export async function POST(req: Request) {
  try {
    await rateLimit(`ai:${clientAddress(req)}`, 20);
    const session = await getSession();
    const body = z.object({ message: z.string().min(2).max(500), prior: z.record(z.unknown()).optional() }).parse(await req.json());
    const result = await askNaijaSpa(body.message, body.prior as never, session?.id);
    return NextResponse.json(result);
  } catch (e) {
    return jsonError(e);
  }
}
