import { prisma } from "@/lib/db";

export default async function Page() {
  const blocks = await prisma.cmsBlock.findMany();
  return (
    <div>
      <h1 className="font-display text-3xl">CMS</h1>
      <ul className="mt-4 space-y-2">
        {blocks.map((b) => (
          <li key={b.id} className="rounded-xl border border-line bg-card p-3">
            <p className="font-semibold">{b.title}</p>
            <p className="text-sm text-ink2">{b.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
