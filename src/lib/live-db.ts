/**
 * Marketplace records come from PostgreSQL when DATABASE_URL is a postgres connection.
 * On Vercel, until that URL is set, public listings use the bundled demo catalog.
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
