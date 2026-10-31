import fs from "node:fs";
import { execFileSync } from "node:child_process";
if (process.getuid?.() !== 0) throw new Error("Run as root on the VPS");
const target = "/srv/naijaspa/releases/20261031-categories-v2";
const current = "/srv/naijaspa/current";
if (!fs.lstatSync(current).isSymbolicLink()) throw new Error("Current release must be a symlink");
const previous = fs.realpathSync(current);
if (previous === target) throw new Error("Category release is already active");
if (!fs.existsSync(`${target}/.category-release-verified`)) throw new Error("Build verification is missing");
const results = fs.readFileSync(`${target}/.category-browser-results.jsonl`, "utf8").trim().split("\n").map((line) => JSON.parse(line));
if (!results.some((row) => row.stage === "complete" && row.ok)) throw new Error("Browser verification is incomplete");
for (const width of [1366, 390]) for (const check of ["category-form-cancel-create-select-and-activate", "treatment-category-selection-and-save-error-recovery"]) {
  if (!results.some((row) => row.width === width && row.check === check && row.ok)) throw new Error("A required browser check is missing");
}
async function healthy(url) {
  for (let i = 0; i < 10; i++) {
    try { const response = await fetch(url, { signal: AbortSignal.timeout(5000) }); if (response.status === 200) { await response.arrayBuffer(); return; } } catch { /* Retry during app startup. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Health check failed for ${url}`);
}
function pointTo(path) {
  const temporary = `/srv/naijaspa/current-next-${process.pid}`;
  fs.symlinkSync(path, temporary);
  fs.renameSync(temporary, current);
}
await healthy("https://padicheck.com/");
try {
  pointTo(target);
  execFileSync("systemctl", ["restart", "naijaspa-web"]);
  await healthy("http://127.0.0.1:3100/explore");
  await healthy("https://naijaspa.com/explore");
  await healthy("https://padicheck.com/");
} catch (error) {
  pointTo(previous);
  execFileSync("systemctl", ["restart", "naijaspa-web"]);
  console.error("Previous NaijaSpa release restored");
  throw error;
}
try { execFileSync("systemctl", ["stop", "naijaspa-categories-preview"]); } catch { /* A private preview may already be stopped. */ }
console.log(JSON.stringify({ deployed: true, release: target, databaseReplaced: false, padicheckHealthy: true }));
