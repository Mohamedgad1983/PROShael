# Root Scripts

Root scripts are for operations that cross application boundaries or support production maintenance.

Use app-local `scripts/` folders for utilities that only touch one application:

- Backend-only database or API scripts belong in `alshuail-backend/scripts/`.
- Mobile PWA build helpers belong in `alshuail-mobile/scripts/`.
- Admin dashboard tooling belongs in `alshuail-admin-arabic/scripts/` or `alshuail-admin-arabic/tools/`.

Current root scripts:

| Script | Purpose |
| --- | --- |
| `generate_scope_of_work.py` | Generate scope-of-work material |
| `setup-firebase-production.sh` | Production Firebase setup helper |
| `check-news-schema.sh` | Inspect news schema state |
| `publish-update-news.sh` | Publish/update news data |
| `cleanup-test-data.sh` | Remove test data from the target environment |
| `inspect-*.sh` | Focused production/debug inspection helpers |
| `vps-backup/` | VPS backup installer and backup script |

Scripts that need credentials must read them from environment variables or an approved secret manager.
