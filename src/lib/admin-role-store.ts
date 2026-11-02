import { cache } from "react";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { ADMIN_ROLE_LABELS } from "./admin";
import { ALL_ADMIN, DEFAULT_ROLE_PERMISSIONS, ROLES, type Permission } from "./rbac";

export const ROLE_CONFIG_KEY = "admin.roleDefinitions";
export const roleDefinitionSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9_]{2,79}$/),
  label: z.string().trim().min(2).max(80),
  permissions: z.array(z.string().refine((p): p is Permission => ALL_ADMIN.includes(p as Permission))).max(ALL_ADMIN.length)
});
export type AdminRoleDefinition = z.infer<typeof roleDefinitionSchema> & { builtIn: boolean };
export function mergeRoleDefinitions(raw: string | null): AdminRoleDefinition[] {
  const definitions = Object.entries(DEFAULT_ROLE_PERMISSIONS).map(([key, permissions]) => ({ key, label: ADMIN_ROLE_LABELS[key] ?? key, permissions: [...permissions], builtIn: true }));
  const overrides = raw ? z.array(roleDefinitionSchema).max(50).parse(JSON.parse(raw)) : [];
  const seen = new Set<string>();
  for (const value of overrides) {
    if (seen.has(value.key)) throw new Error("Duplicate role definition");
    seen.add(value.key);
    if (value.key === ROLES.SUPER_ADMIN) continue; // Owner access cannot be disabled by configuration.
    if (!Object.hasOwn(DEFAULT_ROLE_PERMISSIONS, value.key) && !/^admin_custom_[a-z0-9_]+$/.test(value.key)) throw new Error("Invalid admin role key");
    if (!value.permissions.includes("admin.access")) throw new Error("Admin access is required");
    const next = { ...value, permissions: [...new Set(value.permissions)], builtIn: Object.hasOwn(DEFAULT_ROLE_PERMISSIONS, value.key) };
    const index = definitions.findIndex(role => role.key === value.key);
    if (index >= 0) definitions[index] = next; else definitions.push(next);
  }
  return definitions;
}
export async function readRoleDefinitions(db: Pick<Prisma.TransactionClient, "systemConfig"> = prisma) {
  const value = await db.systemConfig.findUnique({ where: { key: ROLE_CONFIG_KEY }, select: { value: true } });
  return mergeRoleDefinitions(value?.value ?? null);
}
export const getRoleDefinitions = cache(readRoleDefinitions);
export async function getRoleAccess(role: string) {
  if (role === ROLES.SUPER_ADMIN) return { role, permissions: [...ALL_ADMIN], roleLabel: ADMIN_ROLE_LABELS[role] };
  if (!Object.hasOwn(DEFAULT_ROLE_PERMISSIONS, role) && !role.startsWith("admin_custom_")) return { role, permissions: [] as Permission[], roleLabel: role };
  const definition = (await getRoleDefinitions()).find(value => value.key === role);
  return { role, permissions: definition?.permissions ?? [], roleLabel: definition?.label ?? role };
}
