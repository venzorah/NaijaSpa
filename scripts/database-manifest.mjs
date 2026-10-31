import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
try {
  const result = await db.$transaction(async (tx) => {
  await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
  const tables = await tx.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  const result = [];
  for (const { tablename } of tables) {
    const identifier = `"public"."${tablename.replaceAll('"', '""')}"`;
    const [row] = await tx.$queryRawUnsafe(`SELECT count(*)::int AS count, md5(coalesce(string_agg(md5(row_to_json(t)::text), '' ORDER BY md5(row_to_json(t)::text)), '')) AS digest FROM ${identifier} t`);
    result.push({ table: tablename, ...row });
  }
  return result;
  }, { timeout: 60000 });
  await writeFile(process.argv[2] || ".integration-tests/database-manifest.json", JSON.stringify(result, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ tables: result.length, totalRows: result.reduce((n, row) => n + row.count, 0), rowDataPrinted: false }));
} finally { await db.$disconnect(); }
