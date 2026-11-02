import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { assignAdminRole, changeRoleDefinition } from "@/lib/admin-role-management";
import { jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try { return NextResponse.json(await changeRoleDefinition(await requireAdmin("roles.manage"), "create", await req.json())); }
  catch (error) { return jsonError(error); }
}
export async function PUT(req: Request) {
  try { return NextResponse.json(await changeRoleDefinition(await requireAdmin("roles.manage"), "update", await req.json())); }
  catch (error) { return jsonError(error); }
}
export async function DELETE(req: Request) {
  try { return NextResponse.json(await changeRoleDefinition(await requireAdmin("roles.manage"), "delete", await req.json())); }
  catch (error) { return jsonError(error); }
}
export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin("roles.manage");
    const body = z.object({ userId: z.string().min(1), role: z.string().min(1) }).parse(await req.json());
    return NextResponse.json(await assignAdminRole(actor, body.userId, body.role));
  } catch (error) { return jsonError(error); }
}
