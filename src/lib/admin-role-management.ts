import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import { ROLES } from "./rbac";
import { readRoleDefinitions, ROLE_CONFIG_KEY, roleDefinitionSchema, type AdminRoleDefinition } from "./admin-role-store";

function denied(message: string, status = 400): never { throw Object.assign(new Error(message), { status }); }
export function requireRoleOwner(actor: { role: string }) {
  if (actor.role !== ROLES.SUPER_ADMIN) denied("Only a super administrator can manage roles or assignments.", 403);
}
export async function changeRoleDefinition(actor: { id: string; role: string }, action: "create" | "update" | "delete", input: unknown) {
  requireRoleOwner(actor);
  const body = action === "create" ? { ...roleDefinitionSchema.omit({ key: true }).parse(input), key: undefined } : action === "delete" ? { ...roleDefinitionSchema.pick({ key: true }).parse(input), label: "", permissions: [] } : roleDefinitionSchema.partial({ key: true }).parse(input);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('naijaspa.admin.roles'))::text`;
    const roles = await readRoleDefinitions(tx);
    if (action === "create" && roles.length >= 51) denied("The administrator role limit has been reached.");
    const key = action === "create" ? `admin_custom_${randomUUID().replaceAll("-", "")}` : body.key;
    const before = roles.find(role => role.key === key);
    if (key === ROLES.SUPER_ADMIN) denied("Super administrator permissions are protected.");
    if (action !== "create" && !before) denied("Role not found", 404);
    if (action === "delete" && before?.builtIn) denied("Built-in roles cannot be removed.");
    if (action === "delete" && await tx.user.count({ where: { role: key } })) denied("Reassign every account using this role before removing it.", 409);
    if (action !== "delete" && roles.some(role => role.key !== key && role.label.toLowerCase() === body.label.toLowerCase())) denied("A role with this name already exists.", 409);
    const role: AdminRoleDefinition = { key: key!, label: body.label, permissions: [...new Set(["admin.access" as const, ...body.permissions])], builtIn: before?.builtIn ?? false };
    const next = action === "delete" ? roles.filter(role => role.key !== key) : action === "create" ? [...roles, role] : roles.map(value => value.key === key ? role : value);
    const value = JSON.stringify(next.filter(role => role.key !== ROLES.SUPER_ADMIN).map(({ key, label, permissions }) => ({ key, label, permissions })));
    await tx.systemConfig.upsert({ where: { key: ROLE_CONFIG_KEY }, create: { key: ROLE_CONFIG_KEY, value }, update: { value } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: `adminRole.${action}`, entityType: "AdminRole", entityId: key!, beforeJson: before ? JSON.stringify(before) : null, afterJson: action === "delete" ? null : JSON.stringify(role) } });
    return { role: action === "delete" ? null : role };
  });
}
export async function assignAdminRole(actor: { id: string; role: string }, userId: string, role: string) {
  requireRoleOwner(actor);
  if (actor.id === userId) denied("You cannot change your own role.");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('naijaspa.admin.roles'))::text`;
    const roles = await readRoleDefinitions(tx);
    if (!roles.some(value => value.key === role)) denied("Choose an existing admin role.");
    const before = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true, name: true, email: true } });
    if (!before) denied("Account not found", 404);
    if (!roles.some(value => value.key === before.role)) denied("Only existing admin accounts can be reassigned here.");
    if (before.role === ROLES.SUPER_ADMIN && role !== ROLES.SUPER_ADMIN && await tx.user.count({ where: { role: ROLES.SUPER_ADMIN, status: "active" } }) <= 1) denied("The last active super administrator cannot be demoted.");
    const user = await tx.user.update({ where: { id: userId }, data: { role }, select: { id: true, role: true, name: true, email: true } });
    await tx.session.deleteMany({ where: { userId } });
    await tx.auditLog.create({ data: { actorId: actor.id, action: "role.update", entityType: "User", entityId: userId, beforeJson: JSON.stringify(before), afterJson: JSON.stringify(user) } });
    return { user };
  });
}
