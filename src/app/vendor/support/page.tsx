import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VendorSupportConsole } from "@/components/vendor/support-console";

export default async function Page() {
  const user = await getSession();
  const tickets = await prisma.supportTicket.findMany({
    where: { authorId: user?.id || "" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" }
  });
  return (
    <VendorSupportConsole
      tickets={tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        createdAt: t.createdAt.toLocaleString("en-NG"),
        preview: t.messages[0]?.body ?? ""
      }))}
    />
  );
}
