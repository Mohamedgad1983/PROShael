# 🔐 CORRECTED Al-Shuail RBAC System
## Critical Role-Based Access Control - Final Version

---

## 👑 **CORRECTED ROLE DEFINITIONS**

### **1. SUPER ADMIN (المدير الأعلى)**
**UNIQUE POWERS:**
- ✅ **View ALL members' data** (ONLY role with this power)
- ✅ **System-wide settings and configuration**
- ✅ **User role assignment and management**
- ✅ **Audit log access and monitoring**
- ✅ **All system modules access**

```javascript
const SUPER_ADMIN_PERMISSIONS = {
  members: {
    view_all: true,        // ONLY Super Admin can see all member data
    create: true,
    edit_all: true,
    delete: true,
    export_data: true
  },
  
  system: {
    settings: true,
    user_management: true,
    role_assignment: true,
    audit_logs: true,
    backup_restore: true
  },
  
  all_modules: true  // Access to everything
};
```

### **2. FINANCIAL MANAGER (المدير المالي)**
**SCOPE:** Financial effectiveness, collection, and subscription follow-up ONLY

```javascript
const FINANCIAL_MANAGER_PERMISSIONS = {
  // FINANCIAL POWERS ONLY
  subscriptions: {
    view_all: true,
    create_plans: true,
    edit_plans: true,
    assign_to_members: true,
    track_payments: true
  },
  
  payments: {
    view_all_financial: true,
    record_payments: true,
    generate_receipts: true,
    payment_reminders: true,
    collection_tracking: true
  },
  
  financial_reports: {
    create: true,
    view_all: true,
    export: true
  },
  
  // RESTRICTIONS - CANNOT ACCESS:
  members: {
    view_personal_data: false,    // Cannot see member personal info
    view_only_financial: true     // Can only see payment status/amounts
  },
  
  family_tree: false,             // NO access to family tree
  occasions: false,               // NO access to occasions
  initiatives: false,             // NO access to initiatives  
  diyas: false,                   // NO access to diyas
  system_settings: false
};
```

### **3. FAMILY TREE ADMIN (مدير شجرة العائلة)**
**SCOPE:** Family tree management ONLY

```javascript
const FAMILY_TREE_ADMIN_PERMISSIONS = {
  // FAMILY TREE POWERS ONLY
  family_tree: {
    view_full_tree: true,
    add_members: true,
    edit_relationships: true,
    delete_relationships: true,
    modify_tree_structure: true,
    upload_family_photos: true,
    manage_generations: true
  },
  
  // LIMITED MEMBER ACCESS (Tree context only)
  members: {
    view_tree_related_only: true,  // Only name, relationships, basic info
    edit_tree_fields: true,        // Only family relationship fields
    view_personal_data: false      // NO access to personal details
  },
  
  // RESTRICTIONS - CANNOT ACCESS:
  financial_data: false,          // NO financial access
  occasions: false,               // NO occasions access
  initiatives: false,             // NO initiatives access
  diyas: false,                   // NO diyas access
  system_settings: false
};
```

### **4. OCCASIONS & INITIATIVES & DIYAS ADMIN (مدير المناسبات والمبادرات والديات)**
**SCOPE:** Combined management of Occasions, Initiatives, and Diyas ONLY

```javascript
const OCCASIONS_INITIATIVES_DIYAS_ADMIN_PERMISSIONS = {
  // OCCASIONS MANAGEMENT
  occasions: {
    view_all: true,
    create_events: true,
    edit_events: true,
    delete_events: true,
    manage_rsvp: true,
    event_planning: true,
    wedding_arrangements: true,
    celebration_management: true,
    family_gatherings: true
  },
  
  // INITIATIVES MANAGEMENT (Charity & Community Projects)
  initiatives: {
    view_all: true,
    create_initiatives: true,
    edit_initiatives: true,
    delete_initiatives: true,
    manage_donations: true,
    track_progress: true,
    volunteer_coordination: true,
    charity_project_management: true,
    community_service_tracking: true
  },
  
  // DIYAS MANAGEMENT (Traditional Compensation)
  diyas: {
    view_all: true,
    create_diya_cases: true,
    edit_diya_records: true,
    delete_diya_cases: true,
    manage_compensation: true,
    track_payments: true,
    mediation_records: true,
    traditional_dispute_resolution: true,
    family_compensation_tracking: true
  },
  
  // LIMITED MEMBER ACCESS (Event/Initiative context only)
  members: {
    view_participants_only: true,  // Only for event/initiative management
    send_invitations: true,
    view_personal_data: false      // NO access to personal details
  },
  
  // RESTRICTIONS - CANNOT ACCESS:
  family_tree: false,             // NO tree access
  financial_subscriptions: false, // NO subscription access
  financial_payments: false,      // NO payment access (except diyas)
  system_settings: false,         // NO system admin powers
  
  // SPECIFIC NOTIFICATIONS ONLY
  notifications: {
    occasion_invitations: true,
    initiative_updates: true,
    diya_notifications: true,
    event_reminders: true,
    volunteer_coordination: true,
    compensation_alerts: true,
    other_notifications: false
  }
};
```

### **5. USER MEMBER (العضو)**
**SCOPE:** Personal data and profile ONLY

```javascript
const USER_MEMBER_PERMISSIONS = {
  // PERSONAL PROFILE ONLY
  personal_profile: {
    view_own_data: true,
    edit_own_data: true,
    upload_own_photo: true,
    update_contact_info: true,
    change_password: true
  },
  
  // LIMITED ACCESS TO RELEVANT AREAS
  family_tree: {
    view_own_position: true,       // Can see their position in tree
    view_immediate_family: true    // Parents, children, siblings only
  },
  
  financial: {
    view_own_payments: true,       // Only their payment history
    view_own_subscriptions: true,  // Only their subscription status
    make_payments: true            // Can pay their own dues
  },
  
  occasions: {
    view_invited_events: true,     // Can see events they're invited to
    rsvp_to_events: true          // Can respond to invitations
  },
  
  initiatives: {
    view_public_initiatives: true, // Can see community projects
    volunteer_signup: true,        // Can volunteer for initiatives
    make_donations: true           // Can contribute to charity projects
  },
  
  diyas: {
    view_own_cases: true,          // Can see diyas involving them
    submit_requests: true          // Can request mediation
  },
  
  // STRICT RESTRICTIONS
  admin_functions: false,          // NO admin capabilities
  view_other_members: false,       // Cannot see other members' data
  system_access: false             // NO system settings access
};
```

---

## 🛡️ **DATABASE IMPLEMENTATION**

### **Corrected Database Schema:**

```sql
-- User roles table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(50) UNIQUE NOT NULL,
  role_description TEXT,
  permissions JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert the 5 corrected roles
INSERT INTO user_roles (role_name, role_description, permissions) VALUES 
('super_admin', 'المدير الأعلى - صلاحية كاملة', '{"all_modules": true}'),
('financial_manager', 'المدير المالي - المالية فقط', '{"financial_only": true}'),
('family_tree_admin', 'مدير شجرة العائلة - الشجرة فقط', '{"family_tree_only": true}'),
('occasions_initiatives_diyas_admin', 'مدير المناسبات والمبادرات والديات', '{"occasions": true, "initiatives": true, "diyas": true}'),
('user_member', 'عضو عادي - البيانات الشخصية فقط', '{"personal_only": true}');

-- Users table with role assignment
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL REFERENCES user_roles(role_name),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **Row Level Security Policies:**

```sql
-- Super Admin: Full access to everything
CREATE POLICY "super_admin_full_access" ON members
FOR ALL TO authenticated
USING ((SELECT auth.jwt()) ->> 'role' = 'super_admin');

-- Financial Manager: Financial data only
CREATE POLICY "financial_manager_payments_only" ON payments
FOR ALL TO authenticated
USING ((SELECT auth.jwt()) ->> 'role' = 'financial_manager');

CREATE POLICY "financial_manager_subscriptions_only" ON subscriptions
FOR ALL TO authenticated
USING ((SELECT auth.jwt()) ->> 'role' = 'financial_manager');

-- Family Tree Admin: Tree relationships only
CREATE POLICY "tree_admin_family_tree_only" ON family_relationships
FOR ALL TO authenticated
USING ((SELECT auth.jwt()) ->> 'role' = 'family_tree_admin');

-- Occasions/Initiatives/Diyas Admin: Three modules only
CREATE POLICY "occasions_admin_occasions_only" ON occasions
FOR ALL TO authenticated
USING ((SELECT auth.jwt()) ->> 'role' = 'occasions_initiatives_diyas_admin');

CREATE POLICY "occasions_admin_initiatives_only" ON initiatives
FOR ALL TO authenticated
USING ((SELECT auth.jwt()) ->> 'role' = 'occasions_initiatives_diyas_admin');

CREATE POLICY "occasions_admin_diyas_only" ON diyas
FOR ALL TO authenticated
USING ((SELECT auth.jwt()) ->> 'role' = 'occasions_initiatives_diyas_admin');

-- User Member: Own data only
CREATE POLICY "user_member_own_data_only" ON members
FOR SELECT TO authenticated
USING (
  (SELECT auth.jwt()) ->> 'role' = 'user_member'
  AND id = (SELECT auth.uid())
);
```

---

## 🎯 **API ROUTE PROTECTION**

```javascript
// Corrected role-based route protection
const roleProtection = {
  // Super Admin routes
  '/api/admin/members': ['super_admin'],
  '/api/admin/system': ['super_admin'],
  '/api/admin/audit-logs': ['super_admin'],
  
  // Financial Manager routes
  '/api/financial/subscriptions': ['super_admin', 'financial_manager'],
  '/api/financial/payments': ['super_admin', 'financial_manager'],
  '/api/financial/reports': ['super_admin', 'financial_manager'],
  
  // Family Tree Admin routes
  '/api/family-tree/manage': ['super_admin', 'family_tree_admin'],
  '/api/family-tree/relationships': ['super_admin', 'family_tree_admin'],
  
  // Occasions/Initiatives/Diyas Admin routes (COMBINED)
  '/api/occasions/manage': ['super_admin', 'occasions_initiatives_diyas_admin'],
  '/api/initiatives/manage': ['super_admin', 'occasions_initiatives_diyas_admin'],
  '/api/diyas/manage': ['super_admin', 'occasions_initiatives_diyas_admin'],
  
  // User Member routes
  '/api/profile/own': ['super_admin', 'financial_manager', 'family_tree_admin', 'occasions_initiatives_diyas_admin', 'user_member'],
  '/api/profile/view-others': ['super_admin'], // ONLY Super Admin
};
```

---

## 🚨 **CRITICAL IMPLEMENTATION REQUIREMENTS**

### **1. Database Tables Needed:**

```sql
-- Occasions table
CREATE TABLE occasions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  occasion_type VARCHAR(50), -- wedding, celebration, meeting, etc.
  date_hijri VARCHAR(20),
  date_gregorian DATE,
  location TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Initiatives table  
CREATE TABLE initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  initiative_type VARCHAR(50), -- charity, community_service, etc.
  goal_amount DECIMAL(10,2),
  raised_amount DECIMAL(10,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Diyas table
CREATE TABLE diyas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_title VARCHAR(255) NOT NULL,
  description TEXT,
  compensation_amount DECIMAL(10,2),
  payment_status VARCHAR(20) DEFAULT 'pending',
  involved_parties JSONB,
  resolution_date DATE,
  mediator_id UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **2. Frontend Navigation by Role:**

```javascript
const NavigationByRole = {
  super_admin: [
    'dashboard', 'members', 'family-tree', 'financial', 
    'occasions', 'initiatives', 'diyas', 'settings', 'audit'
  ],
  
  financial_manager: [
    'dashboard', 'financial-overview', 'subscriptions', 
    'payments', 'financial-reports'
  ],
  
  family_tree_admin: [
    'dashboard', 'family-tree', 'tree-management', 'relationships'
  ],
  
  occasions_initiatives_diyas_admin: [
    'dashboard', 'occasions', 'initiatives', 'diyas', 
    'events-calendar', 'charity-projects', 'mediation-cases'
  ],
  
  user_member: [
    'dashboard', 'my-profile', 'my-payments', 'family-events', 
    'volunteer-opportunities'
  ]
};
```

---

## ✅ **VALIDATION CHECKLIST**

### **MUST VERIFY:**
- [ ] Financial Manager CANNOT access occasions, initiatives, or diyas
- [ ] Family Tree Admin CANNOT access financial, occasions, initiatives, or diyas  
- [ ] Occasions/Initiatives/Diyas Admin CANNOT access financial or family tree
- [ ] Occasions/Initiatives/Diyas Admin CAN manage all three areas together
- [ ] User Member CANNOT view other members' data
- [ ] ONLY Super Admin can see complete member profiles
- [ ] Database RLS policies enforce role restrictions
- [ ] API routes properly protected by role
- [ ] Frontend components respect role permissions

**This corrected RBAC system combines Occasions, Initiatives, and Diyas under ONE specialized admin role, maintaining proper security isolation between all functional areas.**
