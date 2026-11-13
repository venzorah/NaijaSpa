export const ADMIN_DASHBOARD_RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;
export type AdminDashboardRange = keyof typeof ADMIN_DASHBOARD_RANGES;

export function parseAdminDashboardRange(raw?: string | null): AdminDashboardRange {
  return raw === "7d" || raw === "90d" ? raw : "30d";
}

export function adminDashboardSince(range: AdminDashboardRange, now = Date.now()) {
  return new Date(now - ADMIN_DASHBOARD_RANGES[range] * 864e5);
}

export function adminDashboardRangeLabel(range: AdminDashboardRange) {
  return range === "7d" ? "last 7 days" : range === "90d" ? "last 90 days" : "last 30 days";
}

export function adminDashboardHref(range: AdminDashboardRange) {
  return range === "30d" ? "/admin/dashboard" : `/admin/dashboard?range=${range}`;
}

export function dashboardTimeBuckets(range: AdminDashboardRange, now = new Date()) {
  const days = ADMIN_DASHBOARD_RANGES[range];
  const bucketDays = range === "7d" ? 1 : range === "30d" ? 3 : 7;
  const count = Math.ceil(days / bucketDays);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (count * bucketDays - 1));
  return Array.from({ length: count }, (_, i) => {
    const from = new Date(start);
    from.setDate(start.getDate() + i * bucketDays);
    const to = new Date(from);
    to.setDate(from.getDate() + bucketDays);
    const label =
      bucketDays === 1
        ? from.toLocaleDateString("en-NG", { weekday: "short" })
        : from.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
    return { from, to, label };
  });
}
