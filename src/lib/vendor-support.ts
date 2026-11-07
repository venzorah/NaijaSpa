import { prisma } from "@/lib/db";
export const vendorTicketSelect = {
    id: true, subject: true, status: true, createdAt: true, updatedAt: true,
    messages: { where: { internal: false }, orderBy: { createdAt: "asc" as const }, select: { id: true, authorId: true, body: true, createdAt: true } }
} as const;
export async function replyToVendorTicket(ticketId: string, authorId: string, body: string) {
    return prisma.$transaction(async (tx) => {
        const ticket = await tx.supportTicket.findFirst({ where: { id: ticketId, authorId }, select: { id: true, status: true } });
        if (!ticket)
            throw Object.assign(new Error("Ticket not found"), { status: 404 });
        if (["closed", "resolved"].includes(ticket.status))
            throw Object.assign(new Error("This ticket is closed. Please open a new ticket."), { status: 409 });
        return tx.supportTicket.update({ where: { id: ticketId }, data: { status: "open", messages: { create: { authorId, body, internal: false } } }, select: vendorTicketSelect });
    });
}
