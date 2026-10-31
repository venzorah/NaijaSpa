import { readFile } from "node:fs/promises";
const before = JSON.parse(await readFile(process.argv[2], "utf8"));
const after = JSON.parse(await readFile(process.argv[3], "utf8"));
const index = new Map(after.map((row) => [row.table, row]));
const differences = before.filter((row) => row.count !== index.get(row.table)?.count || row.digest !== index.get(row.table)?.digest)
  .map((row) => ({ table: row.table, sourceCount: row.count, targetCount: index.get(row.table)?.count, digestMatches: row.digest === index.get(row.table)?.digest }));
console.log(JSON.stringify({ sourceTables: before.length, targetTables: after.length, differences }));
if (differences.length || before.length !== after.length) process.exitCode = 1;
