#!/usr/bin/env bash
set -euo pipefail
cd /srv/naijaspa/releases/20261102-home-admin-v1
export NODE_OPTIONS=--max-old-space-size=1024
export NAIJASPA_BUILD_CPUS=1
node node_modules/typescript/bin/tsc --noEmit --incremental false
npm test
npm run lint
npm run build
touch .home-admin-build-verified
