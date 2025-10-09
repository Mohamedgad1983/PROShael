# Winston Logger Usage Guide

**Location**: `src/utils/logger.js`
**Purpose**: Professional logging system replacing all console.log/error/warn statements

---

## Quick Start

### Import Logger
```javascript
import { log } from '../utils/logger.js';
```

### Basic Usage
```javascript
// ❌ OLD WAY (Don't use)
console.log('User logged in:', userId);
console.error('Database error:', error);
console.warn('API rate limit approaching');

// ✅ NEW WAY (Use this)
log.debug('User logged in', { userId });
log.error('Database error', { error: error.message });
log.warn('API rate limit approaching', { remaining: 10 });
```

---

## Available Log Levels

### 1. `log.error()` - Error Logging
**When to use**: Critical errors, exceptions, failures
**Environment**: Always logged (dev + production)

```javascript
// Example 1: Database errors
try {
  const result = await supabase.from('members').select('*');
} catch (error) {
  log.error('Database query failed', {
    error: error.message,
    table: 'members'
  });
}

// Example 2: API failures
if (response.status !== 200) {
  log.error('External API failed', {
    status: response.status,
    endpoint: '/api/payments'
  });
}
```

### 2. `log.warn()` - Warning Logging
**When to use**: Potential issues, deprecations, fallbacks
**Environment**: Always logged (dev + production)

```javascript
// Example 1: Missing environment variable
if (!process.env.JWT_SECRET) {
  log.warn('JWT_SECRET not set, using fallback');
}

// Example 2: Rate limit warning
if (requestCount > 90) {
  log.warn('API rate limit approaching', {
    current: requestCount,
    limit: 100
  });
}
```

### 3. `log.info()` - Informational Logging
**When to use**: Important business events, successful operations
**Environment**: Always logged (dev + production)

```javascript
// Example 1: Successful payment
log.info('Payment processed successfully', {
  paymentId: payment.id,
  amount: payment.amount,
  memberId: member.id
});

// Example 2: User registration
log.info('New member registered', {
  memberId: newMember.id,
  membershipNumber: newMember.membership_number
});
```

### 4. `log.http()` - HTTP Request Logging
**When to use**: Incoming HTTP requests, API endpoint access
**Environment**: Always logged (dev + production)

```javascript
// Example 1: Endpoint access
log.http('Dashboard stats request received');

// Example 2: API endpoint with user
log.http('Member profile accessed', {
  memberId: req.user.id,
  endpoint: req.path
});
```

### 5. `log.debug()` - Debug Logging
**When to use**: Detailed debugging info, intermediate values
**Environment**: **DEV ONLY** (not logged in production)

```javascript
// Example 1: Processing steps
log.debug('Processing member data', {
  memberCount: members.length,
  activeCount: activeMembers.length
});

// Example 2: Query results
log.debug('Database query completed', {
  table: 'payments',
  resultCount: results.length,
  duration: '123ms'
});
```

---

## Specialized Logging Functions

### 6. `log.api()` - API Request/Response Logging
**Purpose**: Track external API calls with timing
**Signature**: `log.api(method, url, status, duration)`

```javascript
// Example: External API call
const startTime = Date.now();
const response = await fetch('https://api.example.com/data');
const duration = Date.now() - startTime;

log.api('GET', '/data', response.status, duration);
// Output: "[API] GET /data - Status: 200 - Duration: 234ms"
```

### 7. `log.db()` - Database Query Logging
**Purpose**: Track database operations with timing
**Signature**: `log.db(operation, table, duration)`

```javascript
// Example: Database query
const startTime = Date.now();
const result = await supabase.from('members').select('*');
const duration = Date.now() - startTime;

log.db('SELECT', 'members', duration);
// Output: "[DB] SELECT members - Duration: 89ms"

// Simple form (no timing)
log.db('Fetching members statistics', 'members', 0);
// Output: "[DB] Fetching members statistics from members"
```

### 8. `log.auth()` - Authentication Logging
**Purpose**: Track authentication and authorization events
**Signature**: `log.auth(action, user, success)`

```javascript
// Example 1: Successful login
log.auth('Login', decoded.id, true);
// Output: "[AUTH] Login - User: 12345 - Success: ✓"

// Example 2: Failed login
log.auth('Login', email, false);
// Output: "[AUTH] Login - User: user@example.com - Success: ✗"

// Example 3: Access check
log.auth('Admin access', userId, true);
// Output: "[AUTH] Admin access - User: 12345 - Success: ✓"
```

---

## Best Practices

### 1. Use Structured Metadata (Objects)
```javascript
// ❌ BAD: String concatenation
log.debug('User ID: ' + userId + ', Name: ' + userName);

// ✅ GOOD: Structured object
log.debug('User details', { userId, userName });
```

### 2. Extract Error Messages
```javascript
// ❌ BAD: Logging entire error object
log.error('Database error', { error });

// ✅ GOOD: Extract message for cleaner logs
log.error('Database error', { error: error.message });
```

### 3. Include Context
```javascript
// ❌ BAD: Vague message
log.error('Update failed');

// ✅ GOOD: Specific with context
log.error('Member update failed', {
  memberId: req.params.id,
  error: error.message
});
```

### 4. Choose Appropriate Level
```javascript
// ❌ BAD: Using debug for errors
log.debug('Payment failed', { error: error.message });

// ✅ GOOD: Use error level for failures
log.error('Payment processing failed', {
  paymentId: payment.id,
  error: error.message
});
```

### 5. Avoid Logging Sensitive Data
```javascript
// ❌ BAD: Logging passwords
log.debug('Login attempt', { email, password });

// ✅ GOOD: Omit sensitive data
log.debug('Login attempt', { email });

// ❌ BAD: Logging full tokens
log.debug('Token received', { token });

// ✅ GOOD: Log partial or metadata only
log.debug('Token received', { tokenLength: token.length });
```

---

## Common Patterns

### Pattern 1: Try-Catch Error Handling
```javascript
export const someController = async (req, res) => {
  try {
    log.http('Request received', { endpoint: req.path });

    // Your logic here
    const result = await someOperation();

    log.info('Operation successful', { resultId: result.id });
    res.json({ success: true, data: result });

  } catch (error) {
    log.error('Operation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Operation failed'
    });
  }
};
```

### Pattern 2: Database Operations
```javascript
async function fetchMembers() {
  try {
    log.db('Fetching members', 'members', 0);

    const { data: members, error } = await supabase
      .from('members')
      .select('*');

    if (error) {
      log.error('Database query failed', {
        error: error.message,
        table: 'members'
      });
      throw error;
    }

    log.debug('Members fetched', { count: members.length });
    return members;

  } catch (error) {
    log.error('Fetch members failed', { error: error.message });
    throw error;
  }
}
```

### Pattern 3: Authentication Flow
```javascript
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    log.auth('Auth request', req.path, !!token);

    if (!token) {
      log.warn('No token provided', { path: req.path });
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    log.auth('Login', decoded.id, true);

    req.user = decoded;
    next();

  } catch (error) {
    log.auth('Auth failed', req.path, false);
    log.error('Token verification failed', { error: error.message });

    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### Pattern 4: External API Calls
```javascript
async function fetchExternalData() {
  const startTime = Date.now();

  try {
    log.debug('Calling external API', { endpoint: '/api/data' });

    const response = await fetch('https://api.example.com/data');
    const duration = Date.now() - startTime;

    log.api('GET', '/api/data', response.status, duration);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    return await response.json();

  } catch (error) {
    const duration = Date.now() - startTime;
    log.api('GET', '/api/data', 'ERROR', duration);
    log.error('External API failed', { error: error.message });
    throw error;
  }
}
```

---

## Log File Locations

Winston automatically writes logs to the following locations:

```
logs/
├── combined.log    # All log levels
├── error.log       # Error level only
└── *.log           # Rotated files (when reaching 5MB)
```

### File Rotation
- Maximum file size: **5 MB**
- Maximum files kept: **5 files**
- Older files are automatically deleted

---

## Environment-Based Behavior

### Development Environment (`NODE_ENV=development`)
- **Console Output**: ✅ Enabled (color-coded)
- **File Output**: ✅ Enabled
- **Debug Logs**: ✅ Shown
- **Log Level**: `debug` (all logs visible)

### Production Environment (`NODE_ENV=production`)
- **Console Output**: ✅ Enabled (no colors)
- **File Output**: ✅ Enabled
- **Debug Logs**: ❌ Hidden (performance)
- **Log Level**: `info` (info, warn, error only)

---

## Migration Checklist

When replacing console statements with Winston logger:

- [ ] Import logger: `import { log } from '../utils/logger.js';`
- [ ] Replace `console.log()` → `log.debug()` or `log.info()`
- [ ] Replace `console.error()` → `log.error()`
- [ ] Replace `console.warn()` → `log.warn()`
- [ ] Convert string concatenation to structured objects
- [ ] Extract error messages: `error.message` instead of full error
- [ ] Add contextual metadata for debugging
- [ ] Test in both dev and production modes

---

## Quick Reference Table

| Old Code | New Code | When to Use |
|----------|----------|-------------|
| `console.log('message')` | `log.info('message')` | Important events |
| `console.log('debug:', data)` | `log.debug('debug', { data })` | Debugging only |
| `console.error('error:', err)` | `log.error('error', { error: err.message })` | Errors/exceptions |
| `console.warn('warning')` | `log.warn('warning')` | Warnings/alerts |
| N/A | `log.http('Request received')` | HTTP requests |
| N/A | `log.auth('Login', user, true)` | Auth events |
| N/A | `log.db('SELECT', 'users', 50)` | DB operations |
| N/A | `log.api('GET', '/data', 200, 123)` | External APIs |

---

## Example: Before & After

### Before (Console Logging)
```javascript
export const getMemberById = async (req, res) => {
  try {
    console.log('Fetching member:', req.params.id);

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    if (!member) {
      console.warn('Member not found:', req.params.id);
      return res.status(404).json({ error: 'Member not found' });
    }

    console.log('Member found:', member.id, member.full_name);
    res.json({ success: true, data: member });

  } catch (error) {
    console.error('Exception:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

### After (Winston Logger)
```javascript
import { log } from '../utils/logger.js';

export const getMemberById = async (req, res) => {
  try {
    log.debug('Fetching member', { memberId: req.params.id });

    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      log.error('Database query failed', {
        error: error.message,
        memberId: req.params.id
      });
      throw error;
    }

    if (!member) {
      log.warn('Member not found', { memberId: req.params.id });
      return res.status(404).json({ error: 'Member not found' });
    }

    log.info('Member retrieved successfully', {
      memberId: member.id,
      memberName: member.full_name
    });

    res.json({ success: true, data: member });

  } catch (error) {
    log.error('Get member failed', {
      memberId: req.params.id,
      error: error.message
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

---

## Support

For questions or issues with the logger:
1. Check this guide first
2. Review existing implementations in:
   - `src/middleware/auth.js`
   - `src/controllers/dashboardController.js`
   - `src/controllers/paymentsController.js`
3. Refer to Winston documentation: https://github.com/winstonjs/winston

---

**Generated**: October 9, 2025
**Version**: 1.0.0
**Branch**: code-quality-improvements
