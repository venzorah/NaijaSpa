import { prisma } from "./db";
import { bookingUnlocksVendorContact } from "./commercial";
import { isChatImageLive } from "./chat-images";

export type ChatThread = {
  bookingId: string;
  peerName: string;
  customerName: string;
  vendorName: string;
  serviceName: string;
  preview: string;
  lastAt: string | null;
  unlocked: boolean;
};

export function chatPreview(body: string, hasLiveImage: boolean) {
  const text = body.trim();
  if (text) return text.slice(0, 120);
  if (hasLiveImage) return "Photo";
  return "No messages yet";
}

function paymentOk(payments: Array<{ status: string }>) {
  return payments.some((p) => p.status === "success");
}

function mapThread(
  row: {
    id: string;
    status: string;
    payments: Array<{ status: string }>;
    customer: { name: string };
    vendor: { businessName: string };
    service: { name: string };
    messages: Array<{ body: string; createdAt: Date; imageExpiresAt: Date | null }>;
  },
  peer: "customer" | "vendor"
): ChatThread {
  const last = row.messages[0];
  const hasLiveImage = Boolean(last && isChatImageLive(last.imageExpiresAt));
  return {
    bookingId: row.id,
    peerName: peer === "customer" ? row.vendor.businessName : row.customer.name,
    customerName: row.customer.name,
    vendorName: row.vendor.businessName,
    serviceName: row.service.name,
    preview: last ? chatPreview(last.body, hasLiveImage) : "No messages yet",
    lastAt: last?.createdAt.toISOString() ?? null,
    unlocked: bookingUnlocksVendorContact(row.status, paymentOk(row.payments))
  };
}

const threadSelect = {
  id: true,
  status: true,
  payments: { select: { status: true } },
  customer: { select: { name: true } },
  vendor: { select: { businessName: true } },
  service: { select: { name: true } },
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { body: true, createdAt: true, imageExpiresAt: true }
  }
};

export async function listCustomerChatThreads(customerId: string): Promise<ChatThread[]> {
  const rows = await prisma.booking.findMany({
    where: {
      customerId,
      payments: { some: { status: "success" } },
      status: { in: ["confirmed", "in_progress", "completed"] }
    },
    select: threadSelect,
    orderBy: { startsAt: "desc" },
    take: 80
  });
  return rows.map((row) => mapThread(row, "customer"));
}

export async function listVendorChatThreads(vendorId: string): Promise<ChatThread[]> {
  const rows = await prisma.booking.findMany({
    where: {
      vendorId,
      payments: { some: { status: "success" } },
      status: { in: ["confirmed", "in_progress", "completed"] }
    },
    select: threadSelect,
    orderBy: { startsAt: "desc" },
    take: 80
  });
  return rows.map((row) => mapThread(row, "vendor"));
}

export async function listAdminChatThreads(query = ""): Promise<ChatThread[]> {
  const q = query.trim();
  const rows = await prisma.booking.findMany({
    where: {
      messages: { some: {} },
      ...(q
        ? {
            OR: [
              { customer: { name: { contains: q, mode: "insensitive" } } },
              { vendor: { businessName: { contains: q, mode: "insensitive" } } },
              { service: { name: { contains: q, mode: "insensitive" } } },
              { id: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    select: threadSelect,
    orderBy: { startsAt: "desc" },
    take: 120
  });
  return rows
    .map((row) => mapThread(row, "customer"))
    .sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || ""));
}
