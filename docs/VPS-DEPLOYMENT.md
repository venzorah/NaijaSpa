# NaijaSpa alongside PadiCheck on the VPS

Target supplied by the owner: `162.35.32.178`, root SSH access, 4 GB RAM, PM2 and Nginx. PostgreSQL is already installed. Server capacity, process names, ports, database roles and existing virtual hosts still require an authenticated inspection. No remote changes have been made.

## Access

A dedicated local key is stored at `%USERPROFILE%\.ssh\naijaspa_vps`. Its private key stays on the development machine. In a PowerShell terminal, install its public key using the existing VPS password:

```powershell
Get-Content "$env:USERPROFILE\.ssh\naijaspa_vps.pub" | ssh root@162.35.32.178 'umask 077; mkdir -p ~/.ssh; cat >> ~/.ssh/authorized_keys'
```

The password prompt is handled by SSH in that terminal. Do not paste the password or private key into chat. After installation, test with `ssh -i "$env:USERPROFILE\.ssh\naijaspa_vps" root@162.35.32.178`. Public-key access does not require disabling existing authentication methods.

## Prepared layout

- Use a separate application directory and PostgreSQL database/role named for NaijaSpa. Inspect for name collisions first. Keep PostgreSQL private; there is no need to expose its port for an application on the same VPS.
- `deploy/ecosystem.config.cjs` defines a single production web process, `naijaspa-web`, listening only on `127.0.0.1:3100`. Check that port is free before using it. Memory settings are initial ceilings to review against measured server headroom, not a guarantee both applications fit.
- The optional `naijaspa-notifications` process runs the existing durable notification job. Start it only after `CRON_SECRET` or `INTERNAL_JOB_SECRET` is configured and the endpoint works. Start the web process with `pm2 start deploy/ecosystem.config.cjs --only naijaspa-web`; do not use a global PM2 restart/delete command.
- `deploy/nginx.naijaspa.conf` is an HTTP bootstrap template for the NaijaSpa domains. Inspect existing domain configuration and DNS before installing it. Provision HTTPS before public authentication/payment testing. Validate with `nginx -t` before any reload, and retain the existing PadiCheck virtual host.

## Production configuration and rollout

Use a server-specific `.env` protected with mode 600, rather than copying the local development database URL. Set `APP_URL=https://naijaspa.com`, `USE_DEMO_LISTINGS=false`, a new production `AUTH_SECRET`, and NaijaSpa-only `DATABASE_URL` / `DIRECT_URL`. Retain the configured R2 upload integration. Configure Redis for shared rate limiting, with an isolated instance/namespace reviewed against any existing Redis use. Google OAuth must allow the production callback; Paystack's webhook is `/api/payments/webhook`.

After authenticated inspection, prepare the new database/role, deploy the reviewed code, install locked dependencies, apply `prisma migrate deploy` to the new database, and build/run the production app. Do not run `db:reset`, `db:push` or the development seed on the live VPS. Real production admin/catalog initialization must be planned separately from seeded test users and fixtures. Building on this 4 GB shared VPS needs a memory check; use a compatible Linux CI build if there is insufficient headroom.

Verify the app on its loopback port and review the exact Nginx/DNS change before cutover. Check PadiCheck before and after the rollout. Keep its application, database, PM2 configuration and environment files unchanged. Set up separate database backups and log rotation.

Do **not** run `scripts/vps-setup-postgres.sh` for this shared-host rollout: it targets a different Vercel/database-hosting arrangement, restarts PostgreSQL, changes firewall rules and enables network database access. Likewise, the root `docker-compose.yml` is a local development stack that binds PostgreSQL's standard port; it is not the production setup for this server.
