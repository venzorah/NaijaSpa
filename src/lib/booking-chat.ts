import { z } from "zod";
import { prisma } from "./db";
import { bookingUnlocksVendorContact } from "./commercial";

export const bookingMessageBody = z
  .string()
  .trim()
  .min(1, "Write a message")
  .max(2000, "Keep messages under 2000 characters");

export type ChatParty = "customer" | "vendor";

function paymentSucceeded(payments: Array<{ status: string }>) {
  return payments.some((p) => p.status === "success");
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

export function mapChatMessage(row: { id: string; senderId: string; body: string; createdAt: Date }, currentUserId: string) {
  return {
    id: row.id,
    body: row.body,
    senderId: row.senderId,
    mine: row.senderId === currentUserId,
    createdAt: row.createdAt.toISOString()
  };
}

export async function listBookingMessages(bookingId: string, party: ChatParty, userId: string, vendorId?: string) {
  const booking = await loadPaidBookingChat(bookingId, party, userId, vendorId);
  const rows = await prisma.bookingMessage.findMany({
    where: { bookingId: booking.id },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, senderId: true, body: true, createdAt: true }
  });
  return { booking, messages: rows.map((row) => mapChatMessage(row, userId)) };
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
  const recipientId = party === "customer" ? booking.vendor.ownerId : booking.customerId;
  const from = party === "customer" ? booking.customer.name : booking.vendor.businessName;
  await prisma.notification.create({
    data: {
      userId: recipientId,
      title: `Message · ${from}`,
      body: body.slice(0, 180),
      actionUrl: party === "customer" ? "/vendor/bookings" : `/account/bookings/${booking.id}`
    }
  });
  return { booking, message: mapChatMessage(message, userId) };
}
