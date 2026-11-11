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
    service: { findMany: async () => [] }
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

  it("saves a complete layout and refreshes the public homepage", async () => {
    expect((await PUT(req({ sections: DEFAULT_HOME_SECTIONS }))).status).toBe(200);
    expect(mock.setConfig).toHaveBeenCalled();
    expect(mock.invalidate).toHaveBeenCalledWith("home-catalog");
    expect(mock.audit).toHaveBeenCalled();
  });
});
