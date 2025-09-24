# Supabase MCP Integration Setup ✅

## Overview
The Supabase MCP (Model Context Protocol) server has been successfully configured for the Al-Shuail Family Management System. This allows direct database access through Claude Code.

## Connection Details
- **Project Reference**: `oneiggrfzagqjbkdinin`
- **Project URL**: `https://oneiggrfzagqjbkdinin.supabase.co`
- **MCP Server**: `@supabase-community/supabase-mcp`

## What Was Configured

### 1. MCP Server Added
The Supabase MCP server has been added to your Claude configuration with:
- Full feature access enabled
- Service token configured for authentication
- Direct database connectivity

### 2. Backend Configuration Files Created

#### `/alshuail-backend/.env.example`
Template file with all required environment variables for Supabase connection.

#### `/alshuail-backend/src/config/supabase.js`
Complete Supabase configuration with:
- Client initialization (public and admin)
- Database helper functions
- Table definitions
- Connection testing

#### `/alshuail-backend/test-supabase-connection.js`
Test script to verify database connectivity.

## How to Use

### 1. Set Up Environment Variables
Create a `.env` file in the backend directory:
```bash
cd alshuail-backend
cp .env.example .env
```

Then add your actual Supabase keys:
- `SUPABASE_KEY` - Your project's anon/public key
- `SUPABASE_SERVICE_KEY` - Your project's service role key (for backend operations)

### 2. Test the Connection
```bash
cd alshuail-backend
node test-supabase-connection.js
```

### 3. Use in Your Application

#### Import the configuration:
```javascript
import { supabase, supabaseAdmin, TABLES, dbHelpers } from './config/supabase.js';
```

#### Example operations:
```javascript
// Get all members
const members = await dbHelpers.getAll(TABLES.MEMBERS);

// Create a new member
const newMember = await dbHelpers.create(TABLES.MEMBERS, {
  name: 'أحمد الشعيل',
  email: 'ahmad@alshuail.com',
  phone: '0551234567'
});

// Search with filters
const results = await dbHelpers.search(TABLES.MEMBERS, {
  name: { like: 'أحمد' }
}, {
  limit: 10,
  orderBy: 'created_at'
});
```

## Database Tables
The following tables are configured for the system:
- `members` - Family members
- `users` - System users with login credentials
- `roles` - RBAC roles
- `permissions` - System permissions
- `user_roles` - User-role associations
- `role_permissions` - Role-permission associations
- `financial_records` - Financial transactions
- `subscriptions` - Member subscriptions
- `payments` - Payment records
- `occasions` - Family occasions/events
- `initiatives` - Community initiatives
- `diyas` - Diya (compensation) records
- `family_tree` - Family relationships
- `relationships` - Relationship types
- `documents` - Document storage
- `audit_logs` - System audit logs
- `registration_tokens` - Member registration tokens

## MCP Commands Available
With the Supabase MCP server configured, you can now use direct database commands in Claude Code:
- Query tables directly
- Create and modify database schemas
- Manage data without writing API endpoints first
- Test queries before implementing them in code

## Security Notes
- **Never commit** `.env` files with actual keys to version control
- Use **service role key** only on the backend (never expose to frontend)
- Use **anon/public key** for frontend applications
- Enable **Row Level Security (RLS)** on all tables in production

## Troubleshooting

### MCP Server Not Responding
1. Check if the server is running:
   ```bash
   claude mcp list
   ```

2. Restart Claude Code application

3. Re-add the server if needed:
   ```bash
   claude mcp remove supabase
   # Then re-add using the command from Subbaseconnect.txt
   ```

### Database Connection Failed
1. Verify your Supabase project is active
2. Check that keys in `.env` are correct
3. Ensure your IP is not blocked in Supabase dashboard
4. Check Supabase service status

## Next Steps
1. ✅ MCP server configured
2. ✅ Backend configuration files created
3. ⏳ Add actual Supabase keys to `.env`
4. ⏳ Create database migrations
5. ⏳ Implement RBAC tables in Supabase
6. ⏳ Connect frontend to Supabase APIs

## Support
- [Supabase Documentation](https://supabase.com/docs)
- [MCP Documentation](https://github.com/supabase-community/supabase-mcp)
- Project Dashboard: `https://app.supabase.com/project/oneiggrfzagqjbkdinin`