#!/usr/bin/env bash
# NaijaSpa: PostgreSQL on Ubuntu for Vercel (Prisma).
# Usage: NAIJASPA_DB_PASSWORD='…' sudo -E ./scripts/vps-setup-postgres.sh
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root (sudo -E)."
  exit 1
fi

PASSWORD="${NAIJASPA_DB_PASSWORD:-}"
if [[ -z "$PASSWORD" || "$PASSWORD" == "naijaspa" ]]; then
  echo "Set NAIJASPA_DB_PASSWORD to a long unique password (not naijaspa)."
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg ufw openssl

if ! command -v psql >/dev/null 2>&1; then
  install -d /usr/share/postgresql-common/pgdg
  curl -fsSLo /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
  . /etc/os-release
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt ${VERSION_CODENAME}-pgdg main" \
    >/etc/apt/sources.list.d/pgdg.list
  apt-get update -y
  apt-get install -y postgresql-16
fi

systemctl enable --now postgresql

PG_CONF="$(ls /etc/postgresql/*/main/postgresql.conf | tail -n 1)"
PG_HBA="$(ls /etc/postgresql/*/main/pg_hba.conf | tail -n 1)"
PG_DIR="$(dirname "$PG_CONF")"

sed -i "s/^#\?listen_addresses.*/listen_addresses = '*'/" "$PG_CONF"
if ! grep -q "^ssl = on" "$PG_CONF"; then
  sed -i "s/^#\?ssl = .*/ssl = on/" "$PG_CONF"
fi

if [[ ! -f "$PG_DIR/server.crt" ]]; then
  openssl req -new -x509 -days 3650 -nodes -text \
    -out "$PG_DIR/server.crt" \
    -keyout "$PG_DIR/server.key" \
    -subj "/CN=naijaspa-postgres"
  chmod 600 "$PG_DIR/server.key"
  chown postgres:postgres "$PG_DIR/server.key" "$PG_DIR/server.crt"
fi

# Keep local sockets trusted; require SSL + password from the network (Vercel).
if ! grep -q "NaijaSpa Vercel" "$PG_HBA"; then
  cat >>"$PG_HBA" <<'EOF'

# NaijaSpa Vercel
hostssl naijaspa naijaspa 0.0.0.0/0 scram-sha-256
hostssl naijaspa naijaspa ::/0 scram-sha-256
EOF
fi

PASS_ESC="${PASSWORD//\'/\'\'}"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'naijaspa') THEN
    CREATE ROLE naijaspa LOGIN PASSWORD '${PASS_ESC}';
  ELSE
    ALTER ROLE naijaspa WITH PASSWORD '${PASS_ESC}';
  END IF;
END
\$\$;
SELECT 'CREATE DATABASE naijaspa OWNER naijaspa'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'naijaspa')\gexec
GRANT ALL PRIVILEGES ON DATABASE naijaspa TO naijaspa;
SQL

systemctl restart postgresql

ufw allow OpenSSH
ufw allow 5432/tcp comment 'NaijaSpa Postgres for Vercel'
ufw --force enable

IP="$(curl -4 -fsS ifconfig.me || hostname -I | awk '{print $1}')"
echo
echo "PostgreSQL is ready."
echo "Set this on Vercel as DATABASE_URL:"
echo "postgresql://naijaspa:${PASSWORD}@${IP}:5432/naijaspa?sslmode=require&connection_limit=5"
echo
echo "Then from your PC:"
echo "  npx prisma migrate deploy"
echo "Do not seed production with prisma/seed.ts."
