import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  role: "super_admin" as string | null,
  setConfig: vi.fn(),
  findUnique: vi.fn(),
  audit: vi.fn(),
  invalidate: vi.fn()
}));

vi.mock("../src/lib/auth", () => ({
  getSession: async () => (mock.role ? { id: "admin", role: mock.role } : null),
  requireUser: (user: unknown) => {
    if (!user) {
      const err = new Error("Unauthorized");
      (err as Error & { status: number }).status = 401;
      throw err;
    }
    return user;
  }
}));
vi.mock("../src/lib/db", () => ({
    prisma: {
      systemConfig: { findUnique: mock.findUnique },
      category: { findMany: async () => [] },
      vendor: { findMany: async () => [] },
      service: { findMany: async () => [] },
      shopProduct: { findMany: async () => [] }
    },
  setConfig: mock.setConfig
}));
vi.mock("../src/lib/audit", () => ({ audit: mock.audit }));
vi.mock("next/cache", () => ({ revalidateTag: mock.invalidate }));

import { GET, PUT } from "../src/app/api/admin/homepage/route";
import { DEFAULT_HOME_SECTIONS } from "../src/lib/home-sections";

const req = (data: unknown) =>
  new Request("http://localhost/api/admin/homepage", { method: "PUT", body: JSON.stringify(data) });

beforeEach(() => {
  vi.clearAllMocks();
  mock.role = "super_admin";
  mock.findUnique.mockResolvedValue(null);
  mock.setConfig.mockResolvedValue(undefined);
});

describe("admin homepage section curator", () => {
  it("rejects customers and analysts from reading or writing the layout", async () => {
    mock.role = "customer";
    expect((await GET()).status).toBe(403);
    expect((await PUT(req({ sections: DEFAULT_HOME_SECTIONS }))).status).toBe(403);
    mock.role = "analyst";
    expect((await GET()).status).toBe(403);
    expect((await PUT(req({ sections: DEFAULT_HOME_SECTIONS }))).status).toBe(403);
    expect(mock.setConfig).not.toHaveBeenCalled();
  });

  it("lets content and marketing staff manage homepage rails", async () => {
    mock.role = "content_manager";
    expect((await GET()).status).toBe(200);
    expect((await PUT(req({ sections: DEFAULT_HOME_SECTIONS }))).status).toBe(200);
    mock.role = "marketing_manager";
    expect((await GET()).status).toBe(200);
    expect((await PUT(req({ sections: DEFAULT_HOME_SECTIONS }))).status).toBe(200);
    mock.role = "moderator";
    expect((await GET()).status).toBe(403);
    expect((await PUT(req({ sections: DEFAULT_HOME_SECTIONS }))).status).toBe(403);
  });

  it("rejects a partial PUT so one section cannot wipe the rest", async () => {
    expect((await PUT(req({ sections: [DEFAULT_HOME_SECTIONS[0]] }))).status).toBe(400);
    expect(mock.setConfig).not.toHaveBeenCalled();
  });

  it("rejects duplicate order numbers", async () => {
    const sections = DEFAULT_HOME_SECTIONS.map((row, index) => ({ ...row, sortOrder: index === 0 ? 1 : row.sortOrder }));
    sections[1] = { ...sections[1], sortOrder: 1 };
    expect((await PUT(req({ sections }))).status).toBe(400);
    expect(mock.setConfig).not.toHaveBeenCalled();
  });

  it("saves an extra rail the admin added", async () => {
    const extra = {
      id: "extra_abcdefghijklmnop",
      kind: "featured" as const,
      title: "Weekend picks",
      subtitle: "",
      visible: true,
      source: "auto" as const,
      serviceIds: [] as string[],
      vendorIds: [] as string[],
      categorySlugs: [] as string[],
      productIds: [] as string[],
      sortOrder: 10
    };
    expect((await PUT(req({ sections: [...DEFAULT_HOME_SECTIONS, extra] }))).status).toBe(200);
    expect(mock.setConfig).toHaveBeenCalled();
    const saved = JSON.parse(mock.setConfig.mock.calls[0][1]) as { id: string }[];
    expect(saved.some((row) => row.id === extra.id)).toBe(true);
  });

  it("rejects an extra rail without a type", async () => {
    const extra = {
      id: "extra_abcdefghijklmnop",
      title: "Weekend picks",
      subtitle: "",
      visible: true,
      source: "auto",
      serviceIds: [],
      vendorIds: [],
      categorySlugs: [],
      productIds: [],
      sortOrder: 10
    };
    expect((await PUT(req({ sections: [...DEFAULT_HOME_SECTIONS, extra] }))).status).toBe(400);
    expect(mock.setConfig).not.toHaveBeenCalled();
  });

  it("saves Shop product ids on the shopProducts rail", async () => {
    const sections = DEFAULT_HOME_SECTIONS.map((row) =>
      row.id === "shopProducts" ? { ...row, visible: true, source: "manual" as const, productIds: ["prod_1"] } : row
    );
    expect((await PUT(req({ sections }))).status).toBe(200);
    const saved = JSON.parse(mock.setConfig.mock.calls[0][1]) as { id: string; productIds: string[] }[];
    expect(saved.find((row) => row.id === "shopProducts")).toMatchObject({
      visible: true,
      source: "manual",
      productIds: ["prod_1"]
    });
  });

  it("saves a complete layout and refreshes the public homepage", async () => {
    expect((await PUT(req({ sections: DEFAULT_HOME_SECTIONS }))).status).toBe(200);
    expect(mock.setConfig).toHaveBeenCalled();
    expect(mock.invalidate).toHaveBeenCalledWith("home-catalog");
    expect(mock.audit).toHaveBeenCalled();
  });
});
