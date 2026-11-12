import { beforeEach, describe, expect, it, vi } from "vitest";
import { isVerificationDocKind, verificationDocLabel } from "../src/lib/verification-doc-kinds";

const mock = vi.hoisted(() => ({
  update: vi.fn(),
  count: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  upsert: vi.fn(),
  sendMail: vi.fn()
}));

vi.mock("../src/lib/auth", () => ({
  getSession: async () => ({ id: "owner", role: "vendor_owner", vendorId: "vendor" }),
  requireUser: (user: unknown) => user
}));
vi.mock("../src/lib/db", () => ({
  prisma: {
    vendor: { findUniqueOrThrow: mock.findUniqueOrThrow, update: mock.update },
    verificationDoc: { count: mock.count, upsert: mock.upsert, findUnique: async () => null }
  }
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("../src/lib/vendor-slugs", () => ({
  updateVendorWithSlug: (_id: string, data: unknown) => mock.update({ where: { id: "vendor" }, data })
}));
vi.mock("../src/lib/object-storage", () => ({
  uploadStorage: () => "local",
  putMediaObject: vi.fn(),
  getMediaObject: vi.fn(),
  deleteMediaObject: vi.fn()
}));

import { PATCH } from "../src/app/api/vendor/onboarding/route";
import { POST } from "../src/app/api/vendor/documents/route";

const profile = {
  providerType: "spa",
  businessName: "Test spa",
  state: "Lagos",
  city: "Ikeja",
  address: "12 Test Street"
};

beforeEach(() => {
  vi.clearAllMocks();
  mock.findUniqueOrThrow.mockResolvedValue({ applicationStatus: "draft", hoursJson: "{}" });
  mock.update.mockResolvedValue({ applicationStatus: "submitted" });
  mock.count.mockResolvedValue(0);
  mock.upsert.mockResolvedValue({ id: "doc1", kind: "id", status: "submitted" });
});

describe("vendor verification documents", () => {
  it("labels the three accepted document kinds", () => {
    expect(isVerificationDocKind("id")).toBe(true);
    expect(isVerificationDocKind("business_registration")).toBe(true);
    expect(isVerificationDocKind("license")).toBe(true);
    expect(isVerificationDocKind("passport")).toBe(false);
    expect(verificationDocLabel("business_registration")).toBe("Business registration");
  });

  it("blocks submit until at least one document is uploaded", async () => {
    const res = await PATCH(
      new Request("http://localhost/api/vendor/onboarding", {
        method: "PATCH",
        body: JSON.stringify({ ...profile, submit: true })
      })
    );
    expect(res.status).toBe(400);
    expect(mock.update).not.toHaveBeenCalled();
  });

  it("allows submit after a document is on file", async () => {
    mock.count.mockResolvedValue(1);
    const res = await PATCH(
      new Request("http://localhost/api/vendor/onboarding", {
        method: "PATCH",
        body: JSON.stringify({ ...profile, submit: true })
      })
    );
    expect(res.status).toBe(200);
    expect(mock.update).toHaveBeenCalled();
  });

  it("rejects an unknown document kind", async () => {
    const fd = new FormData();
    fd.set("kind", "passport");
    fd.set("file", new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: "image/jpeg" }), "id.jpg");
    const res = await POST(new Request("http://localhost/api/vendor/documents", { method: "POST", body: fd }));
    expect(res.status).toBe(400);
    expect(mock.upsert).not.toHaveBeenCalled();
  });
});
