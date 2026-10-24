# NaijaSpa operations

Launch blockers, go-live checklist, and what is already built: **[NAIJASPA-LAUNCH-GUIDE.md](./NAIJASPA-LAUNCH-GUIDE.md)** (download or print to PDF).

NaijaSpa uses **PostgreSQL** for all persistent data (users, vendors, bookings, payments).

## Local run

```bash
docker compose up -d postgres
npm install --ignore-scripts
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm test
npm run dev
```

`DATABASE_URL` in `.env`:

```
postgresql://naijaspa:naijaspa@localhost:5432/naijaspa
```

If Docker is not available, install PostgreSQL 14+ locally and set both `DATABASE_URL` and `DIRECT_URL` in `.env`.

Demo password for seeded users: `NaijaSpa!dev`

Logins (Postgres must be running and seeded):

- Customer: `/login` — customer@naijaspa.com
- Vendor: `/login/vendor` — paid.vendor@naijaspa.com or free.vendor@naijaspa.com
- Admin: `/login/admin` — super.admin@naijaspa.com

## Production (Vercel app + Supabase Postgres)

Step-by-step: **[SUPABASE.md](./SUPABASE.md)**. Use Supabase as **hosted Postgres** with Prisma. Do not enable Supabase Auth.

Until `DATABASE_URL` is a working `postgresql://` URL, public pages show **bundled demo listings**.

Do not use SQLite in production. Do not seed production with `prisma/seed.ts`. Gallery uploads must not rely on Vercel disk.

## Environment

See `.env.example`. Never commit real keys.

| Variable | Required for |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler (Vercel). Required for live catalog, auth, bookings. |
| `DIRECT_URL` | Supabase session/direct URI for `prisma migrate`. Locally, same as `DATABASE_URL`. |
| `USE_DEMO_LISTINGS` | Optional. `true` forces demo; `false` forces Prisma. |
| `AUTH_SECRET` | Session JWT |
| `PAYSTACK_SECRET_KEY` | Live/test payments. Without it, checkout records `initialized` payments and will **not** confirm bookings. |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack Inline popup. Redirect checkout still works with only the secret key. |
| `PAYSTACK_WEBHOOK_SECRET` | Optional HMAC override. If empty, HMAC uses `PAYSTACK_SECRET_KEY`. |
| `OPENAI_API_KEY` | LLM parse for Ask NaijaSpa AI. Local parser + database search always run as fallback. |
| `VAPID_*` | Web push (optional) |

## Commercial rules

- Free plan ₦0, 10% commission on service **base** price.
- Paid weekly / monthly / six-month: 0% commission while active. **Prices start at ₦0 in seed** until an authorised admin sets them under Admin → Commercial.
- Spa/Office surcharge default ₦0; Hotel/Home ₦10,000. Configurable. Recipient default: vendor.
- Home-feed rail lengths (featured, VIP/premium, promo, nearby) default to 8 each, clamped 1–24, under Admin → Commercial.
- Historical booking snapshots are never recalculated.

## Payments

Paystack only (NGN, kobo). Server `transaction/initialize` → Inline `resumeTransaction(access_code)` with hosted checkout fallback → `/checkout/verify` (Paystack `verify`) and `POST /api/payments/webhook` (`charge.success`, HMAC SHA512). Bookings confirm only after amount and currency match. No card PAN storage. No escrow.

In the Paystack dashboard set the webhook to `https://naijaspa.com/api/payments/webhook` and enable `charge.success`. Callback URL is generated per transaction (`/checkout/verify?reference=`).

## Backup

Use Supabase dashboard backups (or `pg_dump` with `DIRECT_URL`). Store Vercel secrets separately from dumps.

## Magic Patterns

Customer: https://www.magicpatterns.com/c/xoufzn4x6kfo2zduxtkuls
Vendor: https://www.magicpatterns.com/c/qhzpwknxqyn7b2p8qxepnr
Admin: https://www.magicpatterns.com/c/rgukhlugqwjarr9t1qf8be
