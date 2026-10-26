import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CustomersConsole } from "@/components/admin/customers-console";

export default async function UsersPage() {
  const { editable } = await requireAdminScreen("users");
  const users = await prisma.user.findMany({
    where: { role: "customer" },
    take: 200,
    orderBy: { createdAt: "desc" },
    include: {
      customerProfile: true,
      bookings: { select: { customerTotalKobo: true, status: true, createdAt: true } },
      tickets: { select: { id: true, subject: true, status: true, createdAt: true }, take: 8, orderBy: { createdAt: "desc" } }
    }
  });
  const rows = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    status: u.status,
    city: u.customerProfile?.city ?? "",
    joined: u.createdAt.toLocaleDateString("en-NG"),
    lastActive: (u.bookings[0]?.createdAt ?? u.createdAt).toLocaleDateString("en-NG"),
    bookings: u.bookings.length,
    spend: u.bookings.reduce((s, b) => s + b.customerTotalKobo, 0),
    deletionRequested: u.deletionRequestedAt ? u.deletionRequestedAt.toLocaleDateString("en-NG") : null,
    tickets: u.tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      createdAt: t.createdAt.toLocaleDateString("en-NG")
    }))
  }));
  return (
    <div>
      <AdminPageHeader screen="users" />
      <CustomersConsole rows={rows} editable={editable} />
    </div>
  );
}
