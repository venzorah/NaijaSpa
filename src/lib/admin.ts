import {
  BadgeCheck,
  Bot,
  CalendarCheck,
  Crown,
  FileSearch,
  FolderTree,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Newspaper,
  ScrollText,
  Settings2,
  SlidersHorizontal,
  Store,
  Users,
  Wallet
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { hasPermission, ROLES, type Permission } from "@/lib/rbac";

export type AdminScreenId =
  | "dashboard"
  | "users"
  | "vendors"
  | "applications"
  | "categories"
  | "services"
  | "bookings"
  | "finance"
  | "commercial"
  | "memberships"
  | "campaigns"
  | "cms"
  | "support"
  | "ai"
  | "roles"
  | "audit"
  | "settings";

export type AdminAccess = "full" | "view";

export const ADMIN_SCREEN_GROUPS = ["Overview", "Marketplace", "Revenue", "Content & care", "Platform"] as const;

export const ADMIN_SCREENS: {
  id: AdminScreenId;
  href: string;
  label: string;
  group: (typeof ADMIN_SCREEN_GROUPS)[number];
  icon: LucideIcon;
  description: string;
  view: Permission[];
  edit: Permission[];
}[] = [
  {
    id: "dashboard",
    href: "/admin",
    label: "Dashboard",
    group: "Overview",
    icon: LayoutDashboard,
    description: "Marketplace health, money flow and recent activity.",
    view: ["admin.access"],
    edit: ["analytics.view"]
  },
  {
    id: "users",
    href: "/admin/users",
    label: "Customers",
    group: "Marketplace",
    icon: Users,
    description: "Search customers, review flags and handle account actions.",
    view: ["users.manage"],
    edit: ["users.manage"]
  },
  {
    id: "vendors",
    href: "/admin/vendors",
    label: "Vendors",
    group: "Marketplace",
    icon: Store,
    description: "Vendor profiles, subscriptions, catalogue and compliance.",
    view: ["vendors.manage", "vendors.verify"],
    edit: ["vendors.manage"]
  },
  {
    id: "applications",
    href: "/admin/applications",
    label: "Applications",
    group: "Marketplace",
    icon: FileSearch,
    description: "Review vendor applications and protected documents.",
    view: ["vendors.verify", "vendors.manage"],
    edit: ["vendors.verify"]
  },
  {
    id: "categories",
    href: "/admin/categories",
    label: "Categories",
    group: "Marketplace",
    icon: FolderTree,
    description: "Organise the service taxonomy shown to customers.",
    view: ["catalog.manage", "cms.manage"],
    edit: ["catalog.manage"]
  },
  {
    id: "services",
    href: "/admin/services",
    label: "Service moderation",
    group: "Marketplace",
    icon: BadgeCheck,
    description: "Approve, flag or reject vendor service listings.",
    view: ["catalog.manage", "vendors.manage"],
    edit: ["catalog.manage"]
  },
  {
    id: "bookings",
    href: "/admin/bookings",
    label: "Bookings",
    group: "Marketplace",
    icon: CalendarCheck,
    description: "Live booking operations and exceptions.",
    view: ["bookings.manage", "finance.view"],
    edit: ["bookings.manage"]
  },
  {
    id: "finance",
    href: "/admin/finance",
    label: "Finance",
    group: "Revenue",
    icon: Wallet,
    description: "Transactions, refunds, payouts and reconciliation.",
    view: ["finance.view"],
    edit: ["finance.manage"]
  },
  {
    id: "commercial",
    href: "/admin/commercial",
    label: "Commercial config",
    group: "Revenue",
    icon: SlidersHorizontal,
    description: "Plans, commission, galleries, home feed and location hubs.",
    view: ["finance.view", "commercial.manage", "analytics.view"],
    edit: ["commercial.manage"]
  },
  {
    id: "memberships",
    href: "/admin/memberships",
    label: "Memberships & promos",
    group: "Revenue",
    icon: Crown,
    description: "Customer memberships, promo codes and offers.",
    view: ["campaigns.manage", "finance.view"],
    edit: ["campaigns.manage"]
  },
  {
    id: "campaigns",
    href: "/admin/campaigns",
    label: "Sponsored campaigns",
    group: "Revenue",
    icon: Megaphone,
    description: "Sponsored placements, scheduling and reporting.",
    view: ["campaigns.manage", "analytics.view"],
    edit: ["campaigns.manage"]
  },
  {
    id: "cms",
    href: "/admin/cms",
    label: "Site content",
    group: "Content & care",
    icon: Newspaper,
    description: "Homepage, banners, FAQs, legal, help and SEO.",
    view: ["cms.manage"],
    edit: ["cms.manage"]
  },
  {
    id: "support",
    href: "/admin/support",
    label: "Support & moderation",
    group: "Content & care",
    icon: LifeBuoy,
    description: "Tickets, complaints, reviews, disputes and appeals.",
    view: ["support.manage"],
    edit: ["support.manage"]
  },
  {
    id: "ai",
    href: "/admin/ai",
    label: "AI search",
    group: "Platform",
    icon: Bot,
    description: "Provider, limits and behaviour of AI-assisted search.",
    view: ["ai.manage", "analytics.view"],
    edit: ["ai.manage"]
  },
  {
    id: "roles",
    href: "/admin/roles",
    label: "Roles & permissions",
    group: "Platform",
    icon: KeyRound,
    description: "Who can see and change what.",
    view: ["roles.manage"],
    edit: ["roles.manage"]
  },
  {
    id: "audit",
    href: "/admin/audit",
    label: "Audit log",
    group: "Platform",
    icon: ScrollText,
    description: "Immutable record of administrative changes.",
    view: ["audit.view"],
    edit: ["roles.manage"]
  },
  {
    id: "settings",
    href: "/admin/settings",
    label: "System settings",
    group: "Platform",
    icon: Settings2,
    description: "Languages, currency, PWA, theme and notifications.",
    view: ["roles.manage"],
    edit: ["roles.manage"]
  }
];

export const ADMIN_ROLE_LABELS: Record<string, string> = {
  [ROLES.SUPER_ADMIN]: "Super administrator",
  [ROLES.OPERATIONS]: "Operations administrator",
  [ROLES.VERIFICATION]: "Vendor verification officer",
  [ROLES.SUPPORT]: "Customer support agent",
  [ROLES.FINANCE]: "Finance officer",
  [ROLES.CONTENT]: "Content manager",
  [ROLES.MARKETING]: "Marketing manager",
  [ROLES.MODERATOR]: "Moderator",
  [ROLES.ANALYST]: "Read-only analyst"
};

export const ADMIN_PERMISSION_ROWS: { area: string; action: string; permission: Permission }[] = [
  { area: "Customers", action: "View and manage customer accounts", permission: "users.manage" },
  { area: "Vendors", action: "Create vendor and send setup invite", permission: "vendors.invite" },
  { area: "Vendors", action: "Manage vendor profiles and status", permission: "vendors.manage" },
  { area: "Vendors", action: "Review applications and KYC documents", permission: "vendors.verify" },
  { area: "Catalogue", action: "Edit categories and moderate services", permission: "catalog.manage" },
  { area: "Bookings", action: "Reschedule or cancel bookings", permission: "bookings.manage" },
  { area: "Finance", action: "View ledgers and reports", permission: "finance.view" },
  { area: "Finance", action: "Approve refunds and release payouts", permission: "finance.manage" },
  { area: "Finance", action: "Edit plan prices and surcharges", permission: "commercial.manage" },
  { area: "Growth", action: "Manage memberships, promos and campaigns", permission: "campaigns.manage" },
  { area: "Content", action: "Publish site content, hero and legal", permission: "cms.manage" },
  { area: "Support", action: "Resolve tickets and moderate reviews", permission: "support.manage" },
  { area: "Platform", action: "Configure AI search", permission: "ai.manage" },
  { area: "Platform", action: "Manage roles and system settings", permission: "roles.manage" },
  { area: "Platform", action: "View audit log", permission: "audit.view" }
];

export function accessForScreen(role: string, screenId: AdminScreenId): AdminAccess | null {
  const screen = ADMIN_SCREENS.find((s) => s.id === screenId);
  if (!screen) return null;
  if (screen.edit.some((p) => hasPermission(role, p))) return "full";
  if (screen.view.some((p) => hasPermission(role, p))) return "view";
  return null;
}

export function visibleAdminScreens(role: string) {
  return ADMIN_SCREENS.filter((s) => accessForScreen(role, s.id));
}

export function canEditAdminScreen(role: string, screenId: AdminScreenId) {
  return accessForScreen(role, screenId) === "full";
}

export function vendorStatusLabel(applicationStatus: string) {
  if (applicationStatus === "approved") return "Approved";
  if (applicationStatus === "suspended") return "Suspended";
  if (applicationStatus === "rejected") return "Rejected";
  if (applicationStatus === "submitted" || applicationStatus === "under_review") return "Pending";
  return "Draft";
}

export function bookingBucket(status: string, startsAt: Date, now = new Date()) {
  if (status === "cancelled" || status === "refunded") return "Cancelled";
  if (status === "completed") return "Completed";
  if (status === "in_progress" || (status === "confirmed" && startsAt <= now)) return "In progress";
  if (status === "disputed") return "Disputed";
  return "Upcoming";
}
