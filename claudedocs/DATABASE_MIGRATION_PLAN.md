# Al-Shuail Database Migration Plan
## Supabase → Self-Hosted PostgreSQL on VPS

**Generated**: 2025-12-13
**Status**: Ready for Review

---

## Executive Summary

| Item | Value |
|------|-------|
| Total Tables | 88 in public schema |
| Critical Tables with Data | 25 |
| Total Rows to Migrate | ~3,500+ rows |
| Foreign Key Relationships | 108 |
| Database Functions | 65+ |
| Estimated Migration Time | 2-4 hours |

---

## Table Inventory with Row Counts

### Critical Tables (Must Migrate First)

| Priority | Table | Rows | Dependencies |
|----------|-------|------|--------------|
| 1 | `settings` | 24 | None |
| 1 | `user_roles` | 7 | None |
| 1 | `roles` | 5 | None |
| 1 | `permissions` | 15 | None |
| 1 | `main_categories` | 3 | None |
| 1 | `document_types` | 14 | None |
| 1 | `document_categories` | 13 | Self-ref (parent_category_id) |
| 1 | `expense_categories` | 13 | Self-ref, users |
| 1 | `subscription_plans` | 4 | None |
| 1 | `sub_categories` | 2 | main_categories |
| 1 | `system_settings` | 1 | None |

### Core Data Tables

| Priority | Table | Rows | Dependencies |
|----------|-------|------|--------------|
| 2 | `users` | 2 | members (circular) |
| 2 | `families` | 0 | None |
| 2 | `temp_members` | 345 | None |
| 3 | `family_branches` | 10 | members (branch_head_id) |
| 3 | `members` | **347** | users, families, family_branches |
| 4 | `subscriptions` | 346 | members, subscription_plans |
| 4 | `user_notification_preferences` | 346 | members |
| 4 | `financial_contributions` | **852** | temp_members, activities |
| 4 | `financial_access_logs` | 394 | users |

### Secondary Tables

| Priority | Table | Rows | Dependencies |
|----------|-------|------|--------------|
| 5 | `activities` | 12 | temp_members, main_categories |
| 5 | `audit_logs` | 19 | None |
| 5 | `financial_audit_trail` | 16 | users |
| 5 | `balance_adjustments` | 10 | members |
| 5 | `notifications` | 9 | users |
| 5 | `refresh_tokens` | 12 | members |
| 5 | `user_role_assignments` | 6 | user_roles |
| 5 | `news_announcements` | 5 | users |
| 5 | `initiatives` | 3 | users |
| 5 | `diya_cases` | 3 | members |
| 5 | `events` | 3 | None |
| 5 | `payments` | 2 | members, users, subscriptions |
| 5 | `documents_metadata` | 2 | members |
| 5 | `device_tokens` | 2 | members |

### Empty Tables (Structure Only)

| Table | Dependencies |
|-------|--------------|
| `profiles` | members, user_roles, auth.users |
| `families` | None |
| `family_tree` | members, auth.users |
| `family_relationships` | members |
| `family_tree_positions` | members |
| `family_assets` | members |
| `inheritance_plans` | members, family_assets |
| `competitions` | auth.users |
| `competition_participants` | competitions, members |
| `member_subscriptions` | members |
| `member_documents` | members, document_types |
| `member_photos` | members, events |
| `member_registration_tokens` | members |
| `event_attendees` | events, members |
| `event_registrations` | None |
| `occasion_registrations` | activities, temp_members |
| `occasions` | None |
| `occasion_rsvp` | members, occasions |
| `contributions` | users |
| `initiative_donations` | initiatives, members, users |
| `initiative_volunteers` | initiatives, members |
| `crisis_alerts` | members |
| `crisis_responses` | crisis_alerts, members |
| `bank_statements` | members |
| `bank_transfer_requests` | members, users |
| `expense_receipts` | members, activities, initiatives |
| `expenses` | users, members |
| `financial_transactions` | users |
| `financial_reports` | auth.users |
| `payment_notifications` | members, payments |
| `payments_yearly` | members |
| `verification_codes` | members |
| `sms_otp` | None |
| `news_views` | news_announcements, users |
| `news_reactions` | news_announcements |
| `push_notification_tokens` | users |
| `document_access_logs` | members |
| `document_processing_queue` | None |
| `notification_logs` | members |
| `user_preferences` | members |
| `app_settings` | users |
| `excel_import_batches` | users |
| `diya_case_updates` | diya_cases |

### Backup/View Tables (Skip or Review)

| Table | Type | Notes |
|-------|------|-------|
| `members_backup_20250928_1039` | Backup | 299 rows, can skip |
| `members_phone_backup` | Backup | 347 rows, can skip |
| `member_statement_view` | Materialized View | 347 rows, recreate |
| `member_balance_summary` | Materialized View | 347 rows, recreate |
| `critical_members_view` | Materialized View | 347 rows, recreate |
| `members_statistics` | Materialized View | 1 row, recreate |
| `mv_member_stats` | Materialized View | 1 row, recreate |
| `mv_audit_summary` | Materialized View | 0 rows, recreate |
| `payments_summary` | View/Table | 0 rows, recreate |

---

## Migration Order (Dependency-Safe)

### Level 0: Standalone Tables (No Foreign Keys)

```sql
-- Order: 1
settings
roles
permissions
user_roles
system_settings
main_categories
document_types
subscription_plans
sms_otp
audit_logs
events
occasions
families
```

### Level 1: Self-Referencing & Simple Dependencies

```sql
-- Order: 2
document_categories  -- parent_category_id → self
expense_categories   -- parent_category_id → self
sub_categories       -- main_category_id → main_categories
user_role_assignments -- role_id → user_roles
temp_members         -- No FK dependencies (standalone)
```

### Level 2: Users Table (Circular with Members)

```sql
-- Order: 3 - Insert users WITHOUT member_id first
users (without member_id constraint)
```

### Level 3: Family Branches (Needs Members Placeholder)

```sql
-- Order: 4 - Insert family_branches without branch_head_id/created_by
family_branches (without member FKs)
```

### Level 4: Members (Core Table)

```sql
-- Order: 5 - Insert all 347 members
members
-- Then update family_branches with member references
-- Then update users with member_id references
```

### Level 5: Member-Dependent Tables

```sql
-- Order: 6
subscriptions           -- member_id → members
user_notification_preferences -- member_id → members
balance_adjustments     -- member_id → members
refresh_tokens          -- user_id → members
device_tokens           -- member_id → members
notifications           -- user_id → users
financial_access_logs   -- user_id → users
financial_audit_trail   -- user_id → users
news_announcements      -- author_id → users
```

### Level 6: Activities & Related

```sql
-- Order: 7
activities              -- temp_members FKs
financial_contributions -- activity_id → activities, temp_members FKs
occasion_registrations  -- activity_id → activities
```

### Level 7: Complex Dependencies

```sql
-- Order: 8
initiatives             -- created_by → users
diya_cases              -- member FKs
payments                -- multiple FKs
profiles                -- member_id, role_id
family_tree             -- member_id → members
family_relationships    -- member FKs
```

### Level 8: Remaining Tables

```sql
-- Order: 9
-- All remaining empty tables following dependency order
```

---

## Foreign Key Relationships Map

### Critical Relationships (members table)

```
members
├── family_branch_id → family_branches.id
├── family_id → families.id (nullable)
├── user_id → users.id (nullable)
├── parent_member_id → members.id (self)
└── spouse_id → members.id (self)

REFERENCED BY:
├── subscriptions.member_id
├── subscriptions.subscriber_id
├── payments.payer_id
├── payments.beneficiary_id
├── payments.approved_by
├── user_notification_preferences.member_id
├── balance_adjustments.member_id
├── refresh_tokens.user_id
├── device_tokens.member_id
├── family_branches.branch_head_id
├── family_branches.created_by
├── users.member_id
└── ... (35+ more references)
```

### Circular Dependencies to Handle

```
1. users ↔ members
   - users.member_id → members.id
   - members.user_id → users.id
   SOLUTION: Insert users first without member_id,
             then members, then update users.member_id

2. family_branches ↔ members
   - family_branches.branch_head_id → members.id
   - members.family_branch_id → family_branches.id
   SOLUTION: Insert family_branches without branch_head_id,
             then members, then update family_branches

3. members self-references
   - members.parent_member_id → members.id
   - members.spouse_id → members.id
   SOLUTION: Insert all members with NULL for these,
             then update in second pass
```

---

## Database Functions Summary

### Business Logic Functions (Must Migrate)

| Function | Purpose |
|----------|---------|
| `generate_membership_number()` | Auto-generate membership numbers |
| `generate_payment_number()` | Auto-generate payment numbers |
| `update_member_balance()` | Trigger: Update balance on payment |
| `update_current_balance_from_yearly_payments()` | Calculate balance from yearly |
| `check_subscription_expiry()` | Check/update expired subscriptions |
| `refresh_all_views()` | Refresh materialized views |
| `gregorian_to_hijri()` | Convert dates to Hijri |
| `convert_to_hijri_simple()` | Simple Hijri conversion |

### Authentication Functions

| Function | Purpose |
|----------|---------|
| `verify_otp()` | Verify SMS OTP codes |
| `cleanup_expired_otp()` | Clean old OTP records |
| `get_user_role()` | Get user role |
| `get_user_claims()` | Get JWT claims |
| `is_super_admin()` | Check admin status |
| `user_has_permission()` | Check permissions |
| `get_active_roles()` | Get user's active roles |
| `get_merged_permissions()` | Merge role permissions |

### Member Functions

| Function | Purpose |
|----------|---------|
| `get_member_by_phone()` | Find member by phone |
| `get_member_payment_summary()` | Get payment summary |
| `get_dashboard_stats()` | Dashboard statistics |
| `get_critical_members()` | List critical balance members |
| `update_member_safe()` | Safe member update |
| `update_member_with_safe_dates()` | Handle date edge cases |

### Utility Functions

| Function | Purpose |
|----------|---------|
| `handle_updated_at()` | Trigger: Auto-update timestamps |
| `update_updated_at_column()` | Generic timestamp update |
| `calculate_generation_level()` | Family tree generation |
| `get_descendants()` | Get family descendants |
| `update_branch_member_count()` | Update branch counts |

---

## Triggers to Recreate

| Trigger | Table | Function |
|---------|-------|----------|
| `set_updated_at` | Multiple | `handle_updated_at()` |
| `update_member_balance_trigger` | `payments` | `update_member_balance()` |
| `generate_membership_number_trigger` | `members` | `generate_membership_number()` |
| `set_payment_number_trigger` | `payments` | `set_payment_number()` |
| `update_contribution_trigger` | `financial_contributions` | `update_activity_current_amount()` |
| `update_initiative_amount_trigger` | `initiative_donations` | `update_initiative_amount()` |
| `news_updated_at_trigger` | `news_announcements` | `update_news_updated_at()` |
| `set_publish_date_trigger` | `news_announcements` | `set_news_publish_date()` |

---

## Materialized Views to Recreate

### member_statement_view
```sql
CREATE MATERIALIZED VIEW member_statement_view AS
SELECT
    id, full_name, phone, membership_number,
    current_balance, alert_level, status_color,
    shortfall, percentage_complete, last_payment_date
FROM members
-- With calculated fields for compliance status
```

### member_balance_summary
```sql
CREATE MATERIALIZED VIEW member_balance_summary AS
SELECT
    id, full_name, membership_number,
    balance, total_paid, is_compliant
FROM members
```

### critical_members_view
```sql
CREATE MATERIALIZED VIEW critical_members_view AS
SELECT
    id, full_name, phone, membership_number,
    balance, shortfall, priority_level
FROM members
WHERE balance < threshold
```

---

## Extensions Required

```sql
-- Required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- Password hashing
```

---

## Sequences to Create

```sql
-- Payment number sequence
CREATE SEQUENCE payment_number_seq START 1;

-- Membership number already handled by function
```

---

## Migration Steps Summary

### Phase 1: VPS PostgreSQL Setup
1. Install PostgreSQL 15
2. Create database `alshuail_db`
3. Create user `alshuail_admin`
4. Enable extensions
5. Configure local-only access

### Phase 2: Schema Export
1. Export all table structures
2. Export functions (65+)
3. Export triggers
4. Export sequences
5. Document row counts

### Phase 3: Schema Import
1. Create extensions
2. Create sequences
3. Create Level 0 tables
4. Create Level 1-8 tables (without FKs)
5. Add foreign key constraints
6. Create functions
7. Create triggers
8. Create materialized views

### Phase 4: Data Migration
1. Disable FK checks temporarily
2. Import Level 0 data
3. Import Level 1-4 data (handling circular deps)
4. Import Level 5-8 data
5. Re-enable FK checks
6. Verify row counts

### Phase 5: Backend Update
1. Update database connection
2. Replace Supabase client with pg
3. Implement JWT auth locally
4. Test all endpoints

### Phase 6: Validation
1. Verify row counts match
2. Test critical operations
3. Validate FK integrity
4. Performance test

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Data loss during migration | HIGH | Multiple backups, staged rollout |
| Circular FK dependencies | MEDIUM | Documented resolution order |
| Missing functions | MEDIUM | Full function inventory |
| Auth system change | HIGH | Parallel testing period |
| Downtime | MEDIUM | Schedule during low-usage |

---

## Rollback Plan

1. Keep Supabase active for 2+ weeks after migration
2. Backend can switch between databases via env var
3. Nightly backups from both sources
4. Document any data written to new system

---

## Next Steps

1. **Approval**: Review this plan with stakeholders
2. **Backup**: Full Supabase backup before starting
3. **Test Environment**: Set up test PostgreSQL first
4. **Staged Migration**: Test with subset of data
5. **Production Migration**: Full migration with monitoring
6. **Validation Period**: 2 weeks parallel operation
7. **Cutover**: Disable Supabase connection

---

## Questions for User

1. When is the best time for migration (lowest usage)?
2. Should we migrate storage files (documents/photos)?
3. Preferred password for `alshuail_admin` user?
4. Any tables that should NOT be migrated?
5. Approval to proceed with Phase 1 (PostgreSQL installation)?
