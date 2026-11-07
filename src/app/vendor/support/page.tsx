import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { vendorTicketSelect } from "@/lib/vendor-support";
import { VendorSupportConsole } from "@/components/vendor/support-console";
export default async function Page() { const user = await requireVendor(); const tickets = await prisma.supportTicket.findMany({ where: { authorId: user.id }, select: vendorTicketSelect, orderBy: { updatedAt: 'desc' } }); return <VendorSupportConsole tickets={tickets.map(t => ({ ...t, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(), messages: t.messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString(), own: m.authorId === user.id })) }))}/>; }
