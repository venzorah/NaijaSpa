import fs from "node:fs";
import { execFileSync } from "node:child_process";
if (process.getuid?.() !== 0) throw new Error("Run as root on the VPS");
const target = "/srv/naijaspa/releases/20261102-home-admin-v1";
const current = "/srv/naijaspa/current";
if (!fs.lstatSync(current).isSymbolicLink()) throw new Error("Current release must be a symlink");
const previous = fs.realpathSync(current);
if (previous === target) throw new Error("This release is already active");
if (!fs.existsSync(`${target}/.home-admin-build-verified`)) throw new Error("Build verification is missing");
const results = fs.readFileSync(`${target}/.home-admin-browser-results.jsonl`, "utf8").trim().split("\n").map(line => JSON.parse(line));
if (!results.some(row => row.stage === "complete" && row.ok && row.fixturesRemoved)) throw new Error("Browser verification or cleanup is incomplete");
if (!results.some(row => row.check === "real-crud-inactive-fixtures-image-r2-and-access-control" && row.ok)) throw new Error("API verification is missing");
for (const width of [1366, 390]) if (!results.some(row => row.check === "admin-controls-and-live-homepage" && row.width === width && row.ok)) throw new Error("A required viewport check is missing");
async function healthy(url) {
  for (let i = 0; i < 12; i++) {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(10000) }); if (response.status === 200) { await response.arrayBuffer(); return; } } catch { /* App startup can take a moment. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Health check failed: ${url}`);
}
function pointTo(path) {
  const temporary = `/srv/naijaspa/current-next-${process.pid}`;
  fs.symlinkSync(path, temporary); fs.renameSync(temporary, current);
}
await healthy("https://padicheck.com/");
try {
  pointTo(target); execFileSync("systemctl", ["restart", "naijaspa-web"]);
  await healthy("http://127.0.0.1:3100/in/lagos");
  await healthy("https://naijaspa.com/in/lagos");
  await healthy("https://naijaspa.com/explore");
  await healthy("https://padicheck.com/");
} catch (error) {
  pointTo(previous); execFileSync("systemctl", ["restart", "naijaspa-web"]);
  console.error("Previous NaijaSpa release restored"); throw error;
}
try { execFileSync("systemctl", ["stop", "naijaspa-home-preview"]); } catch { /* Preview may already be stopped. */ }
console.log(JSON.stringify({ deployed: true, release: target, previousRelease: previous, databaseReplaced: false, padicheckHealthy: true }));
