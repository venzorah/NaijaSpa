# NaijaSpa — VPS PostgreSQL (not the production path)

**Production is Supabase Postgres.** See **[SUPABASE.md](./SUPABASE.md)**.

This file stays as an optional alternative if you later self-host Postgres.

The Next.js app stays on **Vercel**. This VPS would only run **PostgreSQL**.

You need: an Ubuntu 22.04/24.04 VPS (2 GB RAM minimum), SSH as root, and the public IP.

---

## 1. On the VPS (once)

Copy `scripts/vps-setup-postgres.sh` from this repo onto the VPS, then:

```bash
chmod +x vps-setup-postgres.sh
NAIJASPA_DB_PASSWORD='paste-a-long-random-password' ./vps-setup-postgres.sh
```

The script installs PostgreSQL 16, creates database `naijaspa` / user `naijaspa`, turns on SSL, and opens UFW for SSH plus 5432.

Save the connection string it prints. Never commit it.

---

## 2. Connection string (Vercel)

```
postgresql://naijaspa:PASSWORD@VPS_IP:5432/naijaspa?sslmode=require&connection_limit=5
```

On the Vercel project → Settings → Environment Variables (Production **and** Preview if you want preview logins):

| Variable | Value |
|---|---|
| `DATABASE_URL` | the string above |
| `AUTH_SECRET` | long random string (not the example in `.env.example`) |
| `APP_URL` | `https://naijaspa.com` |
| `PAYSTACK_SECRET_KEY` | test key first, live later |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | matching public key |
| `USE_DEMO_LISTINGS` | leave **unset** |

Redeploy after saving.

Vercel does not give a stable outbound IP on typical plans, so port **5432 must stay reachable** with SSL + a strong password. Do not leave `naijaspa` / `naijaspa` as the password. Do not skip `sslmode=require`.

---

## 3. Apply the schema (from your PC)

In the project folder, with the **production** URL (not the local Docker one):

```powershell
$env:DATABASE_URL="postgresql://naijaspa:PASSWORD@VPS_IP:5432/naijaspa?sslmode=require"
npx prisma migrate deploy
```

That creates the real tables. Public pages stop using the bundled demo catalog once `DATABASE_URL` on Vercel is a working `postgresql://` URL.

**Do not** run `npx tsx prisma/seed.ts` on production. That seed includes `NaijaSpa!dev` demo logins. Create a real admin from `/register` or invite vendors from `/admin` after you have one admin row.

If you need a first admin on an empty database, seed **once on staging only**, then change that password immediately — or insert one user yourself.

---

## 4. Check it worked

```powershell
npx prisma migrate status
```

Then open `https://naijaspa.com/login`. If listings still look like Osun / Olive / Maitama Hands with no login, Vercel still has no live `DATABASE_URL` (or `USE_DEMO_LISTINGS=true`).

Paystack webhook stays on the **app**, not the VPS:

`https://naijaspa.com/api/payments/webhook`

---

## 5. Backups (on the VPS)

```bash
mkdir -p /var/backups/naijaspa
crontab -e
```

Add:

```
0 2 * * * pg_dump -U naijaspa -d naijaspa -Fc -f /var/backups/naijaspa/naijaspa-$(date +\%F).dump
```

Keep dumps off the VPS as well (download weekly). `.env` / Vercel secrets stay out of the dump.

Restore:

```bash
pg_restore -U naijaspa -d naijaspa --clean --if-exists /var/backups/naijaspa/FILE.dump
```

---

## 6. What this VPS does **not** do

| Item | Where it lives |
|---|---|
| Website, `/api`, Paystack webhook | Vercel |
| Customer / vendor / admin UI | Vercel |
| Gallery photo files | Not Postgres. Vercel disk is wiped on deploy — add object storage before vendors upload | 
| Domain `naijaspa.com` | DNS → Vercel |

---

## 7. Firewall and hardening (recommended)

After the script:

```bash
ufw status
fail2ban-client status sshd
```

Optional: if you later get a static IP for a jump host, lock 5432 to that IP only:

```bash
ufw delete allow 5432/tcp
ufw allow from YOUR.OFFICE.IP to any port 5432 proto tcp
```

That will **break Vercel** unless Vercel can still reach 5432. For this architecture, leave 5432 open to the internet **with SSL + scram + a long password**, or move the whole app onto the VPS.

---

## 8. Local Docker vs VPS

| | Local | Production |
|---|---|---|
| Host | `docker compose up -d postgres` | This VPS |
| URL | `postgresql://naijaspa:naijaspa@localhost:5432/naijaspa` | `postgresql://naijaspa:…@VPS_IP:5432/naijaspa?sslmode=require` |
| Seed | Yes (`NaijaSpa!dev`) | No |
