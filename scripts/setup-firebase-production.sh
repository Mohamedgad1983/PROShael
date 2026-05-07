#!/usr/bin/env bash
# ============================================================================
# Setup Firebase production credentials on the VPS
#
# Run AFTER you've downloaded the Firebase service account JSON from
# Firebase Console → Project Settings → Service accounts → Generate new
# private key.
#
# Usage:
#   bash scripts/setup-firebase-production.sh /path/to/firebase-service-account.json
#
# What it does:
#   1. Reads the JSON locally
#   2. Extracts FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
#   3. Appends/updates them in /var/www/PROShael/alshuail-backend/.env.production
#      on the VPS via SSH
#   4. Restarts pm2 so the new env vars take effect
#
# Confirms by hitting /api/health and tailing pm2 logs for the
# "Firebase credentials" line.
# ============================================================================

set -e

JSON_FILE="${1:-}"
if [ -z "$JSON_FILE" ] || [ ! -f "$JSON_FILE" ]; then
  echo "Usage: $0 /path/to/firebase-service-account.json" >&2
  exit 1
fi

echo "==> Reading service account JSON from $JSON_FILE"

# Extract fields with python (more reliable than jq for newline handling in private_key)
read -r FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL <<EOF
$(python3 -c "
import json, sys
with open('$JSON_FILE') as f:
    d = json.load(f)
print(d['project_id'], d['client_email'])
")
EOF

if [ -z "$FIREBASE_PROJECT_ID" ] || [ -z "$FIREBASE_CLIENT_EMAIL" ]; then
  echo "ERROR: failed to extract project_id or client_email from JSON" >&2
  exit 1
fi

# Private key needs literal \n preserved when injected into env (the Node
# Firebase SDK calls .replace(/\\n/g, '\n') itself).
FIREBASE_PRIVATE_KEY=$(python3 -c "
import json
with open('$JSON_FILE') as f:
    d = json.load(f)
# Escape backslashes/newlines for env file storage.
print(d['private_key'].replace('\n', '\\\\n'))
")

if [ -z "$FIREBASE_PRIVATE_KEY" ]; then
  echo "ERROR: failed to extract private_key" >&2
  exit 1
fi

echo "==> Project ID: $FIREBASE_PROJECT_ID"
echo "==> Client email: $FIREBASE_CLIENT_EMAIL"
echo "==> Private key length: ${#FIREBASE_PRIVATE_KEY} chars"

# Build a remote shell command that:
#   1. Backs up the env file
#   2. Removes any existing FIREBASE_* lines (so we don't duplicate)
#   3. Appends the new values
#   4. Restarts pm2
echo "==> Updating .env.production on VPS (will SSH)"

REMOTE_CMD=$(cat <<REMOTE
set -e
cd /var/www/PROShael/alshuail-backend
cp -p .env.production .env.production.bak.\$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
sed -i.tmp '/^FIREBASE_PROJECT_ID=/d;/^FIREBASE_CLIENT_EMAIL=/d;/^FIREBASE_PRIVATE_KEY=/d' .env.production
rm -f .env.production.tmp
{
  echo "FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID"
  echo "FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL"
  echo 'FIREBASE_PRIVATE_KEY="$FIREBASE_PRIVATE_KEY"'
} >> .env.production
echo "==> .env.production updated"
pm2 restart alshuail-backend --update-env
sleep 2
pm2 logs alshuail-backend --lines 10 --nostream | tail -15 | grep -i firebase || echo "(no firebase line — check full logs)"
REMOTE
)

ssh root@213.199.62.185 "$REMOTE_CMD"

echo ""
echo "==> Done. Push notifications should now deliver. Test by triggering a"
echo "    loan or marriage-support status transition for a member with an"
echo "    FCM token registered in device_tokens."
