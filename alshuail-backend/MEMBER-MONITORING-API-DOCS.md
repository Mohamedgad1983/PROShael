# Member Monitoring API - Optimized Backend Documentation

## Overview
High-performance member monitoring API with advanced filtering capabilities, optimized for 1000+ members with < 300ms response time.

## Performance Specifications
- **Target Response Time**: < 300ms for all queries
- **Database**: Supabase (PostgreSQL)
- **Supported Members**: 1000+ concurrent
- **Arabic Text Support**: Full RTL and Arabic search
- **Caching**: 5-minute statistics cache

## Quick Start

### 1. Apply Database Optimizations
```bash
cd alshuail-backend
npm run optimize:db
# or manually:
node src/scripts/apply-member-monitoring-optimizations.js
```

### 2. Update Routes
```javascript
// In server.js, add the optimized routes:
import memberMonitoringRoutes from './src/routes/memberMonitoringOptimized.js';
app.use('/api/member-monitoring', memberMonitoringRoutes);
```

## API Endpoints

### 1. Get Member Monitoring Data
```http
GET /api/member-monitoring
```

#### Query Parameters
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `memberId` | string | Member ID search (partial match) | `SH-10001` |
| `fullName` | string | Full name search (Arabic support) | `محمد` |
| `phone` | string | Phone number search | `0501234567` |
| `tribalSection` | string | Tribal section filter | `رشود` |
| `balanceOperator` | string | Balance comparison operator | `compliant`, `<`, `>`, `=`, `between` |
| `balanceAmount` | number | Amount for balance comparison | `3000` |
| `balanceMin` | number | Minimum for range filter | `1000` |
| `balanceMax` | number | Maximum for range filter | `5000` |
| `status` | string | Member status | `active`, `suspended` |
| `page` | number | Page number (default 1) | `1` |
| `limit` | number | Items per page (max 100) | `50` |
| `sortBy` | string | Sort field | `balance`, `full_name` |
| `sortOrder` | string | Sort direction | `asc`, `desc` |

#### Balance Operators
- `compliant`: Balance >= 3000 SAR
- `non-compliant`: Balance < 3000 SAR
- `critical`: Balance < 1000 SAR
- `excellent`: Balance >= 5000 SAR
- `<`, `>`, `=`: Standard comparisons
- `between`: Range filter (use with balanceMin/Max)

#### Response
```json
{
  "success": true,
  "members": [
    {
      "id": "uuid",
      "memberId": "SH-10001",
      "name": "محمد أحمد الشعيل",
      "phone": "0501234567",
      "email": "member@example.com",
      "balance": 4500,
      "tribalSection": "رشود",
      "status": "sufficient",
      "complianceStatus": "compliant",
      "isSuspended": false,
      "joinedDate": "2024-01-01",
      "lastPaymentDate": "2024-12-01"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 299,
    "totalPages": 6,
    "filtered": 28
  },
  "statistics": {
    "total": 299,
    "compliant": 28,
    "nonCompliant": 271,
    "critical": 89,
    "excellent": 12,
    "suspended": 3,
    "averageBalance": 2456.78,
    "totalBalance": 734576.22,
    "complianceRate": 9.4,
    "byTribalSection": {
      "رشود": 146,
      "الدغيش": 38,
      "رشيد": 32
    },
    "balanceRanges": {
      "0-999": 89,
      "1000-2999": 182,
      "3000-4999": 16,
      "5000+": 12
    }
  },
  "performance": {
    "queryTime": "245ms",
    "cached": false
  }
}
```

### 2. Get Dashboard Statistics (Cached)
```http
GET /api/member-monitoring/statistics?refresh=false
```

Returns cached statistics for dashboard widgets. Use `refresh=true` to force refresh.

### 3. Export Members
```http
GET /api/member-monitoring/export
```

Accepts same filters as main endpoint. Returns JSON data formatted for Excel export.

### 4. Search Members (Autocomplete)
```http
GET /api/member-monitoring/search?q=محمد&limit=10
```

Fast autocomplete search for member selection.

### 5. Get Member Details
```http
GET /api/member-monitoring/{memberId}
```

Returns detailed member information with payment history.

### 6. Suspend Member
```http
POST /api/member-monitoring/{memberId}/suspend
```

#### Request Body
```json
{
  "reason": "عدم دفع الاشتراكات لمدة 6 أشهر",
  "adminId": "admin-uuid"
}
```

### 7. Send Notifications
```http
POST /api/member-monitoring/notify
```

#### Request Body
```json
{
  "memberIds": ["uuid1", "uuid2"],
  "type": "payment",
  "title": "تذكير بالدفع",
  "message": "يرجى دفع الاشتراك المستحق",
  "channel": "both"
}
```

## Query Builder Service

### Usage Example
```javascript
import {
  buildMemberMonitoringQuery,
  getMemberStatistics,
  exportMemberData
} from '../services/memberMonitoringQueryService.js';

// Get filtered members
const result = await buildMemberMonitoringQuery({
  tribalSection: 'رشود',
  balanceOperator: 'compliant',
  page: 1,
  limit: 50
});

// Get cached statistics
const stats = await getMemberStatistics();

// Export data
const exportData = await exportMemberData(filters);
```

## Database Optimization

### Applied Indexes
```sql
-- Member table indexes
CREATE INDEX idx_members_membership_number ON members(membership_number);
CREATE INDEX idx_members_full_name ON members(full_name);
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_tribal_section ON members(tribal_section);
CREATE INDEX idx_members_is_suspended ON members(is_suspended);

-- Payment table indexes
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payer_status ON payments(payer_id, status);

-- Full-text search for Arabic
CREATE EXTENSION pg_trgm;
CREATE INDEX idx_members_full_name_trgm
ON members USING gin(full_name gin_trgm_ops);
```

### Performance Monitoring
```sql
-- Check query performance
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
WHERE query LIKE '%members%'
ORDER BY mean_time DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Performance Tips

### 1. Use Pagination
Always paginate results. Max limit is 100 records per page.

### 2. Use Specific Filters
More specific filters = faster queries:
```javascript
// Good - specific filters
?tribalSection=رشود&balanceOperator=compliant&limit=50

// Avoid - fetching all
?limit=1000
```

### 3. Use Statistics Endpoint
For dashboard widgets, use the cached statistics endpoint instead of calculating from raw data.

### 4. Batch Operations
When sending notifications or performing bulk actions, use batch endpoints.

## Error Handling

### Common Error Codes
- `400`: Invalid parameters
- `404`: Member not found
- `500`: Server error

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description"
}
```

## Testing

### Performance Test
```bash
# Run performance tests
node src/scripts/apply-member-monitoring-optimizations.js

# Expected output:
# ✅ Simple member fetch: 45ms
# ✅ Member with payment join: 123ms
# ✅ Text search (Arabic): 67ms
```

### Load Testing
```bash
# Using Apache Bench
ab -n 100 -c 10 http://localhost:5001/api/member-monitoring

# Expected results:
# Time per request: < 300ms
# Failed requests: 0
```

## Tribal Sections
The system supports 8 tribal sections:
1. رشود (Rashoud)
2. الدغيش (Al-Dughaish)
3. رشيد (Rasheed)
4. العيد (Al-Eid)
5. الرشيد (Al-Rasheed)
6. الشبيعان (Al-Shabiaan)
7. المسعود (Al-Masoud)
8. عقاب (Uqab)

## Migration from Old Controller

### Step 1: Update Routes
```javascript
// Old
import { getMemberMonitoring } from './controllers/memberMonitoringController.js';

// New
import memberMonitoringRoutes from './routes/memberMonitoringOptimized.js';
app.use('/api/member-monitoring', memberMonitoringRoutes);
```

### Step 2: Update Frontend Calls
The new API is backward compatible. Just add new filter parameters as needed.

## Support

For issues or questions:
1. Check database indexes are applied
2. Verify Supabase connection
3. Check query performance logs
4. Review this documentation

---

**Performance Guarantee**: All queries optimized for < 300ms response time with 1000+ members.