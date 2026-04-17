# Fix daily SQL backup — install guide

The existing daily backup cron has been producing 0-byte `.sql` files since
around Feb 14, 2026. This replaces it with a reliable pg_dump-based job.

New layout on the VPS after install:

```
/usr/local/bin/alshuail-backup.sh           ← the script
/etc/cron.d/alshuail-backup                  ← schedule (03:15 daily)
/var/backups/alshuail/daily/                 ← output, 14-day rotation
/var/log/alshuail-backup.log                 ← per-run log
```

All steps below are pastable into your VPS SSH session.

---

## 1. Diagnose the current state (read-only)

Before changing anything, confirm what's there:

```bash
# What cron jobs exist?
ls -la /etc/cron.d/ /etc/cron.daily/ 2>/dev/null
sudo crontab -l
crontab -l

# Where are the current (broken) backups and their sizes?
ls -lh /var/backups/postgresql/16-main/ 2>/dev/null || true
find /var/backups -maxdepth 4 -name '*.sql*' -mtime -30 -printf '%TY-%Tm-%Td  %10s  %p\n' 2>/dev/null | sort

# Is our latest pg_dump custom dump where we expect?
ls -lh /var/backups/postgresql/16-main/*.dump/ 2>/dev/null
```

Copy the output into the session so we can decide which old cron entries to disable.

---

## 2. Install the new script

From your Mac, push the repo (`git pull` on VPS will bring these files down).
On the VPS:

```bash
cd /var/www/PROShael
git pull

sudo install -m 0755 scripts/vps-backup/alshuail-backup.sh /usr/local/bin/alshuail-backup.sh
sudo mkdir -p /var/backups/alshuail/daily
sudo touch /var/log/alshuail-backup.log
sudo chmod 640 /var/log/alshuail-backup.log
```

---

## 3. Run it once manually to confirm it works

```bash
sudo /usr/local/bin/alshuail-backup.sh
echo "exit=$?"

# Check the log + the dump file:
sudo tail -20 /var/log/alshuail-backup.log
ls -lh /var/backups/alshuail/daily/
```

Expected output in the log:

```
YYYY-MM-DD HH:MM:SS  ---- starting backup: db=alshuail_db host=localhost:5432 user=alshuail ----
YYYY-MM-DD HH:MM:SS  OK  file=/var/backups/alshuail/daily/alshuail_db-YYYY-MM-DD.dump  size=NNM  duration=Ns
YYYY-MM-DD HH:MM:SS  ---- done ----
```

The dump file should be several MB, not 0 bytes. If pg_dump fails, the log
line will start with `ERROR:` and tell you which env variable or connection
failed.

---

## 4. Install the cron schedule

Runs at 03:15 every night (before any admin activity, after daily analytics).
MAILTO lets root receive failure output if Postfix is configured; harmless
if not.

```bash
sudo tee /etc/cron.d/alshuail-backup > /dev/null <<'EOF'
# Daily PostgreSQL backup for alshuail_db.
# Managed — do not edit. See scripts/vps-backup/INSTALL.md in the repo.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=root

15 3 * * *  root  /usr/local/bin/alshuail-backup.sh
EOF
sudo chmod 644 /etc/cron.d/alshuail-backup
sudo systemctl reload cron 2>/dev/null || sudo service cron reload
```

Verify cron picked it up:

```bash
sudo grep CRON /var/log/syslog | tail -20
```

---

## 5. Disable the old broken job

Find the old entry that's been writing 0-byte files. Likely candidates:

```bash
# Look for anything that runs pg_dump, pg_dumpall, or mentions alshuail
grep -rE 'pg_dump|alshuail|postgres' /etc/cron.* /etc/crontab 2>/dev/null
ls /etc/cron.daily/ | grep -i -E 'postgres|alshuail|backup' || true
```

If the old job is an `/etc/cron.daily/` file:

```bash
sudo mv /etc/cron.daily/<OLD-SCRIPT-NAME> /root/_disabled-$(date +%Y%m%d)-<OLD-SCRIPT-NAME>
```

If it's a line in root's crontab:

```bash
sudo crontab -e     # comment out the line with '#'
```

The goal: only one backup job runs nightly, and it's ours.

---

## 6. Cleanup — stale 0-byte dumps

Once the new script is confirmed writing real dumps, you can clear the
empty files from the old location:

```bash
# DRY RUN first — show what would be deleted
find /var/backups/postgresql/16-main/ -maxdepth 3 -name '*.sql*' -size 0 -mtime +7 -print

# Then actually delete
find /var/backups/postgresql/16-main/ -maxdepth 3 -name '*.sql*' -size 0 -mtime +7 -delete
```

Keep the weekly `.dump` files under `/var/backups/postgresql/16-main/*.dump/`
— those are the real recovery source for anything older than 14 days.

---

## Rollback

If the new script misbehaves, disable just the cron:

```bash
sudo rm /etc/cron.d/alshuail-backup
sudo systemctl reload cron
```

The old backups in `/var/backups/postgresql/16-main/*.dump/` (pg_dump custom
format, weekly) remain your fallback until this is fixed.
