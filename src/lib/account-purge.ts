import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { ownedMediaKey } from "./admin-media-deletion";
import { deleteCategoryImageFile } from "./category-media";
import { deleteGalleryImageFile } from "./gallery-media";
import { deleteMediaObject } from "./object-storage";
import { emailOtpDest } from "./phone";
import { deleteVerificationFile } from "./verification-docs";

type Db = Prisma.TransactionClient | typeof prisma;

export function releasedIdentity(id: string) {
  return {
    status: "deleted" as const,
    name: "Deleted account",
    email: `deleted-${id}@redacted.naijaspa`,
    phone: null,
    phoneNormalized: null,
    passwordHash: null,
    googleId: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    deletionRequestedAt: null
  };
}

export function identityIsReleased(email: string, status?: string, accountKind?: string) {
  if (status === "deleted" || accountKind === "merged") return true;
  return email.endsWith("@redacted.naijaspa") || email.startsWith("merged.");
}

function galleryUrls(raw: string | null | undefined) {
  if (!raw) return [] as string[];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => (typeof item === "string" ? item : item && typeof item === "object" && "url" in item ? String((item as { url?: string }).url || "") : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function purgeStoredFiles(input: { urls?: string[]; kycPaths?: string[] }) {
  const urls = [...new Set(input.urls || [])];
  const kycPaths = [...new Set(input.kycPaths || [])];
  for (const url of urls) {
    try {
      const key = ownedMediaKey(url);
      if (key?.startsWith("galleries/") || url.startsWith("/api/media/galleries/")) await deleteGalleryImageFile(url);
      else if (key?.startsWith("categories/") || url.startsWith("/api/media/categories/")) await deleteCategoryImageFile(url);
      else if (key) await deleteMediaObject(key);
    } catch {
      /* Retry on the next delete; identity is already freed. */
    }
  }
  for (const path of kycPaths) {
    try {
      await deleteVerificationFile(path);
    } catch {
      /* same */
    }
  }
  if (urls.length) {
    await prisma.mediaAsset.deleteMany({ where: { url: { in: urls } } }).catch(() => undefined);
  }
}

async function clearLoginChallenges(tx: Db, user: { email: string; phoneNormalized: string | null }) {
  const dest = [emailOtpDest(user.email)];
  if (user.phoneNormalized) dest.push(user.phoneNormalized);
  await tx.phoneOtpChallenge.deleteMany({ where: { phoneNormalized: { in: dest } } });
}

async function wipeUserSideTables(tx: Db, userId: string) {
  await tx.session.deleteMany({ where: { userId } });
  await tx.passwordReset.deleteMany({ where: { userId } });
  await tx.pushSubscription.deleteMany({ where: { userId } });
  await tx.customerProfile.deleteMany({ where: { userId } });
  await tx.favourite.deleteMany({ where: { userId } });
  await tx.notification.deleteMany({ where: { userId } });
  await tx.customerMembership.deleteMany({ where: { userId } });
  await tx.vendorStaff.updateMany({ where: { userId }, data: { userId: null, active: false } });
  await tx.auditLog.updateMany({ where: { actorId: userId }, data: { actorId: null } });
  await tx.supportTicket.updateMany({ where: { assigneeId: userId }, data: { assigneeId: null } });
  const tickets = await tx.supportTicket.findMany({ where: { authorId: userId }, select: { id: true } });
  if (tickets.length) {
    await tx.ticketMessage.deleteMany({ where: { ticketId: { in: tickets.map((row) => row.id) } } });
    await tx.supportTicket.deleteMany({ where: { authorId: userId } });
  }
  await tx.vendorInvite.deleteMany({ where: { invitedById: userId } });
}

export async function releaseUserIdentity(tx: Db, userId: string) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, phoneNormalized: true, vendorOwned: { select: { id: true } } }
  });
  if (!user) return { removed: false };
  await clearLoginChallenges(tx, user);
  await wipeUserSideTables(tx, userId);
  const bookingCount = await tx.booking.count({ where: { customerId: userId } });
  const reviewCount = await tx.review.count({ where: { userId } });
  const messageCount = await tx.bookingMessage.count({ where: { senderId: userId } });
  const ownsVendor = Boolean(user.vendorOwned);
  if (!ownsVendor && bookingCount === 0 && reviewCount === 0) {
    if (messageCount) await tx.bookingMessage.deleteMany({ where: { senderId: userId } });
    await tx.adminListingClick.deleteMany({ where: { actorId: userId } });
    await tx.user.delete({ where: { id: userId } });
    return { removed: true };
  }
  await tx.user.update({ where: { id: userId }, data: releasedIdentity(userId) });
  return { removed: false };
}

export async function freeAbandonedIdentity(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, status: true, accountKind: true }
  });
  if (!user) return false;
  if (user.status !== "deleted" && user.accountKind !== "merged") return false;
  await releaseUserIdentity(prisma, user.id);
  return true;
}

export async function repairDeletedIdentities() {
  const stale = await prisma.user.findMany({
    where: {
      OR: [
        { status: "deleted", phoneNormalized: { not: null } },
        { status: "deleted", googleId: { not: null } },
        { accountKind: "merged", phoneNormalized: { not: null } },
        { status: "deleted", NOT: { email: { endsWith: "@redacted.naijaspa" } } }
      ]
    },
    select: { id: true },
    take: 200
  });
  for (const row of stale) {
    await releaseUserIdentity(prisma, row.id);
  }
  return stale.length;
}

async function collectVendorFiles(tx: Db, vendorId: string) {
  const vendor = await tx.vendor.findUniqueOrThrow({
    where: { id: vendorId },
    select: {
      logoUrl: true,
      coverUrl: true,
      galleryJson: true,
      documents: { select: { filePath: true } },
      services: { select: { imageUrl: true } },
      staff: { select: { photoUrl: true } },
      galleries: { select: { images: { select: { url: true } } } }
    }
  });
  const urls = [
    vendor.logoUrl,
    vendor.coverUrl,
    ...galleryUrls(vendor.galleryJson),
    ...vendor.services.map((row) => row.imageUrl),
    ...vendor.staff.map((row) => row.photoUrl),
    ...vendor.galleries.flatMap((gallery) => gallery.images.map((image) => image.url))
  ].filter((value): value is string => Boolean(value));
  return { urls, kycPaths: vendor.documents.map((doc) => doc.filePath) };
}

export async function purgeCustomerAccount(actorId: string, userId: string, reason: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, status: true, email: true, phoneNormalized: true }
  });
  if (!user || user.status === "deleted") throw Object.assign(new Error("Customer not found"), { status: 404 });
  if (user.role !== "customer") throw Object.assign(new Error("Only customer accounts can be deleted here."), { status: 400 });
  const result = await prisma.$transaction(async (tx) => {
    const outcome = await releaseUserIdentity(tx, userId);
    await tx.auditLog.create({
      data: {
        actorId,
        action: "customer.delete",
        entityType: "User",
        entityId: userId,
        afterJson: JSON.stringify({ deleted: true, reason, removed: outcome.removed })
      }
    });
    return outcome;
  });
  await repairDeletedIdentities().catch(() => undefined);
  return { ok: true, ...result };
}

export async function purgeVendorAccount(actorId: string, vendorId: string, reason: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, ownerId: true, applicationStatus: true, slug: true }
  });
  if (!vendor || vendor.applicationStatus === "deleted") throw Object.assign(new Error("Vendor not found"), { status: 404 });
  if (vendor.ownerId === actorId) throw Object.assign(new Error("You cannot delete your own account here."), { status: 400 });

  const files = await prisma.$transaction((tx) => collectVendorFiles(tx, vendorId));
  const staffUsers = await prisma.vendorStaff.findMany({
    where: { vendorId, userId: { not: null } },
    select: { userId: true }
  });

  await prisma.$transaction(async (tx) => {
    const staffRows = await tx.vendorStaff.findMany({ where: { vendorId }, select: { id: true } });
    const staffIds = staffRows.map((row) => row.id);
    if (staffIds.length) await tx.timeOff.deleteMany({ where: { staffId: { in: staffIds } } });
    await tx.availabilitySlot.deleteMany({ where: { vendorId } });
    await tx.verificationDoc.deleteMany({ where: { vendorId } });
    const galleries = await tx.therapistGallery.findMany({ where: { vendorId }, select: { id: true } });
    if (galleries.length) {
      await tx.therapistGalleryImage.deleteMany({ where: { galleryId: { in: galleries.map((row) => row.id) } } });
      await tx.therapistGallery.deleteMany({ where: { vendorId } });
    }
    await tx.vendorVideoLink.deleteMany({ where: { vendorId } });
    await tx.serviceSlugAlias.deleteMany({ where: { service: { vendorId } } });
    await tx.vendorSlugAlias.deleteMany({ where: { vendorId } });
    const services = await tx.service.findMany({ where: { vendorId }, select: { id: true } });
    for (const service of services) {
      await tx.service.update({
        where: { id: service.id },
        data: { active: false, imageUrl: null, deletedAt: new Date(), slug: `deleted-svc-${service.id}` }
      });
    }
    await tx.campaign.updateMany({ where: { vendorId }, data: { active: false } });
    await tx.heroAd.updateMany({ where: { vendorId }, data: { active: false, imageUrl: "" } });
    await tx.vendorStaff.updateMany({ where: { vendorId }, data: { active: false, photoUrl: null, userId: null } });
    await tx.session.deleteMany({
      where: { OR: [{ userId: vendor.ownerId }, { user: { staffMemberships: { some: { vendorId } } } }] }
    });
    const bookingCount = await tx.booking.count({ where: { vendorId } });
    await tx.vendor.update({
      where: { id: vendorId },
      data: {
        applicationStatus: "deleted",
        visibility: "hidden",
        slug: `deleted-${vendorId}`,
        logoUrl: null,
        coverUrl: null,
        galleryJson: "[]",
        privatePhone: null,
        privateWhatsapp: null,
        instagramUrl: null,
        payoutBankCode: null,
        payoutBankName: null,
        payoutAccountNumber: null,
        payoutAccountName: null,
        payoutRecipientCode: null,
        description: ""
      }
    });
    if (bookingCount === 0) {
      await tx.favourite.deleteMany({ where: { OR: [{ vendorId }, { service: { vendorId } }] } });
      await tx.listingHit.deleteMany({ where: { vendorId } });
      await tx.adminListingClick.deleteMany({ where: { vendorId } });
      await tx.vendorInvite.deleteMany({ where: { vendorId } });
      await tx.heroAd.updateMany({ where: { vendorId }, data: { vendorId: null } });
      await tx.campaign.deleteMany({ where: { vendorId } });
      await tx.payout.deleteMany({ where: { vendorId } });
      await tx.vendorEarning.deleteMany({ where: { vendorId } });
      await tx.vendorSubscription.deleteMany({ where: { vendorId } });
      await tx.vendorStaff.deleteMany({ where: { vendorId } });
      await tx.vendor.delete({ where: { id: vendorId } });
    }
    await releaseUserIdentity(tx, vendor.ownerId);
    for (const staff of staffUsers) {
      if (staff.userId && staff.userId !== vendor.ownerId) await releaseUserIdentity(tx, staff.userId);
    }
    await tx.auditLog.create({
      data: {
        actorId,
        action: "vendor.delete",
        entityType: "Vendor",
        entityId: vendorId,
        afterJson: JSON.stringify({ deleted: true, reason, filesRemoved: files.urls.length + files.kycPaths.length })
      }
    });
  }, { timeout: 20000 });

  await purgeStoredFiles(files);
  await repairDeletedIdentities().catch(() => undefined);
  return { ok: true };
}
