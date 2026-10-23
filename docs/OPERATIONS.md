# NaijaSpa operations

## Local run

```bash
npm install --ignore-scripts
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm test
npm run build
npm run dev
```

Demo password for seeded users: `NaijaSpa!dev`

- Customer: customer@naijaspa.ng
- Paid vendor: paid.vendor@naijaspa.ng
- Free vendor: free.vendor@naijaspa.ng
- Super admin: super.admin@naijaspa.ng

## Environment

See `.env.example`. Never commit real keys.

| Variable | Required for |
|---|---|
| `DATABASE_URL` | SQLite file by default. Use `postgresql://` in production and change `provider` in `prisma/schema.prisma`. |
| `AUTH_SECRET` | Session JWT |
| `PAYSTACK_SECRET_KEY` | Live/sandbox payments. Without it, checkout records `initialized` payments and will **not** confirm bookings. |
| `PAYSTACK_WEBHOOK_SECRET` | Webhook HMAC |
| `OPENAI_API_KEY` | LLM parse for Ask NaijaSpa AI. Local parser + database search always run as fallback. |
| `VAPID_*` | Web push (optional) |

## Commercial rules

- Free plan ₦0, 10% commission on service **base** price.
- Paid weekly / monthly / six-month: 0% commission while active. **Prices start at ₦0 in seed** until an authorised admin sets them under Admin → Commercial.
- Spa/Office surcharge default ₦0; Hotel/Home ₦10,000. Configurable. Recipient default: vendor.
- Historical booking snapshots are never recalculated.

## Payments

Paystack initialize + verify + signed webhook. No escrow. No card PAN storage.

## Backup

Copy `prisma/dev.db` (SQLite) or run `pg_dump` on PostgreSQL. Store encryption keys and `.env` separately.

## Magic Patterns

Customer: https://www.magicpatterns.com/c/xoufzn4x6kfo2zduxtkuls
Vendor: https://www.magicpatterns.com/c/qhzpwknxqyn7b2p8qxepnr
Admin: https://www.magicpatterns.com/c/rgukhlugqwjarr9t1qf8be
