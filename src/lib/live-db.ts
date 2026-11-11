/**
 * Marketplace records come from PostgreSQL when DATABASE_URL is a postgres connection.
 * Until that URL is set, public listings use the bundled demo catalog.
 *
 * USE_DEMO_LISTINGS=true  — always demo
 * USE_DEMO_LISTINGS=false — always hit Prisma (requires a reachable DATABASE_URL)
 */
export function isLiveDatabase(): boolean {
  if (process.env.USE_DEMO_LISTINGS === "true") return false;
  if (process.env.USE_DEMO_LISTINGS === "false") return true;
  const url = process.env.DATABASE_URL || "";
  return /^(postgres(ql)?):\/\//i.test(url);
}

export function usingDemoListings(): boolean {
  return !isLiveDatabase();
}

/** Next.js executes pages while collecting data; skip live Prisma then so `next build` does not need Postgres. */
export function duringNextBuild() {
  return process.env.NEXT_PHASE === "phase-production-build";
}
