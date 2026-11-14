import { beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  session: { deleteMany: vi.fn() },
  passwordReset: { deleteMany: vi.fn() },
  pushSubscription: { deleteMany: vi.fn() },
  customerProfile: { deleteMany: vi.fn() },
  favourite: { deleteMany: vi.fn() },
  notification: { deleteMany: vi.fn() },
  customerMembership: { deleteMany: vi.fn() },
  vendorStaff: { updateMany: vi.fn() },
  auditLog: { updateMany: vi.fn() },
  supportTicket: { updateMany: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
  ticketMessage: { deleteMany: vi.fn() },
  vendorInvite: { deleteMany: vi.fn() },
  phoneOtpChallenge: { deleteMany: vi.fn() },
  booking: { count: vi.fn() },
  review: { count: vi.fn() },
  bookingMessage: { count: vi.fn(), deleteMany: vi.fn() },
  adminListingClick: { deleteMany: vi.fn() }
}));

vi.mock("../src/lib/db", () => ({ prisma: db }));
vi.mock("../src/lib/admin-media-deletion", () => ({ ownedMediaKey: () => null }));
vi.mock("../src/lib/category-media", () => ({ deleteCategoryImageFile: vi.fn() }));
vi.mock("../src/lib/gallery-media", () => ({ deleteGalleryImageFile: vi.fn() }));
vi.mock("../src/lib/object-storage", () => ({ deleteMediaObject: vi.fn() }));
vi.mock("../src/lib/verification-docs", () => ({ deleteVerificationFile: vi.fn() }));

import { freeAbandonedIdentity, releasedIdentity, releaseUserIdentity } from "../src/lib/account-purge";

beforeEach(() => {
  vi.clearAllMocks();
  db.supportTicket.findMany.mockResolvedValue([]);
  db.booking.count.mockResolvedValue(0);
  db.review.count.mockResolvedValue(0);
  db.bookingMessage.count.mockResolvedValue(0);
});

it("releases email, phone and Google login so the same details can be used again", () => {
  expect(releasedIdentity("user-1")).toMatchObject({
    status: "deleted",
    email: "deleted-user-1@redacted.naijaspa",
    phone: null,
    phoneNormalized: null,
    googleId: null,
    passwordHash: null
  });
});

it("deletes a customer with no bookings instead of keeping the unique email", async () => {
  db.user.findUnique.mockResolvedValue({
    id: "user-1",
    email: "old@example.invalid",
    phoneNormalized: "2348012345678",
    vendorOwned: null
  });
  expect(await releaseUserIdentity(db as never, "user-1")).toEqual({ removed: true });
  expect(db.user.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
  expect(db.phoneOtpChallenge.deleteMany).toHaveBeenCalled();
});

it("keeps a stub when bookings exist but still frees the original email and phone", async () => {
  db.user.findUnique.mockResolvedValue({
    id: "user-1",
    email: "old@example.invalid",
    phoneNormalized: "2348012345678",
    vendorOwned: null
  });
  db.booking.count.mockResolvedValue(2);
  expect(await releaseUserIdentity(db as never, "user-1")).toEqual({ removed: false });
  expect(db.user.update).toHaveBeenCalledWith({
    where: { id: "user-1" },
    data: expect.objectContaining({
      email: "deleted-user-1@redacted.naijaspa",
      phoneNormalized: null,
      googleId: null
    })
  });
  expect(db.user.delete).not.toHaveBeenCalled();
});

it("treats a previously deleted vendor login as free for a new signup", async () => {
  db.user.findUnique.mockResolvedValueOnce({ id: "old", status: "deleted", accountKind: "registered" });
  db.user.findUnique.mockResolvedValueOnce({
    id: "old",
    email: "keep@example.invalid",
    phoneNormalized: null,
    vendorOwned: { id: "vendor" }
  });
  expect(await freeAbandonedIdentity("keep@example.invalid")).toBe(true);
  expect(db.user.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ email: "deleted-old@redacted.naijaspa" })
  }));
});
