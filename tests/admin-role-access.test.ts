import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ raw: null as string | null, saved: vi.fn(), audit: vi.fn(), revoke: vi.fn(), users: new Map<string, { id: string; role: string; name: string; email: string; status: string }>() }));
vi.mock("../src/lib/db", () => {
  const tx = {
    $queryRaw: vi.fn(),
    systemConfig: { findUnique: async () => mock.raw === null ? null : { value: mock.raw }, upsert: async ({ update }: { update: { value: string } }) => { mock.raw = update.value; mock.saved(update); } },
    auditLog: { create: mock.audit }, session: { deleteMany: mock.revoke },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => mock.users.get(where.id) ?? null,
      count: async ({ where }: { where: { role: string; status?: string | {not:string} } }) => [...mock.users.values()].filter(user => user.role === where.role && (!where.status || (typeof where.status === "string" ? user.status === where.status : user.status !== where.status.not))).length,
      update: async ({ where, data }: { where: { id: string }; data: { role: string } }) => { const user = { ...mock.users.get(where.id)!, role: data.role }; mock.users.set(user.id, user); return { id: user.id, role: user.role, name: user.name, email: user.email }; }
    }
  };
  return { prisma: { ...tx, $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(tx) } };
});
import { ALL_ADMIN, hasPermission, isAdminRole, portalHome, ROLES } from "../src/lib/rbac";
import { accessForScreen } from "../src/lib/admin";
import { getRoleAccess, mergeRoleDefinitions } from "../src/lib/admin-role-store";
import { assignAdminRole, changeRoleDefinition } from "../src/lib/admin-role-management";
const actor = { id: "owner", role: ROLES.SUPER_ADMIN };
beforeEach(() => {
  vi.clearAllMocks(); mock.raw = null; mock.users.clear();
  for (const [id, role] of [["owner", ROLES.SUPER_ADMIN], ["finance", ROLES.FINANCE], ["customer", ROLES.CUSTOMER]]) mock.users.set(id, { id, role, name: id, email: `${id}@example.test`, status: "active" });
});
describe("configurable admin roles", () => {
  it("retains all nine built-in roles without initial configuration", () => { expect(mergeRoleDefinitions(null)).toHaveLength(9); expect(mergeRoleDefinitions(null).find(role => role.key === ROLES.SUPER_ADMIN)?.permissions).toEqual(ALL_ADMIN); });
  it("does not turn customer or vendor payloads into admin access", () => { expect(isAdminRole({ role: "customer", permissions: ALL_ADMIN })).toBe(false); expect(hasPermission({ role: "vendor_owner", permissions: ALL_ADMIN }, "finance.manage")).toBe(false); });
  it("does not treat prototype property names as built-in roles", async () => { expect(isAdminRole("constructor")).toBe(false); expect(isAdminRole("toString")).toBe(false); expect(isAdminRole(await getRoleAccess("constructor"))).toBe(false); });
  it("creates a custom role with explicitly selected responsibilities only", async () => {
    const { role } = await changeRoleDefinition(actor, "create", { key: "", label: "Category editor", permissions: ["catalog.manage"] });
    expect(role!.key).toMatch(/^admin_custom_/); expect(role!.permissions).toEqual(["admin.access", "catalog.manage"]);
    const access = await getRoleAccess(role!.key); expect(isAdminRole(access)).toBe(true); expect(portalHome(access)).toBe("/admin/dashboard");
    expect(accessForScreen(access, "categories")).toBe("full"); expect(accessForScreen(access, "finance")).toBe(null);
    expect(hasPermission(access, "roles.manage")).toBe(false); expect(mock.audit).toHaveBeenCalled();
  });
  it("honours revoked built-in grants rather than falling back to defaults", async () => {
    await changeRoleDefinition(actor, "update", { key: ROLES.CONTENT, label: "Content manager", permissions: ["admin.access"] });
    const access = await getRoleAccess(ROLES.CONTENT); expect(hasPermission(access, "catalog.manage")).toBe(false); expect(accessForScreen(access, "categories")).toBe(null);
  });
  it("protects super-admin permissions from changes and stored overrides", async () => {
    await expect(changeRoleDefinition(actor, "update", { key: ROLES.SUPER_ADMIN, label: "Owner", permissions: [] })).rejects.toThrow("protected");
    mock.raw = JSON.stringify([{ key: ROLES.SUPER_ADMIN, label: "Disabled", permissions: [] }]);
    expect(hasPermission(await getRoleAccess(ROLES.SUPER_ADMIN), "roles.manage")).toBe(true);
  });
  it("blocks privilege escalation by a delegated role with roles.manage", async () => {
    await expect(changeRoleDefinition({ id: "staff", role: "admin_custom_staff" }, "create", { label: "Escalation", permissions: ALL_ADMIN })).rejects.toMatchObject({ status: 403 });
    expect(mock.saved).not.toHaveBeenCalled();
  });
  it("rejects unknown permissions and role names reserved for customer accounts", async () => {
    await expect(changeRoleDefinition(actor, "create", { label: "Bad", permissions: ["everything"] })).rejects.toThrow();
    expect(() => mergeRoleDefinitions(JSON.stringify([{ key: "customer", label: "Bad", permissions: ALL_ADMIN }]))).toThrow("Invalid admin role");
  });
  it("assigns a custom role to an admin and revokes their existing sessions", async () => {
    const { role } = await changeRoleDefinition(actor, "create", { label: "Category editor", permissions: ["catalog.manage"] });
    const result = await assignAdminRole(actor, "finance", role!.key); expect(result.user.role).toBe(role!.key); expect(mock.revoke).toHaveBeenCalledWith({ where: { userId: "finance" } });
    expect(result.user).not.toHaveProperty("passwordHash");
  });
  it("blocks self-demotion and customer promotion", async () => {
    await expect(assignAdminRole(actor, "owner", ROLES.CONTENT)).rejects.toThrow("own role");
    await expect(assignAdminRole(actor, "customer", ROLES.CONTENT)).rejects.toThrow("existing admin");
  });
  it("rejects deletion while a custom role is assigned", async () => {
    const { role } = await changeRoleDefinition(actor, "create", { label: "Category editor", permissions: ["catalog.manage"] });
    await assignAdminRole(actor, "finance", role!.key);
    await expect(changeRoleDefinition(actor, "delete", { key: role!.key })).rejects.toMatchObject({ status: 409 });
  });
  it("removes an unassigned custom role but retains built-in roles", async () => {
    const { role } = await changeRoleDefinition(actor, "create", { label: "Temporary", permissions: [] });
    await changeRoleDefinition(actor, "delete", { key: role!.key }); expect(isAdminRole(await getRoleAccess(role!.key))).toBe(false);
    await expect(changeRoleDefinition(actor, "delete", { key: ROLES.CONTENT })).rejects.toThrow("Built-in");
  });
});
