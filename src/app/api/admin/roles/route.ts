import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { isAdminRole, ROLES } from "@/lib/rbac";

const ADMIN_ROLES = [
  ROLES.SUPER_ADMIN,
  ROLES.OPERATIONS,
  ROLES.VERIFICATION,
  ROLES.SUPPORT,
  ROLES.FINANCE,
  ROLES.CONTENT,
  ROLES.MARKETING,
  ROLES.MODERATOR,
  ROLES.ANALYST
] as const;

export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin("roles.manage");
    const body = z
      .object({
        userId: z.string(),
        role: z.string().refine((r): r is (typeof ADMIN_ROLES)[number] => (ADMIN_ROLES as readonly string[]).includes(r))
      })
      .parse(await req.json());
    if (body.userId === actor.id) return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
    const before = await prisma.user.findUniqueOrThrow({ where: { id: body.userId } });
    if (!isAdminRole(before.role)) {
      return NextResponse.json({ error: "Only existing admin accounts can change role here" }, { status: 400 });
    }
    const user = await prisma.user.update({ where: { id: body.userId }, data: { role: body.role } });
    await audit({ actorId: actor.id, action: "role.update", entityType: "User", entityId: body.userId, before, after: user });
    return NextResponse.json({ user });
  } catch (e) {
    return jsonError(e);
  }
}
