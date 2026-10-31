# OTP and shared request protection

Implemented 30 October 2026. The existing page layout and styling are preserved.

## Password reset

- Six-digit codes use cryptographic randomness and expire after 15 minutes.
- PostgreSQL stores an HMAC digest bound to the account, challenge ID and password-reset purpose. The original code is not stored in the challenge table.
- Five wrong guesses retire a challenge. The attempt budget is persisted independently of Redis.
- Resends have a persisted 60-second cooldown. Issuance supersedes any prior unused challenge atomically, and a database partial unique index permits only one unused challenge per account.
- Consumption and password change share a transaction and an account row lock. The conditional claim checks expiry and attempt count again after password hashing; exactly one caller can consume a code.
- Successful reset revokes existing sessions. Password login takes the same account lock before persisting a session and verifies that the hash used for credential verification is still current, preventing a stale concurrent login from recreating a session after reset.
- Whitespace in a six-digit code is accepted; extra digits and non-digit characters are rejected. New reset passwords must be 10 or more characters and no more than 72 UTF-8 bytes to avoid bcrypt truncation.

Migration `20261030180000_reset_challenges` retires legacy unused codes because their digest format was unkeyed. Deploy the migration and matching application together; users must request fresh codes. Preserve the custom one-active-challenge index and attempt-budget check in future migrations.

## Configuration

`node scripts/setup-credentials.mjs --prepare-auth` generates `OTP_HASH_SECRET` only if absent/empty and prepares the Redis entries. It never prints secret values or overwrites existing nonempty credentials.

```dotenv
OTP_HASH_SECRET="persistent 32-byte base64url secret"
REDIS_URL="redis://127.0.0.1:6379"
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

The generated OTP secret is already saved locally. Set the same stable secret on every deployment instance; keep it outside source control. Rotating it invalidates outstanding codes. Existing Google sign-in credentials are separate.

Local Redis is now configured through `REDIS_URL`. The existing Redis server in Ubuntu WSL answered PING, and the application's TCP counter/rejection check passed. Upstash is optional. To start or check the WSL instance:

```powershell
wsl.exe -d Ubuntu -- sudo service redis-server start
wsl.exe -d Ubuntu -- redis-cli ping
npx.cmd tsx scripts/check-redis.ts
```

The app runs on Windows and connects through `127.0.0.1:6379`. Its Node Redis client is reused between requests, has bounded connection/command timeouts, and does not queue requests indefinitely while disconnected. A configured connection failure returns 503 rather than bypassing protection. Use `rediss://` for TLS connections when hosting Redis remotely. Redis credentials can be included in the URI; keep that value private.

If Docker is available, `docker compose up -d redis` provides an alternative local instance with a named volume, append-only persistence, a loopback-only port, and `noeviction`. Use one Redis instance for port 6379. The current machine uses the already-running WSL instance.

For deployment, Redis must run on the app's host or a securely reachable server. A deployed Vercel function's `127.0.0.1` addresses that function's environment, not this development computer. Set a deployment-specific reachable URI; keep Redis off the public internet without proper authentication, network restrictions and transport protection.

`REDIS_URL` takes precedence over optional Upstash REST settings. To choose the optional REST integration instead, leave `REDIS_URL` empty and:

1. Sign in at https://console.upstash.com/ and select **Redis → Create Database**.
2. Name it `naijaspa`, choose a region near the app's deployment region, and review/select a plan.
3. Copy the database's **REST URL** and regular **REST Token** into the corresponding `.env` entries. The read-only token cannot update rate counters.
4. Restart the app and run `npx tsx scripts/check-redis.ts`. It increments one randomly named test counter, verifies HTTP-style rate rejection, and deletes only its own key. It never scans existing keys or prints credentials.

Sources: [Upstash setup](https://upstash.com/docs/redis/overall/getstarted), [REST API](https://upstash.com/docs/redis/features/restapi).

## Rate limit behavior

All existing rate-limited handlers await the shared limiter. It uses one Redis Lua operation to increment a counter and initialize its expiry atomically; keys hash route/account identifiers so raw email addresses are not embedded in Redis keys. No queue library is needed for this operation.

| Route | Limits |
|---|---|
| Forgot password | 12 requests/IP/15 minutes; 3 requests/account/15 minutes; database resend cooldown 60 seconds |
| Reset password | 30 requests/IP/15 minutes; 15 requests/account/15 minutes; database budget five wrong guesses per challenge |
| Password login | 10 requests/IP/minute; 10 requests/account/15 minutes |
| Other existing protected routes | Their existing route-specific limits, now shared when Redis is configured |

Blocked bursts return HTTP 429 with `Retry-After`. Configured Redis errors return a sanitized HTTP 503 and do not fall back to independent counters. Production also returns HTTP 503 when Redis is missing. All three connection fields empty in development/test enables a bounded, expiring local Map for convenience; this is not distributed protection. Use separate connection settings for development, preview and production.

Deploy behind a trusted proxy that overwrites forwarded client-address headers and prevent bypassing that proxy. The app selects and validates the first forwarded address; a missing or invalid address uses an `unknown` bucket. It cannot independently authenticate an arbitrary forwarding header received from an untrusted direct client.

## Verification and remaining work

The automated suite and isolated local OTP test cover keyed digests, attempt persistence, cooldown/supersession, concurrency, expiry, session revocation, stale-login prevention, and normal password login. `npx tsx scripts/test-otp-security.ts` uses temporary local accounts, removes its fixtures, and sends no email. Standard Redis and REST error handling, connection reuse, recovery and counter behavior are covered by tests. The real Redis TCP atomic counter/rejection test passed against the WSL server. The complete automated suite passed 208 tests.

This is the first architecture-hardening stage. OTP mail currently still waits for SMTP inside the forgot-password request. Durable mail/outbox delivery, retries, tighter account-existence timing behavior, and queue/worker deployment remain follow-up work. The old notification claiming mail was sent has been removed; the response is generic and does not claim Inbox delivery. SPF correction remains with the hosting/DNS administrator. Signup email verification is a separate flow and has not been introduced here.
