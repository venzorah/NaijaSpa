export const ROLES = {
  CUSTOMER: "customer",
  VENDOR_OWNER: "vendor_owner",
  VENDOR_STAFF: "vendor_staff",
  SUPER_ADMIN: "super_admin",
  OPERATIONS: "operations_admin",
  VERIFICATION: "verification_officer",
  SUPPORT: "support_agent",
  FINANCE: "finance_officer",
  CONTENT: "content_manager",
  MARKETING: "marketing_manager",
  MODERATOR: "moderator",
  ANALYST: "analyst"
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export type Permission =
  | "admin.access"
  | "users.manage"
  | "vendors.manage"
  | "vendors.verify"
  | "vendors.invite"
  | "finance.view"
  | "finance.manage"
  | "commercial.manage"
  | "bookings.manage"
  | "cms.manage"
  | "support.manage"
  | "campaigns.manage"
  | "ai.manage"
  | "roles.manage"
  | "audit.view"
  | "analytics.view";

const ALL_ADMIN: Permission[] = [
  "admin.access",
  "users.manage",
  "vendors.manage",
  "vendors.verify",
  "vendors.invite",
  "finance.view",
  "finance.manage",
  "commercial.manage",
  "bookings.manage",
  "cms.manage",
  "support.manage",
  "campaigns.manage",
  "ai.manage",
  "roles.manage",
  "audit.view",
  "analytics.view"
];

const MATRIX: Record<string, Permission[]> = {
  [ROLES.SUPER_ADMIN]: ALL_ADMIN,
  [ROLES.OPERATIONS]: [
    "admin.access",
    "users.manage",
    "vendors.manage",
    "vendors.verify",
    "vendors.invite",
    "bookings.manage",
    "support.manage",
    "audit.view",
    "analytics.view"
  ],
  [ROLES.VERIFICATION]: ["admin.access", "vendors.verify", "audit.view"],
  [ROLES.SUPPORT]: ["admin.access", "support.manage", "users.manage"],
  [ROLES.FINANCE]: ["admin.access", "finance.view", "finance.manage", "analytics.view", "audit.view"],
  [ROLES.CONTENT]: ["admin.access", "cms.manage"],
  [ROLES.MARKETING]: ["admin.access", "campaigns.manage", "cms.manage", "analytics.view"],
  [ROLES.MODERATOR]: ["admin.access", "support.manage"],
  [ROLES.ANALYST]: ["admin.access", "analytics.view", "finance.view", "audit.view"]
};

export function isAdminRole(role: string): boolean {
  return role in MATRIX;
}

export function isVendorRole(role: string): boolean {
  return role === ROLES.VENDOR_OWNER || role === ROLES.VENDOR_STAFF;
}

export function portalHome(role: string) {
  if (isAdminRole(role)) return "/admin";
  if (isVendorRole(role)) return "/vendor";
  return "/account";
}

export function hasPermission(role: string, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function assertPermission(role: string, permission: Permission) {
  if (!hasPermission(role, permission)) {
    const err = new Error("Forbidden");
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}
