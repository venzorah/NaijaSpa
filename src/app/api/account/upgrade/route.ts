import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { assertPortalAccount } from "@/lib/portal-auth";
import { jsonError } from "@/lib/http";
import { upgradeGuestAccount } from "@/lib/guest-identity";

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    assertPortalAccount(user, "customer");
    const body = z.object({ email: z.string().email(), password: z.string().min(10) }).parse(await req.json());
    await upgradeGuestAccount(user.id, body.email, body.password);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
