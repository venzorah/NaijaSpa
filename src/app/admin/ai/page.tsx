import { prisma } from "@/lib/db";

export default async function Page() {
  const logs = await prisma.aiSearchLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  return (
    <div>
      <h1 className="font-display text-3xl">AI search</h1>
      <p className="text-sm text-ink2">Provider keys stay in environment variables. OPENAI_API_KEY is {process.env.OPENAI_API_KEY ? "set" : "not set — local parser in use"}.</p>
      <ul className="mt-4 space-y-2 text-sm">
        {logs.map((l) => (
          <li key={l.id} className="rounded-xl border border-line bg-card p-3">
            {l.query} · {l.resultCount} hits · fallback {String(l.usedFallback)}
          </li>
        ))}
      </ul>
    </div>
  );
}
