-- 🔐 Al-Shuail RBAC System Database Schema
-- Complete Role-Based Access Control Implementation

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS user_role_assignments CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;

-- ==========================================
-- USER ROLES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name VARCHAR(50) UNIQUE NOT NULL,
  role_name_ar VARCHAR(100) NOT NULL, -- Arabic name
  role_description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 0, -- Role priority for conflict resolution
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_user_roles_role_name ON user_roles(role_name);
CREATE INDEX idx_user_roles_is_active ON user_roles(is_active);

-- ==========================================
-- PERMISSIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_name VARCHAR(100) UNIQUE NOT NULL,
  module VARCHAR(50) NOT NULL, -- members, financial, family_tree, occasions, initiatives, diyas
  action VARCHAR(50) NOT NULL, -- view, create, edit, delete, manage
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create composite index for module-action lookups
CREATE INDEX idx_permissions_module_action ON permissions(module, action);

-- ==========================================
-- ROLE PERMISSIONS MAPPING TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID, -- References users table
  UNIQUE(role_id, permission_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ==========================================
-- USER ROLE ASSIGNMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References users table
  role_id UUID NOT NULL REFERENCES user_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID, -- References users table
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role_id)
);

-- Create indexes
CREATE INDEX idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_is_active ON user_role_assignments(is_active);

-- ==========================================
-- ADD ROLE COLUMN TO EXISTING USERS TABLE
-- ==========================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS primary_role_id UUID REFERENCES user_roles(id),
ADD COLUMN IF NOT EXISTS role_assigned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS role_assigned_by UUID;

-- ==========================================
-- INSERT THE 5 CORE ROLES
-- ==========================================
INSERT INTO user_roles (role_name, role_name_ar, role_description, permissions, priority) VALUES
-- 1. SUPER ADMIN
('super_admin', 'المدير الأعلى',
 'Full system access - can view all member data and manage entire system',
 '{
   "all_access": true,
   "members": {"view_all": true, "create": true, "edit_all": true, "delete": true, "export_data": true},
   "system": {"settings": true, "user_management": true, "role_assignment": true, "audit_logs": true, "backup_restore": true},
   "financial": {"full_access": true},
   "family_tree": {"full_access": true},
   "occasions": {"full_access": true},
   "initiatives": {"full_access": true},
   "diyas": {"full_access": true}
 }',
 100),

-- 2. FINANCIAL MANAGER
('financial_manager', 'المدير المالي',
 'Financial effectiveness, collection, and subscription follow-up ONLY',
 '{
   "financial": {
     "subscriptions": {"view_all": true, "create_plans": true, "edit_plans": true, "assign_to_members": true, "track_payments": true},
     "payments": {"view_all_financial": true, "record_payments": true, "generate_receipts": true, "payment_reminders": true, "collection_tracking": true},
     "reports": {"create": true, "view_all": true, "export": true}
   },
   "members": {"view_financial_only": true, "no_personal_data": true},
   "restricted_modules": ["family_tree", "occasions", "initiatives", "diyas", "system_settings"]
 }',
 80),

-- 3. FAMILY TREE ADMIN
('family_tree_admin', 'مدير شجرة العائلة',
 'Family tree management ONLY',
 '{
   "family_tree": {
     "view_full_tree": true,
     "add_members": true,
     "edit_relationships": true,
     "delete_relationships": true,
     "modify_tree_structure": true,
     "upload_family_photos": true,
     "manage_generations": true
   },
   "members": {"view_tree_related_only": true, "edit_tree_fields": true, "no_personal_data": true},
   "restricted_modules": ["financial", "occasions", "initiatives", "diyas", "system_settings"]
 }',
 70),

-- 4. OCCASIONS & INITIATIVES & DIYAS ADMIN
('occasions_initiatives_diyas_admin', 'مدير المناسبات والمبادرات والديات',
 'Combined management of Occasions, Initiatives, and Diyas ONLY',
 '{
   "occasions": {
     "view_all": true,
     "create_events": true,
     "edit_events": true,
     "delete_events": true,
     "manage_rsvp": true,
     "event_planning": true
   },
   "initiatives": {
     "view_all": true,
     "create_initiatives": true,
     "edit_initiatives": true,
     "delete_initiatives": true,
     "manage_donations": true,
     "track_progress": true,
     "volunteer_coordination": true
   },
   "diyas": {
     "view_all": true,
     "create_diya_cases": true,
     "edit_diya_records": true,
     "delete_diya_cases": true,
     "manage_compensation": true,
     "track_payments": true,
     "mediation_records": true
   },
   "members": {"view_participants_only": true, "send_invitations": true, "no_personal_data": true},
   "restricted_modules": ["family_tree", "financial_subscriptions", "financial_payments", "system_settings"]
 }',
 60),

-- 5. USER MEMBER
('user_member', 'عضو عادي',
 'Personal data and profile ONLY',
 '{
   "personal_profile": {
     "view_own_data": true,
     "edit_own_data": true,
     "upload_own_photo": true,
     "update_contact_info": true,
     "change_password": true
   },
   "family_tree": {"view_own_position": true, "view_immediate_family": true},
   "financial": {"view_own_payments": true, "view_own_subscriptions": true, "make_payments": true},
   "occasions": {"view_invited_events": true, "rsvp_to_events": true},
   "initiatives": {"view_public_initiatives": true, "volunteer_signup": true, "make_donations": true},
   "diyas": {"view_own_cases": true, "submit_requests": true},
   "restrictions": {"no_admin_functions": true, "no_view_other_members": true, "no_system_access": true}
 }',
 10);

-- ==========================================
-- INSERT GRANULAR PERMISSIONS
-- ==========================================

-- Members Module Permissions
INSERT INTO permissions (permission_name, module, action, description) VALUES
('members.view_all', 'members', 'view_all', 'View all members data'),
('members.view_own', 'members', 'view_own', 'View own member data'),
('members.create', 'members', 'create', 'Create new members'),
('members.edit_all', 'members', 'edit_all', 'Edit all members'),
('members.edit_own', 'members', 'edit_own', 'Edit own member data'),
('members.delete', 'members', 'delete', 'Delete members'),
('members.export', 'members', 'export', 'Export member data');

-- Financial Module Permissions
INSERT INTO permissions (permission_name, module, action, description) VALUES
('financial.view_all', 'financial', 'view_all', 'View all financial data'),
('financial.view_own', 'financial', 'view_own', 'View own financial data'),
('financial.manage_subscriptions', 'financial', 'manage_subscriptions', 'Manage subscriptions'),
('financial.record_payments', 'financial', 'record_payments', 'Record payments'),
('financial.generate_reports', 'financial', 'generate_reports', 'Generate financial reports'),
('financial.send_reminders', 'financial', 'send_reminders', 'Send payment reminders');

-- Family Tree Module Permissions
INSERT INTO permissions (permission_name, module, action, description) VALUES
('family_tree.view_full', 'family_tree', 'view_full', 'View full family tree'),
('family_tree.view_own', 'family_tree', 'view_own', 'View own position in tree'),
('family_tree.manage', 'family_tree', 'manage', 'Manage family tree structure'),
('family_tree.edit_relationships', 'family_tree', 'edit_relationships', 'Edit family relationships');

-- Occasions Module Permissions
INSERT INTO permissions (permission_name, module, action, description) VALUES
('occasions.view_all', 'occasions', 'view_all', 'View all occasions'),
('occasions.view_invited', 'occasions', 'view_invited', 'View invited occasions only'),
('occasions.create', 'occasions', 'create', 'Create occasions'),
('occasions.edit', 'occasions', 'edit', 'Edit occasions'),
('occasions.delete', 'occasions', 'delete', 'Delete occasions'),
('occasions.manage_rsvp', 'occasions', 'manage_rsvp', 'Manage RSVPs');

-- Initiatives Module Permissions
INSERT INTO permissions (permission_name, module, action, description) VALUES
('initiatives.view_all', 'initiatives', 'view_all', 'View all initiatives'),
('initiatives.view_public', 'initiatives', 'view_public', 'View public initiatives'),
('initiatives.create', 'initiatives', 'create', 'Create initiatives'),
('initiatives.edit', 'initiatives', 'edit', 'Edit initiatives'),
('initiatives.delete', 'initiatives', 'delete', 'Delete initiatives'),
('initiatives.manage_donations', 'initiatives', 'manage_donations', 'Manage donations');

-- Diyas Module Permissions
INSERT INTO permissions (permission_name, module, action, description) VALUES
('diyas.view_all', 'diyas', 'view_all', 'View all diya cases'),
('diyas.view_own', 'diyas', 'view_own', 'View own diya cases'),
('diyas.create', 'diyas', 'create', 'Create diya cases'),
('diyas.edit', 'diyas', 'edit', 'Edit diya cases'),
('diyas.delete', 'diyas', 'delete', 'Delete diya cases'),
('diyas.manage_compensation', 'diyas', 'manage_compensation', 'Manage compensation');

-- System Module Permissions
INSERT INTO permissions (permission_name, module, action, description) VALUES
('system.manage_users', 'system', 'manage_users', 'Manage system users'),
('system.manage_roles', 'system', 'manage_roles', 'Manage roles and permissions'),
('system.view_audit_logs', 'system', 'view_audit_logs', 'View system audit logs'),
('system.manage_settings', 'system', 'manage_settings', 'Manage system settings'),
('system.backup_restore', 'system', 'backup_restore', 'Backup and restore system');

-- ==========================================
-- CREATE OCCASIONS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS occasions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  occasion_type VARCHAR(50), -- wedding, celebration, meeting, etc.
  date_hijri VARCHAR(20),
  date_gregorian DATE,
  location TEXT,
  max_attendees INTEGER,
  rsvp_deadline DATE,
  is_public BOOLEAN DEFAULT false,
  tags TEXT[],
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- CREATE INITIATIVES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  initiative_type VARCHAR(50), -- charity, community_service, etc.
  goal_amount DECIMAL(10,2),
  raised_amount DECIMAL(10,2) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  volunteers_needed INTEGER,
  current_volunteers INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- CREATE DIYAS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS diyas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_title VARCHAR(255) NOT NULL,
  description TEXT,
  case_type VARCHAR(50), -- accident, dispute, compensation
  incident_date DATE,
  compensation_amount DECIMAL(10,2),
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending, partial, completed
  involved_parties JSONB,
  resolution_date DATE,
  mediator_id UUID,
  documents TEXT[],
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- CREATE AUDIT LOG TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE occasions ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE diyas ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;

-- Super Admin: Full access to everything
CREATE POLICY super_admin_all_access ON members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.role_name = 'super_admin'
    AND ura.is_active = true
  )
);

-- Financial Manager: Financial data only
CREATE POLICY financial_manager_payments_access ON payments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.role_name IN ('financial_manager', 'super_admin')
    AND ura.is_active = true
  )
);

-- Family Tree Admin: Tree relationships only
CREATE POLICY tree_admin_relationships_access ON family_relationships
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.role_name IN ('family_tree_admin', 'super_admin')
    AND ura.is_active = true
  )
);

-- Occasions/Initiatives/Diyas Admin: Three modules access
CREATE POLICY occasions_admin_access ON occasions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.role_name IN ('occasions_initiatives_diyas_admin', 'super_admin')
    AND ura.is_active = true
  )
);

-- User Member: Own data only
CREATE POLICY user_member_own_data ON members
FOR SELECT
USING (
  id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN user_roles ur ON ura.role_id = ur.id
    WHERE ura.user_id = auth.uid()
    AND ur.role_name = 'super_admin'
    AND ura.is_active = true
  )
);

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION has_permission(
  p_user_id UUID,
  p_permission_name VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN role_permissions rp ON ura.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ura.user_id = p_user_id
    AND ura.is_active = true
    AND p.permission_name = p_permission_name
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TABLE(role_name VARCHAR(50), role_name_ar VARCHAR(100), permissions JSONB) AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role_name, ur.role_name_ar, ur.permissions
  FROM user_role_assignments ura
  JOIN user_roles ur ON ura.role_id = ur.id
  WHERE ura.user_id = p_user_id
  AND ura.is_active = true
  ORDER BY ur.priority DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- TRIGGERS
-- ==========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_occasions_updated_at BEFORE UPDATE ON occasions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_initiatives_updated_at BEFORE UPDATE ON initiatives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diyas_updated_at BEFORE UPDATE ON diyas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SAMPLE DATA FOR TESTING
-- ==========================================

-- Create test users with different roles (commented out - uncomment to use)
/*
-- Super Admin user
INSERT INTO users (email, phone, password_hash, is_active)
VALUES ('admin@alshuail.com', '0551234567', '$2b$10$...', true)
RETURNING id INTO v_admin_id;

INSERT INTO user_role_assignments (user_id, role_id)
SELECT v_admin_id, id FROM user_roles WHERE role_name = 'super_admin';

-- Financial Manager user
INSERT INTO users (email, phone, password_hash, is_active)
VALUES ('finance@alshuail.com', '0552345678', '$2b$10$...', true)
RETURNING id INTO v_finance_id;

INSERT INTO user_role_assignments (user_id, role_id)
SELECT v_finance_id, id FROM user_roles WHERE role_name = 'financial_manager';
*/

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX idx_occasions_date_gregorian ON occasions(date_gregorian);
CREATE INDEX idx_occasions_created_by ON occasions(created_by);
CREATE INDEX idx_initiatives_status ON initiatives(status);
CREATE INDEX idx_initiatives_created_by ON initiatives(created_by);
CREATE INDEX idx_diyas_payment_status ON diyas(payment_status);
CREATE INDEX idx_diyas_created_by ON diyas(created_by);

-- ==========================================
COMMENT ON SCHEMA public IS 'Al-Shuail Family Management System RBAC Schema';