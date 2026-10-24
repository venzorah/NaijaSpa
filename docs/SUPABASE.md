# NaijaSpa — Supabase PostgreSQL

Production path: **Vercel** (Next.js pages + API) + **Supabase** (Postgres only).

Do **not** switch this app to Supabase Auth, Realtime, or RLS for the product. Login, roles, Google, and Paystack already run in Next.js. Use the dashboard as a hosted database.

---

## 1. Create the project

1. [supabase.com](https://supabase.com) → New project (region closest to West Africa if available, otherwise EU).
2. Save the database password. You cannot see it again.
3. Wait until the project is healthy.

---

## 2. Copy Prisma URLs

In the project: **Connect** → **ORMs** → **Prisma**.

You need two strings:

| Env var | Which URI | Why |
|---|---|---|
| `DATABASE_URL` | **Transaction pooler** (port **6543**) | Vercel serverless. Add `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | **Session pooler** or **direct** (port **5432**) | `prisma migrate deploy` |

Example shape (yours will differ):

```
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
```

URL-encode special characters in the password (`@` → `%40`). Never commit these.

If the **direct** host (`db.xxxx.supabase.co`) fails from your PC with a network error, use the session pooler on port 5432 as `DIRECT_URL` (IPv4). Keep `sslmode=require` if the dashboard includes it.

---

## 3. Local `.env` vs Vercel

**Local Docker** (unchanged):

```
DATABASE_URL="postgresql://naijaspa:naijaspa@localhost:5432/naijaspa"
DIRECT_URL="postgresql://naijaspa:naijaspa@localhost:5432/naijaspa"
```

**Vercel** → Settings → Environment Variables (Production, and Preview if you want preview logins):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Transaction pooler |
| `DIRECT_URL` | Session / direct |
| `AUTH_SECRET` | Long random string |
| `APP_URL` | `https://naijaspa.com` |
| `PAYSTACK_SECRET_KEY` | Test first, live later |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Matching public key |
| `USE_DEMO_LISTINGS` | Leave **unset** |

Redeploy after saving. Do not put the `anon` or `service_role` keys in the browser. Prisma uses the Postgres URI on the server only.

---

## 4. Apply the schema (from your PC)

Use the **Supabase** URLs, not Docker:

```powershell
$env:DATABASE_URL="postgresql://…:6543/postgres?pgbouncer=true&connection_limit=1"
$env:DIRECT_URL="postgresql://…:5432/postgres"
npx prisma migrate deploy
```

Public pages stop using the bundled demo catalog once Vercel has a working `postgresql://` `DATABASE_URL`.

**Do not** run `npx tsx prisma/seed.ts` on production. That seed includes `NaijaSpa!dev`. Create a real admin after migrate.

---

## 5. Check it worked

```powershell
npx prisma migrate status
```

Open `https://naijaspa.com/login`. If you still see Osun / Olive / Maitama Hands and cannot log in, Vercel still has no live database URL (or `USE_DEMO_LISTINGS=true`).

Paystack webhook stays on the **app**:

`https://naijaspa.com/api/payments/webhook`

---

## 6. Backups

Supabase Pro: turn on **daily backups** in the dashboard.  
Free: take a manual dump before you go live:

Project → Database → Backups, or `pg_dump` with `DIRECT_URL`.

---

## 7. What we are not using yet

| Supabase product | Status |
|---|---|
| Postgres | **Yes — production database** |
| Auth | No — keep NaijaSpa JWT / Google |
| Row Level Security | No — Prisma uses the database user |
| Realtime | No |
| Storage | Not wired. Gallery files still cannot live on Vercel disk; add Storage or S3 before vendors upload |

---

## 8. Do not edit tables in the SQL editor

Prisma migrations own the schema. Changing columns in the dashboard will break the next `migrate deploy`.
