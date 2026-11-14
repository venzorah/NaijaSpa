import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CustomersConsole } from "@/components/admin/customers-console";

export default async function UsersPage() {
  const { editable } = await requireAdminScreen("users");
  const users = await prisma.user.findMany({
    where: { role: "customer", status: { not: "deleted" } },
    take: 200,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      deletionRequestedAt: true,
      customerProfile: { select: { city: true } },
      tickets: { select: { id: true, subject: true, status: true, createdAt: true }, take: 8, orderBy: { createdAt: "desc" } }
    }
  });
  const spendRows = users.length
    ? await prisma.booking.groupBy({
        by: ["customerId"],
        where: { customerId: { in: users.map((u) => u.id) } },
        _sum: { customerTotalKobo: true },
        _count: true,
        _max: { createdAt: true }
      })
    : [];
  const spendByCustomer = new Map(spendRows.map((row) => [row.customerId, row]));
  const rows = users.map((u) => {
    const stats = spendByCustomer.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      status: u.status,
      city: u.customerProfile?.city ?? "",
      joined: u.createdAt.toLocaleDateString("en-NG"),
      lastActive: (stats?._max.createdAt ?? u.createdAt).toLocaleDateString("en-NG"),
      bookings: stats?._count ?? 0,
      spend: stats?._sum.customerTotalKobo ?? 0,
      deletionRequested: u.deletionRequestedAt ? u.deletionRequestedAt.toLocaleDateString("en-NG") : null,
      tickets: u.tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        createdAt: t.createdAt.toLocaleDateString("en-NG")
      }))
    };
  });
  return (
    <div>
      <AdminPageHeader screen="users" />
      <CustomersConsole rows={rows} editable={editable} />
    </div>
  );
}
