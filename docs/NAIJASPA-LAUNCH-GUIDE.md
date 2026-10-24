# NaijaSpa launch guide

**Product:** NaijaSpa (naijaspa.com) — Nigeria wellness marketplace PWA  
**Code:** https://github.com/venzorah/NaijaSpa  
**Document date:** 24 October 2026  
**Audience:** founder, ops, developer doing go-live  

This is the launch document. Save or print it (VS Code / GitHub: Download, or browser Print → PDF).

Related: [OPERATIONS.md](./OPERATIONS.md) (day-to-day commands), [IMPLEMENTATION.md](../IMPLEMENTATION.md) (feature status), `.env.example` (secrets list).

---

## 1. Executive snapshot

The customer, vendor, and admin product is **built in code**. Production split: **Vercel hosts the Next.js app** (pages + API); **PostgreSQL runs on a VPS** (not Supabase). You cannot take real money until that database URL, Paystack live keys, production `APP_URL` / domain, and admin commercial prices are connected.

| Verdict | Meaning |
|---|---|
| **Not launch-ready for paying customers** until blockers in §3 are done | Demo catalog + empty Paystack keys cannot confirm live bookings |
| **Can soft-launch a marketing/PWA preview** today | Public pages work with bundled listings; no real payments |
| **Target for a real launch** | Vercel app + VPS Postgres + migrated schema + Paystack webhook + domain + legal copy + at least one real vendor |

Darkroom / 18+ is **explicitly out of scope** and must stay off the product.

---

## 2. What is already in the app

### Customer
- Installable PWA (manifest, service worker, iOS splash images, white splash on first open)
- Light default theme, optional dark
- Home: hero, categories, featured / VIP (premium) / promo / nearby rails (admin-set lengths)
- Live location: browser GPS → reverse geocode → therapists in that state/city first
- Place URLs: `/in/{state}/{city}` (ranked home), `/explore/{state}/{city}` (exact search)
- Finder: treatment, state, city, spa/hotel/home (no area/gender fields)
- Explore: photos on cards; empty city copy; carousel of other cities in the same state
- Service profile, stepped booking, Hotel/Home vendor add-ons, Paystack checkout (inline + redirect + verify + webhook)
- Account, bookings, favourites, login/register
- Ask NaijaSpa AI: grounded catalog search (LLM optional)

### Vendor
- Onboarding states, services, Hotel/Home add-on prices
- Up to **7 therapist galleries**; paid plans may add YouTube/Vimeo/https video links
- Bookings, earnings, subscriptions (plan prices set by admin)

### Admin
- Vendor invite, commercial config (commission, gallery image count/size, home-feed rail lengths, plan prices)
- Finance of **verified** payments only

### Engine
- Next.js 15 App Router, Prisma 6, PostgreSQL
- NGN amounts in **kobo**
- Free plan 10% commission on **base** price; paid plan 0% while active
- Bookings confirm only after Paystack verify **or** signed `charge.success` webhook, with amount + NGN match
- No card PAN storage

---

## 3. Must-do before a real launch (blockers)

Do these in order. Until they are done, treat the site as a **preview**.

### 3.1 VPS PostgreSQL (app stays on Vercel)
- The frontend and API deploy on **Vercel**. The database is **PostgreSQL on an Ubuntu VPS**, not Supabase.
- Install PostgreSQL 14+ on the VPS. Require SSL. Use a strong password.
- Do **not** leave port `5432` open to the world. Firewall it to Vercel egress (or a bastion / VPN).
- Set on the Vercel project:
  ```
  DATABASE_URL="postgresql://naijaspa:STRONG_PASSWORD@VPS_IP:5432/naijaspa?sslmode=require"
  ```
- From a machine that can reach the VPS, run:
  ```bash
  npx prisma generate
  npx prisma migrate deploy
  ```
- Confirm public pages are **not** still on bundled demo listings (`USE_DEMO_LISTINGS` unset or `false`).
- Local Docker default `naijaspa:naijaspa@localhost` has failed with `P1000` in this workspace — production credentials must actually authenticate.

**Migrations that must apply (in order):**
1. `20241023120000_init`
2. `20241023221500_vendor_location_addons`
3. `20261023230000_location_gender` (vendor `state`, staff `gender`)
4. `20261023233000_therapist_galleries`

### 3.2 Secrets and URLs
Set in the **Vercel** project environment (never commit):

| Variable | Why |
|---|---|
| `DATABASE_URL` | Auth, bookings, live catalog |
| `AUTH_SECRET` | Long random JWT secret (not the example string) |
| `APP_URL` | `https://naijaspa.com` (Paystack callback and cancel URLs) |
| `PAYSTACK_SECRET_KEY` | Live `sk_live_…` (test `sk_test_…` only for staging) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Matching `pk_live_…` for Inline |
| `NODE_ENV` | `production` |

Optional but recommended: `PAYSTACK_WEBHOOK_SECRET` (otherwise HMAC uses the secret key), `OPENAI_API_KEY` (AI still works with the local parser), `INTERNAL_JOB_SECRET` if you add cron later.

### 3.3 Paystack live
1. Paystack business account approved for live.
2. Dashboard → Settings → API: live keys in Vercel env.
3. Webhook: `https://naijaspa.com/api/payments/webhook`, event **`charge.success`**.
4. One **test then live** ₦100+ booking: initialize → pay → `/checkout/verify` **and** webhook both confirm the booking.
5. Confirm admin finance shows only `success` rows as collected funds.

Without keys, checkout records `initialized` payments and **does not confirm** bookings.

### 3.4 Domain and HTTPS
- Point `naijaspa.com` (and `www`) at the **Vercel** project.
- TLS is issued by Vercel.
- `APP_URL` matches the canonical host (no trailing slash).
- Replace the old marketing landing page so `/` is this app.

### 3.5 Commercial prices (admin)
Seeded paid plans start at **₦0**. Before charging vendors:
- Admin → Commercial: weekly / monthly / six-month prices.
- Confirm free commission (default 10%) and Hotel/Home add-on behaviour.
- Home-feed counts (default 8) if you want different rail lengths.

### 3.6 At least one real vendor
- Invite or register a real spa; approve; set visibility public.
- Add services with photos, state **and** city, Hotel/Home add-ons if they travel.
- Gallery photos if they use Vendor → Galleries.
- Seed `nuru` category exists in **demo** catalog; **live seed** may not include Nuru — add the category/services you sell.

### 3.7 Stop serving demo listings in production
If `DATABASE_URL` is missing, customers see sample Osun / Calm House / Olive Room / Maitama Hands. That must not ship as “live vendors”.

---

## 4. Strongly recommended before public launch

These will not crash the build, but they will hurt trust, ops, or conversions.

### 4.1 Durable file storage
Gallery uploads go to **`uploads/galleries/` on the server disk**. Vercel’s disk is **ephemeral** — files disappear on redeploy. Before vendors upload production photos, put objects on S3 / Cloudflare R2 / Vercel Blob (or serve a persistent folder from the VPS over HTTPS). `/photos/*` bundled assets are fine.

### 4.2 Email (and later SMS)
Password reset **does not send email**. It writes an in-app notification with a token (dev-only behaviour). For launch you need:
- Transactional email (Resend, SES, Postmark) for reset, booking confirmed, vendor new booking.
- Optional: SMS/WhatsApp reminders (not implemented).

### 4.3 Legal copy
CMS keys `about`, `contact`, `privacy`, `terms` exist as short placeholders. Have counsel review for:
- NDPR / Nigeria Data Protection Act
- Paystack / card handling (you never store PAN; say so)
- Cancellation / refund (engine has cancellation states; refunds are not a full ops desk)
- Vendor vs platform liability

Update via Admin CMS or seed, not only demo strings.

### 4.4 Object and error monitoring
- Sentry (or similar) for Next.js server + client.
- Uptime check on `/` and `/api/payments/webhook`.
- UFW on the VPS (Postgres port locked down).
- Vercel logs retained.

### 4.5 Backups
- Scheduled `pg_dump` of VPS Postgres. Object-storage photos have their own backup.
- Secrets **not** in the dump.
- Restore drill once.

### 4.6 QA on real phones
Must-pass on iPhone Safari + Android Chrome (and installed PWA):

- [ ] First open splash once; not on every tap
- [ ] Finder does not zoom/jump (16px inputs)
- [ ] GPS permission → city ranking or deny fallback
- [ ] Search Lagos vs empty city → empty copy + other-city carousel
- [ ] Booking stepper: location, time, totals, Continue above the tab bar
- [ ] Paystack Inline; cancel; failed pay; success; refresh verify
- [ ] Vendor gallery upload under admin size/count caps
- [ ] Free vendor cannot add video links
- [ ] Ask NaijaSpa returns only on-site listings
- [ ] Desktop still uses Nigerian `/photos` (not Unsplash)

### 4.7 Change demo passwords
Seed password `NaijaSpa!dev` is public in operations docs. Disable or rotate every seeded account on production, or do not seed demo users into production at all (preferred: seed plans/config only).

### 4.8 PWA icons
`npm run icons` uses `sharp`. Confirm `/icons/*`, apple touch icon, and splash PNGs look correct on device.

---

## 5. After launch / not required for day one

| Item | Status | Note |
|---|---|---|
| OpenAI for AI parse | Optional | Local parser + catalog search already work |
| Web push | Structure only | Needs VAPID keys + a worker to send |
| i18n EN/FR/DE/ES | Partial | Nav/install only |
| Cron / reminders | Secret placeholder | No job runner wired |
| Refunds desk | Partial | Booking states exist; no Paystack refund automation in UI |
| Admin-editable 7-gallery cap | Hard-coded | Image count/size already admin-editable |
| Category-rail item count | Not a setting | “All active categories” |
| Production object storage | Required on Vercel | See §4.1 |
| Darkroom | Will not ship | Spec exclusion |

---

## 6. Environment checklist (copy into your password manager)

```
DATABASE_URL=
AUTH_SECRET=
APP_URL=https://naijaspa.com
NODE_ENV=production
PAYSTACK_SECRET_KEY=
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=
PAYSTACK_WEBHOOK_SECRET=
OPENAI_API_KEY=          # optional
OPENAI_MODEL=gpt-4o-mini
VAPID_PUBLIC_KEY=        # optional push
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:concierge@naijaspa.com
INTERNAL_JOB_SECRET=
USE_DEMO_LISTINGS=       # leave unset in production
```

Staging should use **Paystack test keys** and a **separate** database.

---

## 7. Infrastructure sketch

```
Customer / Vendor / Admin  →  Vercel (Next.js 15 pages + API)
                           →  PostgreSQL on the VPS (not Supabase)
                           →  Paystack (initialize, verify, webhook)
                           →  Nominatim (GPS reverse geocode; rate-limited)
                           →  Optional OpenAI (query parse only)
```

Paystack never sends card numbers to NaijaSpa. Gallery files must not rely on Vercel local disk.

**Go-live commands (Vercel env already has `DATABASE_URL` pointing at the VPS):**

```bash
npx prisma generate
npx prisma migrate deploy
# optional: seed config/plans only — do not seed demo customers on production
npm test
```

Vercel build already runs `prisma generate && next build`. Migrations are **not** automatic unless you add a deploy hook.

---

## 8. Launch-week runbook

1. Provision VPS Postgres (SSL, firewalled). Not Supabase.  
2. Set Vercel env: `DATABASE_URL`, `AUTH_SECRET`, Paystack, `APP_URL=https://naijaspa.com`.  
3. Staging: migrate + Paystack **test** charge on a preview deployment.  
4. Production DB: migrate. Do **not** seed demo people if you can avoid it.  
5. Admin: plan prices, commission, gallery limits.  
6. Invite 1–3 vendors; they add services and photos (object storage).  
7. You book and pay a real ₦ amount; confirm booking status `confirmed` and vendor earning row.  
8. Point DNS at Vercel.  
9. Watch webhook 200s and Vercel errors for 24h.  
10. `pg_dump` the VPS after first real payment.

Rollback: keep the previous Vercel deployment; Paystack webhook can stay; do not rewind DB if payments already succeeded.

---

## 9. Seeded accounts (local / staging only)

Password: `NaijaSpa!dev`

| Portal | URL | Email |
|---|---|---|
| Customer | `/login` | customer@naijaspa.com |
| Vendor | `/login/vendor` | paid.vendor@naijaspa.com or free.vendor@naijaspa.com |
| Admin | `/login/admin` | super.admin@naijaspa.com |

Also seeded: ops, verify, support, finance, content, marketing, moderator, analyst.

**Do not use these passwords on production.**

---

## 10. Acceptance bar for “we launched”

You may call it launched when all of the following are true:

1. `naijaspa.com` serves this app from Vercel over HTTPS.  
2. Postgres on the VPS is live; Vercel can reach it; demo catalog is off.  
3. A stranger can register, search a city, book, pay Paystack, and see **confirmed**.  
4. The vendor sees the booking and a pending earning.  
5. Admin sees the payment as success.  
6. Privacy/terms are real documents.  
7. Backups exist.  
8. Paystack webhook is green on a live `charge.success`.

Until then, it is a **preview**.

---

## 11. How to download this file

- Founder PDF: `docs/NaijaSpa-Launch-Status.pdf` (also copy to Downloads)
- Longer notes: `docs/NAIJASPA-LAUNCH-GUIDE.md`, `docs/OPERATIONS.md`
