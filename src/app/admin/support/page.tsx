import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { SupportConsole } from "@/components/admin/support-console";

export default async function Page() {
  const { editable } = await requireAdminScreen("support");
  const [tickets, reviews] = await Promise.all([
    prisma.supportTicket.findMany({ include: { author: true }, orderBy: { createdAt: "desc" } }),
    prisma.review.findMany({ include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 80 })
  ]);
  return (
    <div>
      <AdminPageHeader screen="support" />
      <SupportConsole
        editable={editable}
        tickets={tickets.map((t) => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          author: t.author.name,
          email: t.author.email,
          createdAt: t.createdAt.toLocaleString("en-NG"),
          notes: t.internalNotes
        }))}
        reviews={reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          body: r.body,
          status: r.status,
          author: r.user.name
        }))}
      />
    </div>
  );
}
