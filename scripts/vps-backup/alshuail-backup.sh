#!/usr/bin/env bash
# ============================================================================
# alshuail-backup.sh — daily PostgreSQL backup for alshuail_db
# ============================================================================
# Replaces the broken pg_dumpall cron that has been producing 0-byte .sql
# files since ~Feb 14, 2026.
#
# Strategy
#   - Uses pg_dump in custom format (-Fc) so restores are fast and selective.
#   - Reads DB credentials from /var/www/PROShael/alshuail-backend/.env via
#     line-by-line extraction (NOT `source`, because .env line 21 contains
#     shell metacharacters that break bash parsing — see claude-memory note).
#   - Writes to /var/backups/alshuail/daily/alshuail_db-YYYY-MM-DD.dump
#   - Rotates: keeps the last 14 daily dumps. Older ones are deleted.
#   - Logs every run to /var/log/alshuail-backup.log with start time, output
#     size, duration, exit status.
#   - Exits non-zero on failure so cron's MAILTO (if set) catches it.
#
# Install
#   See scripts/vps-backup/INSTALL.md.
# ============================================================================

set -euo pipefail

ENV_FILE="/var/www/PROShael/alshuail-backend/.env"
BACKUP_DIR="/var/backups/alshuail/daily"
LOG_FILE="/var/log/alshuail-backup.log"
RETENTION_DAYS=14

log() {
  printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG_FILE"
}

fail() {
  log "ERROR: $*"
  echo "alshuail-backup: $*" >&2
  exit 1
}

[[ -f "$ENV_FILE" ]] || fail ".env not found at $ENV_FILE"

# Safe extract: no shell evaluation of .env values.
get_env() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'"
}

DB_HOST="$(get_env DB_HOST)"
DB_PORT="$(get_env DB_PORT)"
DB_NAME="$(get_env DB_NAME)"
DB_USER="$(get_env DB_USER)"
DB_PASSWORD="$(get_env DB_PASSWORD)"

[[ -n "$DB_NAME" ]] || fail "DB_NAME empty — check $ENV_FILE"
[[ -n "$DB_USER" ]] || fail "DB_USER empty — check $ENV_FILE"
: "${DB_HOST:=localhost}"
: "${DB_PORT:=5432}"

mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"
chmod 640 "$LOG_FILE" 2>/dev/null || true

STAMP="$(date +%Y-%m-%d)"
OUT="$BACKUP_DIR/${DB_NAME}-${STAMP}.dump"
TMP="$OUT.inprogress"

START_TS="$(date +%s)"
log "---- starting backup: db=$DB_NAME host=$DB_HOST:$DB_PORT user=$DB_USER ----"

# Export password for pg_dump so we don't leak it on the command line.
export PGPASSWORD="$DB_PASSWORD"

# -Fc     : custom format (compressed, selective restore via pg_restore)
# --no-owner / --no-acl : safer for restoring on a different cluster
# -Z 6    : moderate compression, good tradeoff
if ! pg_dump \
      -h "$DB_HOST" \
      -p "$DB_PORT" \
      -U "$DB_USER" \
      -d "$DB_NAME" \
      -Fc -Z 6 \
      --no-owner \
      --no-acl \
      -f "$TMP"; then
  rm -f "$TMP"
  unset PGPASSWORD
  fail "pg_dump failed"
fi
unset PGPASSWORD

SIZE="$(stat -c '%s' "$TMP" 2>/dev/null || echo 0)"
if [[ "$SIZE" -lt 4096 ]]; then
  rm -f "$TMP"
  fail "dump size $SIZE bytes < 4KB — treating as failure"
fi

mv "$TMP" "$OUT"
chmod 640 "$OUT"

DURATION=$(( $(date +%s) - START_TS ))
HUMAN_SIZE="$(du -h "$OUT" | cut -f1)"
log "OK  file=$OUT  size=$HUMAN_SIZE  duration=${DURATION}s"

# Retention: keep RETENTION_DAYS most-recent dumps, delete older.
DELETED=$(find "$BACKUP_DIR" -maxdepth 1 -name "${DB_NAME}-*.dump" -type f -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
if [[ "$DELETED" -gt 0 ]]; then
  log "rotated: deleted $DELETED dump(s) older than $RETENTION_DAYS days"
fi

log "---- done ----"
exit 0
