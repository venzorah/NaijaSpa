import { prisma } from "./db";
import { ROLES } from "./rbac";
import { createSession, hashPassword, type SessionUser } from "./auth";
import { audit } from "./audit";
import { guestPlaceholderEmail, isGuestPlaceholderEmail, normalizeNgPhone } from "./phone";

export function sessionFromUser(user: { id: string; email: string; name: string; role: string; locale?: string; theme?: string | null }): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as SessionUser["role"],
    locale: user.locale || "en",
    theme: user.theme ?? "light"
  };
}

const customerPhoneSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  phoneNormalized: true,
  phoneVerifiedAt: true,
  accountKind: true,
  passwordHash: true,
  locale: true,
  theme: true,
  role: true,
  status: true
} as const;

export async function findCustomerByPhone(phoneNormalized: string, rawPhone?: string) {
  const local = phoneNormalized.startsWith("234") ? `0${phoneNormalized.slice(3)}` : "";
  const byNormalized = await prisma.user.findFirst({
    where: { phoneNormalized, role: ROLES.CUSTOMER },
    select: customerPhoneSelect
  });
  if (byNormalized) return byNormalized;
  const or = [
    ...(local ? [{ phone: local }] : []),
    { phone: `+${phoneNormalized}` },
    { phone: phoneNormalized },
    ...(rawPhone?.trim() ? [{ phone: rawPhone.trim() }] : [])
  ];
  if (!or.length) return null;
  return prisma.user.findFirst({
    where: { role: ROLES.CUSTOMER, phoneNormalized: null, OR: or },
    select: customerPhoneSelect
  });
}

export async function findOrCreateGuestCustomer(input: { name: string; phone: string; email?: string }) {
  const phoneNormalized = normalizeNgPhone(input.phone);
  if (!phoneNormalized) {
    throw Object.assign(new Error("Enter a valid Nigerian phone number."), { status: 400 });
  }
  const name = input.name.trim();
  if (name.length < 2) {
    throw Object.assign(new Error("Enter your full name."), { status: 400 });
  }
  const email = input.email?.trim().toLowerCase() || "";
  const existing = await findCustomerByPhone(phoneNormalized, input.phone);
  if (existing) {
    if (existing.status !== "active") {
      throw Object.assign(new Error("This phone number cannot be used for bookings."), { status: 409 });
    }
    if (existing.accountKind !== "guest") {
      throw Object.assign(new Error("This phone number already has a NaijaSpa account. Sign in to book."), {
        status: 409,
        code: "SIGN_IN_REQUIRED"
      });
    }
    if (email && !isGuestPlaceholderEmail(existing.email) && existing.email !== email) {
      const taken = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (taken && taken.id !== existing.id) {
        throw Object.assign(new Error("That email is already registered. Sign in or use a different email."), { status: 409 });
      }
    }
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        phone: input.phone.trim(),
        phoneNormalized,
        ...(email && (isGuestPlaceholderEmail(existing.email) || existing.email === email) ? { email } : {})
      }
    });
    return updated;
  }

  if (email) {
    const emailOwner = await prisma.user.findUnique({ where: { email }, select: { id: true, accountKind: true, role: true } });
    if (emailOwner) {
      throw Object.assign(new Error("That email is already registered. Sign in to continue."), { status: 409 });
    }
  }

  return prisma.user.create({
    data: {
      name,
      email: email || guestPlaceholderEmail(phoneNormalized),
      phone: input.phone.trim(),
      phoneNormalized,
      accountKind: "guest",
      role: ROLES.CUSTOMER,
      customerProfile: { create: {} }
    }
  });
}

export async function startGuestSession(user: { id: string; email: string; name: string; role: string; locale?: string; theme?: string | null; passwordHash?: string | null }) {
  await createSession(sessionFromUser(user), user.passwordHash || undefined);
}

export async function upgradeGuestAccount(userId: string, email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== ROLES.CUSTOMER) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  if (user.accountKind !== "guest") {
    throw Object.assign(new Error("This account is already registered."), { status: 409 });
  }
  const normalized = email.trim().toLowerCase();
  const taken = await prisma.user.findUnique({ where: { email: normalized }, select: { id: true } });
  if (taken && taken.id !== userId) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }
  const passwordHash = await hashPassword(password);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: normalized, passwordHash, accountKind: "registered" }
  });
  await audit({
    actorId: userId,
    action: "account.guest_upgrade",
    entityType: "User",
    entityId: userId
  });
  await startGuestSession(updated);
  return updated;
}

export async function claimGuestByVerifiedPhone(registeredUserId: string, phoneNormalized: string) {
  const registered = await prisma.user.findUnique({ where: { id: registeredUserId } });
  if (!registered || registered.role !== ROLES.CUSTOMER) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  const guest = await findCustomerByPhone(phoneNormalized);
  if (!guest || guest.accountKind !== "guest") {
    await prisma.user.update({
      where: { id: registeredUserId },
      data: { phoneNormalized, phone: displayOrKeep(registered.phone, phoneNormalized), phoneVerifiedAt: new Date() }
    });
    return { claimed: false };
  }
  if (guest.id === registeredUserId) {
    await prisma.user.update({
      where: { id: registeredUserId },
      data: { accountKind: "registered", phoneVerifiedAt: new Date() }
    });
    return { claimed: true };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: guest.id },
      data: { phoneNormalized: null }
    });
    await tx.booking.updateMany({ where: { customerId: guest.id }, data: { customerId: registeredUserId } });
    await tx.bookingMessage.updateMany({ where: { senderId: guest.id }, data: { senderId: registeredUserId } });
    await tx.notification.updateMany({ where: { userId: guest.id }, data: { userId: registeredUserId } });
    await tx.review.updateMany({ where: { userId: guest.id }, data: { userId: registeredUserId } });
    await tx.user.update({
      where: { id: registeredUserId },
      data: {
        phoneNormalized,
        phone: guest.phone || displayOrKeep(registered.phone, phoneNormalized),
        phoneVerifiedAt: new Date()
      }
    });
    await tx.session.deleteMany({ where: { userId: guest.id } });
    await tx.user.update({
      where: { id: guest.id },
      data: {
        phoneVerifiedAt: null,
        accountKind: "merged",
        status: "deleted",
        email: `merged.${guest.id}@guest.naijaspa.local`
      }
    });
  });
  await audit({
    actorId: registeredUserId,
    action: "account.guest_claim",
    entityType: "User",
    entityId: registeredUserId,
    after: { fromGuestId: guest.id, phoneNormalized }
  });
  return { claimed: true };
}

function displayOrKeep(existing: string | null, phoneNormalized: string) {
  if (existing) return existing;
  return `0${phoneNormalized.slice(3)}`;
}
