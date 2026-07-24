#!/usr/bin/env bash
#
# Manual backend deploy to the production VPS.
# Run ON the VPS, from the repo root:
#     cd /var/www/PROShael && bash scripts/deploy-backend.sh
#
# Safe by construction:
#   - preflight-checks the [PROD REQUIRED] env vars BEFORE touching anything
#     (a missing CSRF_SECRET/JWT_SECRET otherwise crashes the server on boot),
#   - uses `git pull --ff-only` (aborts on divergence instead of merging/clobbering),
#   - records the pre-deploy commit and AUTO-ROLLS BACK if the health check fails.
#
# Override via env: REPO_ROOT, PM2_APP, HEALTH_URL.
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/PROShael}"
BACKEND="$REPO_ROOT/alshuail-backend"
PM2_APP="${PM2_APP:-alshuail-backend}"
HEALTH_URL="${HEALTH_URL:-http://localhost:5001/api/health}"
REQUIRED_VARS=(JWT_SECRET CSRF_SECRET)

cd "$REPO_ROOT"

echo "==> Preflight: [PROD REQUIRED] env vars in $BACKEND/.env"
if [ ! -f "$BACKEND/.env" ]; then
  echo "ERROR: $BACKEND/.env not found. Aborting." >&2
  exit 1
fi
for v in "${REQUIRED_VARS[@]}"; do
  if ! grep -qE "^${v}=." "$BACKEND/.env"; then
    echo "ERROR: $v is missing/empty in $BACKEND/.env — the server will not boot in production. Aborting." >&2
    echo "       Generate one, e.g.: echo \"$v=\$(openssl rand -hex 32)\" >> $BACKEND/.env" >&2
    exit 1
  fi
done
echo "    ok: ${REQUIRED_VARS[*]} present"

PREV="$(git rev-parse HEAD)"
echo "==> Current commit: $(git rev-parse --short HEAD)"

echo "==> Fetch + fast-forward to origin/main"
git fetch origin
if ! git pull --ff-only origin main; then
  echo "ERROR: cannot fast-forward — local history has diverged from origin/main." >&2
  echo "       Reconcile first; refusing to merge or overwrite production state." >&2
  exit 1
fi
echo "==> Now at: $(git rev-parse --short HEAD)"

echo "==> Install backend deps (prod only)"
( cd "$BACKEND" && npm install --omit=dev --no-audit --no-fund )

echo "==> Restart $PM2_APP"
pm2 restart "$PM2_APP" --update-env

echo "==> Health check (up to 40s)"
code=000
for i in $(seq 1 10); do
  sleep 4
  code="$(curl -s -m 5 "$HEALTH_URL" -o /dev/null -w '%{http_code}' || true)"
  echo "    t=$((i*4))s: $code"
  [ "$code" = "200" ] && break
done

if [ "$code" = "200" ]; then
  echo "==> DEPLOY OK: $PM2_APP healthy at $(git rev-parse --short HEAD)"
else
  echo "!!! Health check failed — ROLLING BACK to ${PREV:0:7}" >&2
  git reset --hard "$PREV"
  pm2 restart "$PM2_APP" --update-env
  sleep 5
  curl -s -m 6 "$HEALTH_URL" -o /dev/null -w "after rollback: %{http_code}\n" || true
  exit 1
fi
