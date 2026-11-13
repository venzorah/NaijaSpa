import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "./db";
import { bookingUnlocksVendorContact } from "./commercial";
import { detectImageMime } from "./galleries";
import { CHAT_IMAGE_MAX_BYTES, chatImageExpiresAt, isChatImageLive, mapChatMessage } from "./chat-images";

export { mapChatMessage } from "./chat-images";

export const bookingMessageBody = z
  .string()
  .trim()
  .min(1, "Write a message")
  .max(2000, "Keep messages under 2000 characters");

export const bookingMessageCaption = z.string().trim().max(2000, "Keep messages under 2000 characters");

export type ChatParty = "customer" | "vendor";

type ChatImageRow = {
  id: string;
  senderId: string;
  body: string;
  createdAt: Date;
  imageMime: string | null;
  imageExpiresAt: Date | null;
  hasPayload: unknown;
};

function sqlBool(value: unknown) {
  return value === true || value === 1 || value === "t" || value === "true";
}

function missingChatImageColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /imagepayload|imagemime|imageexpiresat|column .* does not exist/i.test(message);
}

function paymentSucceeded(payments: Array<{ status: string }>) {
  return payments.some((p) => p.status === "success");
}

function messageId() {
  return `msg_${randomBytes(12).toString("hex")}`;
}

export async function loadPaidBookingChat(bookingId: string, party: ChatParty, userId: string, vendorId?: string) {
  const booking = await prisma.booking.findFirst({
    where:
      party === "customer"
        ? { id: bookingId, customerId: userId }
        : { id: bookingId, vendorId: vendorId || "" },
    select: {
      id: true,
      status: true,
      customerId: true,
      vendorId: true,
      vendor: { select: { ownerId: true, businessName: true } },
      customer: { select: { id: true, name: true } },
      payments: { select: { status: true } }
    }
  });
  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }
  if (!bookingUnlocksVendorContact(booking.status, paymentSucceeded(booking.payments))) {
    throw Object.assign(new Error("Chat opens after Paystack confirms payment."), { status: 403 });
  }
  return booking;
}

export async function purgeExpiredChatImages(bookingId?: string) {
  const now = new Date();
  try {
    if (bookingId) {
      await prisma.$executeRaw`
        UPDATE "BookingMessage"
        SET "imagePayload" = NULL, "imageMime" = ''
        WHERE "bookingId" = ${bookingId}
          AND "imagePayload" IS NOT NULL
          AND "imageExpiresAt" IS NOT NULL
          AND "imageExpiresAt" <= ${now}
      `;
      return;
    }
    await prisma.$executeRaw`
      UPDATE "BookingMessage"
      SET "imagePayload" = NULL, "imageMime" = ''
      WHERE "imagePayload" IS NOT NULL
        AND "imageExpiresAt" IS NOT NULL
        AND "imageExpiresAt" <= ${now}
    `;
  } catch (error) {
    if (!missingChatImageColumn(error)) throw error;
  }
}

async function listMessageRows(bookingId: string): Promise<ChatImageRow[]> {
  try {
    const rows = await prisma.$queryRaw<ChatImageRow[]>`
      SELECT
        id,
        "senderId",
        body,
        "createdAt",
        COALESCE("imageMime", '') as "imageMime",
        "imageExpiresAt",
        ("imagePayload" IS NOT NULL) as "hasPayload"
      FROM "BookingMessage"
      WHERE "bookingId" = ${bookingId}
      ORDER BY "createdAt" DESC
      LIMIT 200
    `;
    return rows.reverse();
  } catch (error) {
    if (!missingChatImageColumn(error)) throw error;
    const rows = await prisma.bookingMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, senderId: true, body: true, createdAt: true }
    });
    return rows.reverse().map((row) => ({ ...row, imageMime: "", imageExpiresAt: null, hasPayload: false }));
  }
}

export async function listBookingMessages(bookingId: string, party: ChatParty, userId: string, vendorId?: string) {
  const booking = await loadPaidBookingChat(bookingId, party, userId, vendorId);
  await purgeExpiredChatImages(booking.id);
  const rows = await listMessageRows(booking.id);
  return {
    booking,
    messages: rows.map((row) =>
      mapChatMessage(
        {
          id: row.id,
          senderId: row.senderId,
          body: row.body,
          createdAt: row.createdAt,
          hasImage: sqlBool(row.hasPayload),
          imageExpiresAt: row.imageExpiresAt
        },
        userId
      )
    )
  };
}

export async function listAdminBookingMessages(bookingId: string, viewerId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId },
    select: {
      id: true,
      customerId: true,
      vendor: { select: { businessName: true } },
      customer: { select: { name: true } },
      service: { select: { name: true } }
    }
  });
  if (!booking) {
    throw Object.assign(new Error("Booking not found"), { status: 404 });
  }
  await purgeExpiredChatImages(booking.id);
  const rows = await listMessageRows(booking.id);
  return {
    booking,
    messages: rows.map((row) =>
      mapChatMessage(
        {
          id: row.id,
          senderId: row.senderId,
          body: row.body,
          createdAt: row.createdAt,
          hasImage: sqlBool(row.hasPayload),
          imageExpiresAt: row.imageExpiresAt
        },
        viewerId
      )
    )
  };
}

export async function readAdminChatImage(bookingId: string, messageId: string) {
  await purgeExpiredChatImages(bookingId);
  const rows = await prisma.$queryRaw<Array<{ imagePayload: Buffer | Uint8Array | null; imageMime: string | null; imageExpiresAt: Date | null }>>`
    SELECT "imagePayload", "imageMime", "imageExpiresAt"
    FROM "BookingMessage"
    WHERE id = ${messageId} AND "bookingId" = ${bookingId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    throw Object.assign(new Error("Photo not found."), { status: 404 });
  }
  if (!row.imagePayload || !isChatImageLive(row.imageExpiresAt)) {
    throw Object.assign(new Error("This photo has expired."), { status: 410 });
  }
  const bytes = Buffer.isBuffer(row.imagePayload) ? row.imagePayload : Buffer.from(row.imagePayload);
  return { bytes, mime: row.imageMime || "image/jpeg" };
}

async function notifyChat(
  booking: { id: string; customerId: string; vendor: { ownerId: string; businessName: string }; customer: { name: string } },
  party: ChatParty,
  preview: string
) {
  const recipientId = party === "customer" ? booking.vendor.ownerId : booking.customerId;
  const from = party === "customer" ? booking.customer.name : booking.vendor.businessName;
  await prisma.notification.create({
    data: {
      userId: recipientId,
      title: `Message · ${from}`,
      body: preview.slice(0, 180),
      actionUrl: party === "customer" ? `/vendor/chats/${booking.id}` : `/account/chats/${booking.id}`
    }
  });
}

export async function postBookingMessage(
  bookingId: string,
  party: ChatParty,
  userId: string,
  body: string,
  vendorId?: string
) {
  const booking = await loadPaidBookingChat(bookingId, party, userId, vendorId);
  const message = await prisma.bookingMessage.create({
    data: { bookingId: booking.id, senderId: userId, body },
    select: { id: true, senderId: true, body: true, createdAt: true }
  });
  await notifyChat(booking, party, body);
  return { booking, message: mapChatMessage(message, userId) };
}

export async function postBookingChatImage(
  bookingId: string,
  party: ChatParty,
  userId: string,
  bytes: Uint8Array,
  caption: string,
  vendorId?: string
) {
  if (bytes.byteLength > CHAT_IMAGE_MAX_BYTES) {
    throw Object.assign(new Error("Photos must be 2 MB or smaller."), { status: 400 });
  }
  const mime = detectImageMime(bytes);
  if (!mime) {
    throw Object.assign(new Error("Use a JPEG, PNG, WebP or GIF photo."), { status: 400 });
  }
  const booking = await loadPaidBookingChat(bookingId, party, userId, vendorId);
  const id = messageId();
  const createdAt = new Date();
  const expiresAt = chatImageExpiresAt(createdAt);
  const payload = Buffer.from(bytes);
  await prisma.$executeRaw`
    INSERT INTO "BookingMessage" (
      id, "bookingId", "senderId", body, "createdAt", "imageMime", "imagePayload", "imageExpiresAt"
    ) VALUES (
      ${id}, ${booking.id}, ${userId}, ${caption}, ${createdAt}, ${mime}, ${payload}, ${expiresAt}
    )
  `;
  await notifyChat(booking, party, caption || "Sent a photo (expires in 10 minutes)");
  return {
    booking,
    message: mapChatMessage(
      { id, senderId: userId, body: caption, createdAt, hasImage: true, imageExpiresAt: expiresAt },
      userId
    )
  };
}

export async function readLiveChatImage(
  bookingId: string,
  messageId: string,
  party: ChatParty,
  userId: string,
  vendorId?: string
) {
  await loadPaidBookingChat(bookingId, party, userId, vendorId);
  await purgeExpiredChatImages(bookingId);
  const rows = await prisma.$queryRaw<Array<{ imagePayload: Buffer | Uint8Array | null; imageMime: string | null; imageExpiresAt: Date | null }>>`
    SELECT "imagePayload", "imageMime", "imageExpiresAt"
    FROM "BookingMessage"
    WHERE id = ${messageId} AND "bookingId" = ${bookingId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    throw Object.assign(new Error("Photo not found."), { status: 404 });
  }
  if (!row.imagePayload || !isChatImageLive(row.imageExpiresAt)) {
    throw Object.assign(new Error("This photo has expired."), { status: 410 });
  }
  const bytes = Buffer.isBuffer(row.imagePayload) ? row.imagePayload : Buffer.from(row.imagePayload);
  return { bytes, mime: row.imageMime || "image/jpeg", expiresAt: row.imageExpiresAt };
}

export async function parseBookingChatPost(req: Request) {
  const type = req.headers.get("content-type") || "";
  if (type.includes("multipart/form-data")) {
    const form = await req.formData();
    const caption = bookingMessageCaption.parse(String(form.get("body") || ""));
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1) {
      if (!caption) throw Object.assign(new Error("Write a message or attach a photo."), { status: 400 });
      return { kind: "text" as const, body: bookingMessageBody.parse(caption) };
    }
    if (file.size > CHAT_IMAGE_MAX_BYTES) {
      throw Object.assign(new Error("Photos must be 2 MB or smaller."), { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { kind: "image" as const, caption, bytes };
  }
  const json = z.object({ body: bookingMessageBody }).parse(await req.json());
  return { kind: "text" as const, body: json.body };
}
