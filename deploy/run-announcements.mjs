// Environment variables are supplied by the systemd service, never CLI arguments.
const secret = process.env.CRON_SECRET?.trim() || process.env.INTERNAL_JOB_SECRET?.trim();
if (!secret) throw new Error('An announcement job secret must be configured.');

const response = await fetch('http://127.0.0.1:3100/api/jobs/announcements', {
  method: 'POST',
  headers: { authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(240_000)
});
if (!response.ok) throw new Error(`Announcement worker returned HTTP ${response.status}`);
const result = await response.json();
console.log(JSON.stringify({ processed: result.processed }));
