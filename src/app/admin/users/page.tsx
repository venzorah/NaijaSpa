import { prisma } from "@/lib/db";

export default async function UsersPage() {
  const users = await prisma.user.findMany({ where: { role: "customer" }, take: 50 });
  return (
    <div>
      <h1 className="font-display text-3xl">Customers</h1>
      <ul className="mt-4 space-y-2 text-sm">
        {users.map((u) => (
          <li key={u.id} className="rounded-xl border border-line bg-card p-3">
            {u.name} · {u.email} · {u.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
