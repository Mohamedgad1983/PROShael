# Data Model: Temporary Password Login for All Members

**Branch**: `001-member-temp-password` | **Date**: 2026-03-04

## Entities

### Members (existing table - no schema changes needed)

All required columns already exist in the `members` table:

| Column | Type | Description | Default |
|--------|------|-------------|---------|
| `id` | UUID | Primary key | auto |
| `phone` | VARCHAR | Phone number (login identifier) | required |
| `full_name` | VARCHAR | Member's full name | required |
| `password_hash` | VARCHAR(255) | Bcrypt-hashed password | NULL |
| `requires_password_change` | BOOLEAN | Force password change on next login | FALSE |
| `is_first_login` | BOOLEAN | First-time login indicator | TRUE |
| `has_password` | BOOLEAN | Whether member has set a personal password | FALSE |
| `password_changed_at` | TIMESTAMPTZ | Last password update timestamp | NULL |
| `login_attempts` | INTEGER | Consecutive failed login counter | 0 |
| `account_locked_until` | TIMESTAMPTZ | Account lockout expiry time | NULL |
| `temp_password` | VARCHAR(255) | Temporary password marker | NULL |
| `last_login` | TIMESTAMPTZ | Most recent login timestamp | NULL |

### Audit Logs (existing table - no schema changes needed)

Password operations are logged to the existing `audit_logs` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `action` | VARCHAR | Action type (e.g., 'password_reset', 'password_changed') |
| `performed_by` | UUID | Admin/member who performed the action |
| `target_user` | UUID | Member affected |
| `details` | JSONB | Additional context |
| `created_at` | TIMESTAMPTZ | Timestamp |

## State Transitions

### Member Password State Machine

```
[No Password] ──(bulk setup SQL)──> [Temporary Password]
                                         │
                                    (member login)
                                         │
                                         v
                                  [Must Change Password]
                                         │
                                  (change password)
                                         │
                                         v
                                   [Personal Password]
                                         │
                              ┌──(admin reset)──┐
                              │                  │
                              v                  │
                       [Temporary Password] <────┘
```

### State Flags Mapping

| State | `password_hash` | `requires_password_change` | `is_first_login` | `has_password` |
|-------|----------------|---------------------------|-------------------|----------------|
| No Password | NULL | FALSE | TRUE | FALSE |
| Temporary Password | hash("123456") | TRUE | TRUE | FALSE |
| Must Change Password | hash("123456") | TRUE | FALSE | FALSE |
| Personal Password | hash(personal) | FALSE | FALSE | TRUE |

## Bulk Setup SQL

```sql
-- Set default password for all members without a personal password
UPDATE members
SET
  password_hash = '$2b$12$OJ5iRDohKqpP2Ne/6XBstO7qeikbJxltZ/vvfrCycWBPpGX5vws/O',
  requires_password_change = true,
  is_first_login = true,
  has_password = false
WHERE password_hash IS NULL
   OR has_password = false;
```

## Validation Rules

### Password Strength (for personal passwords)
- Minimum 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- Must not be "123456" or the same as current password

### Account Lockout
- Lock after 5 consecutive failed attempts
- Lock duration: 15 minutes
- Reset counter on successful login
- Counter stored in `login_attempts` column
- Lockout time stored in `account_locked_until` column

### Phone Number Format
- Kuwait: +965 followed by 8 digits
- Saudi Arabia: +966 followed by 9 digits
