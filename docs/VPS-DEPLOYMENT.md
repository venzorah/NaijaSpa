# NaijaSpa alongside PadiCheck on the VPS

NaijaSpa is deployed at `https://naijaspa.com` on `162.35.32.178`. Inspection found Ubuntu 26.04, one CPU, 3.4 GB visible RAM (the advertised 4 GB VPS), Node 22.22.1, PostgreSQL 18 and Redis. PadiCheck actually uses systemd, not PM2; PM2 is not installed. NaijaSpa uses a separate systemd service, account, PostgreSQL database/role and Nginx virtual host.

## Active deployment and migration

- Current release: `/srv/naijaspa/releases/20261031-categories-v2`; active symlink: `/srv/naijaspa/current`. The previous `/srv/naijaspa/releases/20261031-1ca29a3` release remains available for rollback. The older `/var/www/NaijaSpa` upload was preserved and is not the running release. See [CATEGORY-MANAGEMENT.md](CATEGORY-MANAGEMENT.md) for the deployed category workflow and verification.
- Configuration: `/srv/naijaspa/shared/.env`, mode 600. `APP_URL=https://naijaspa.com`, production mode, R2 uploads and Paystack **test** keys. A fresh production session-signing secret invalidates imported session tokens without deleting their records.
- Web service: `naijaspa-web.service`, enabled at boot, user/group `naijaspa`, loopback `127.0.0.1:3100`, 512 MB V8 heap and 768 MB service memory ceiling. Observed RSS/cgroup usage after staging was around 186 MB.
- Data: PostgreSQL database and owner `naijaspa`, loopback port 5432; Redis logical database 15 with the existing NaijaSpa key prefix. PadiCheck's database/user and services were not changed.
- The owner explicitly requested **all** local data. A custom-format snapshot was restored atomically. All **44 tables and 148 rows** matched counts and content hashes, with timestamps normalized to UTC. This includes sample profiles, existing personal accounts, sandbox payments, notifications and sessions. Later intentional changes secure seeded passwords and normal sign-in operations create/remove sessions; this is a point-in-time migration, not ongoing local/VPS synchronization.
- Known seeded users still using `NaijaSpa!dev` received unique generated passwords: 12 seeded accounts, including 9 privileged/admin accounts. Personal accounts were not changed. The protected handoff is `/srv/naijaspa/shared/seeded-login-credentials.json`; a local Git-ignored copy is `.integration-tests/seeded-login-credentials.json`. Do not commit or paste this file into logs. Original seeded password hashes are retained in a root-only rollback file.
- Backups: `/var/backups/naijaspa/local-import-20261031.dump` (original imported snapshot) and `initial-production-20261031.dump` (after credential hardening). Nginx backup: `/var/backups/naijaspa/nginx-before-activation.tar.gz`. Temporary source environment/password files and the SSH reverse tunnel were removed after verification.
- TLS: `/etc/letsencrypt/live/naijaspa/`, covering the apex and www names; renewal uses the existing Certbot scheduler and `/var/www/html` webroot. HTTP and www redirect to the apex HTTPS origin.
- Nginx: `/etc/nginx/sites-available/naijaspa`, enabled through its own symlink. The source is `deploy/nginx.naijaspa.tls.conf`. It overwrites forwarding headers used for request protection, so clients cannot select their own rate-limit IP.
- Scheduled push-reminder worker has **not** been enabled. Imported pending push notifications should be reviewed before automatic dispatch. Interactive notification and email actions still use the application endpoints normally. No staging/live verification sent a payment or email.

The limited-memory production build passed. Private checks passed for public pages, actual stored pricing, availability, Redis and migrated admin/customer/vendor access. Public desktop/mobile checks and real seeded-password login checks are implemented in `scripts/verify-live-deployment.mjs`. PadiCheck's three services remained active and its HTTPS homepage returned 200 before and after activation.

## Access

A dedicated local key is stored at `%USERPROFILE%\.ssh\naijaspa_vps`. Its private key stays on the development machine. In a PowerShell terminal, install its public key using the existing VPS password:

```powershell
Get-Content "$env:USERPROFILE\.ssh\naijaspa_vps.pub" | ssh root@162.35.32.178 'umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys'
```

The password prompt is handled by SSH in that terminal. Do not paste the password or private key into chat. After installation, test with `ssh -i "$env:USERPROFILE\.ssh\naijaspa_vps" root@162.35.32.178`. Public-key access does not require disabling existing authentication methods.

## Earlier deployment templates

- PostgreSQL remains private; there is no need to expose its port for an application on the same VPS.
- `deploy/ecosystem.config.cjs` was prepared from the owner's initial PM2 description. It is not used on this systemd-managed server; do not start a duplicate app with it.
- `scripts/notification-worker.mjs` runs the existing push notification job. If enabled later, use a separate systemd unit/timer, review imported pending notifications and retain the configured job authentication.
- `deploy/nginx.naijaspa.conf` is an unused HTTP bootstrap template. The active site uses the TLS template instead. Validate with `nginx -t` before reloads, and retain the PadiCheck virtual hosts.

## Production configuration and rollout

Use a server-specific `.env` protected with mode 600, rather than copying the local development database URL. Set `APP_URL=https://naijaspa.com`, `USE_DEMO_LISTINGS=false`, a new production `AUTH_SECRET`, and NaijaSpa-only `DATABASE_URL` / `DIRECT_URL`. Retain the configured R2 upload integration. Configure Redis for shared rate limiting, with an isolated instance/namespace reviewed against any existing Redis use. Google OAuth must allow the production callback; Paystack's webhook is `/api/payments/webhook`.

For future updates, prepare a new release, link the protected production environment, install locked dependencies, and review/apply any new migrations with `prisma migrate deploy`. Do not overwrite the live database from local development again unless a new migration is explicitly requested. Do not run `db:reset`, `db:push` or the development seed on the live VPS. Building on this shared VPS needs a memory check; the verified build used one worker, a 1,536 MB V8 heap, a 2 GB process-group memory limit and 80% CPU quota. Switch the active symlink and restart only `naijaspa-web` after verification.

Verify the app on its loopback port before future cutovers and check PadiCheck before and after the rollout. Keep its application, database, systemd units and environment files unchanged. Arrange recurring/off-server backups and retention as a separate operations task.

Do **not** run `scripts/vps-setup-postgres.sh` for this shared-host rollout: it targets a different Vercel/database-hosting arrangement, restarts PostgreSQL, changes firewall rules and enables network database access. Likewise, the root `docker-compose.yml` is a local development stack that binds PostgreSQL's standard port; it is not the production setup for this server.
