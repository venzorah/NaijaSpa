import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ payments: vi.fn(), customers: vi.fn(), vendors: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../src/lib/admin-auth", () => ({ requireAdminScreen: async () => ({ user: { role: "super_admin" }, editable: true }) }));
vi.mock("../src/lib/db", () => ({ prisma: {
  user: { count: mock.customers }, vendor: { groupBy: mock.vendors }, booking: { findMany: async () => [] },
  payment: { findMany: mock.payments }, auditLog: { findMany: async () => [] }, vendorSubscription: { count: async () => 0 },
  campaign: { findMany: async () => [] }, refund: { aggregate: async () => ({ _sum: { amountKobo: 0 } }) }, payout: { aggregate: async () => ({ _sum: { amountKobo: 0 } }) }
} }));
import Dashboard from "../src/app/admin/dashboard/page";
import { MoneyFlow } from "../src/components/admin/money-flow";
import { StatCard } from "../src/components/admin/stat-card";
import Link from "../src/components/navigation-link";

function collect(node: ReactNode, type: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(node)) return node.flatMap((child) => collect(child, type));
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [...(node.type === type ? [node.props] : []), ...collect(node.props.children, type)];
}

describe("admin dashboard metric completeness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mock.vendors.mockResolvedValue([]);
    mock.payments.mockResolvedValue([]);
  });
  it("keeps all payments in the selected period and customer totals after reducing query payloads", async () => {
    const payments = Array.from({ length: 100 }, (_, i) => ({ id: `payment-${i}`, reference: `test-${i}`, purpose: "booking", amountKobo: 100000, createdAt: new Date() }));
    mock.payments.mockImplementation(async (query) => {
      const rows = payments.filter((payment) => payment.createdAt >= (query.where.createdAt?.gte ?? new Date(0)));
      return query.take ? rows.slice(0, query.take) : rows;
    });
    mock.customers.mockImplementation(async (query) => query.where.status === "active" ? 1200 : 1234);
    const page = await Dashboard({ searchParams: Promise.resolve({ range: "30d" }) });
    expect(collect(page, MoneyFlow)[0].collected).toBe(10000000);
    const customers = collect(page, StatCard).find((card) => card.label === "Customers");
    expect(customers?.value).toBe("1,234");
    expect(customers?.sub).toBe("1,200 active");
  });

  it("excludes deleted customers and vendors while retaining suspended accounts in totals", async () => {
    const customers = ["active", "active", "suspended", "deleted", "deleted"];
    const vendors = [
      { applicationStatus: "approved", _count: 2 },
      { applicationStatus: "draft", _count: 1 },
      { applicationStatus: "suspended", _count: 1 },
      { applicationStatus: "deleted", _count: 7 }
    ];
    mock.customers.mockImplementation(async ({ where }) => customers.filter((status) =>
      typeof where.status === "string" ? status === where.status : status !== where.status?.not
    ).length);
    mock.vendors.mockImplementation(async ({ where }) => vendors.filter((vendor) =>
      vendor.applicationStatus !== where?.applicationStatus?.not
    ));
    const page = await Dashboard({ searchParams: Promise.resolve({ range: "30d" }) });
    const customerCard = collect(page, StatCard).find((card) => card.label === "Customers");
    expect(customerCard?.value).toBe("3");
    expect(customerCard?.sub).toBe("2 active");
    const vendorLinks = collect(page, Link).filter((link) => link.href === "/admin/vendors");
    expect(vendorLinks.some((link) => link.children === "4")).toBe(true);
    expect(mock.customers).toHaveBeenCalledWith({ where: { role: "customer", status: { not: "deleted" } } });
    expect(mock.vendors).toHaveBeenCalledWith({ where: { applicationStatus: { not: "deleted" } }, by: ["applicationStatus"], _count: true });
  });
});
