const secret = process.env.CRON_SECRET?.trim() || process.env.INTERNAL_JOB_SECRET?.trim();
if (!secret) throw new Error('Chat image cleanup requires a job secret.');
const response = await fetch('http://127.0.0.1:3100/api/jobs/chat-images', {
  method: 'POST',
  headers: { authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(55_000)
});
if (!response.ok) throw new Error(`Chat image cleanup returned HTTP ${response.status}`);
const result = await response.json();
if (result.ok !== true) throw new Error('Chat image cleanup did not complete.');
console.log(JSON.stringify({ ok: true }));
