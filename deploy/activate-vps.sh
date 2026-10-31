#!/usr/bin/env bash
set -euo pipefail
[[ "$(id -u)" == 0 ]] || { echo "Run as root"; exit 1; }
available=/etc/nginx/sites-available/naijaspa
enabled=/etc/nginx/sites-enabled/naijaspa
[[ ! -e "$available" && ! -e "$enabled" ]] || { echo "NaijaSpa virtual host already exists; inspect before changing it"; exit 1; }
curl --fail --silent --show-error --output /dev/null https://padicheck.com/
umask 077
tar -czf /var/backups/naijaspa/nginx-before-activation.tar.gz -C /etc nginx
install -m 0644 /srv/naijaspa/shared/nginx.naijaspa.tls.conf "$available"
ln -s "$available" "$enabled"
rollback() {
  local result=$?
  trap - ERR
  unlink "$enabled"
  if nginx -t; then systemctl reload nginx; fi
  echo "NaijaSpa public routing rolled back"
  exit "$result"
}
trap rollback ERR
nginx -t
systemctl reload nginx
curl --fail --silent --show-error --retry 4 --retry-all-errors --retry-delay 1 --resolve naijaspa.com:443:127.0.0.1 --output /dev/null https://naijaspa.com/explore
curl --fail --silent --show-error --output /dev/null https://padicheck.com/
trap - ERR
echo "NaijaSpa HTTPS activated; PadiCheck HTTPS remains healthy"
