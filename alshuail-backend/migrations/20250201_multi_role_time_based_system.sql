-- ============================================================================
-- Multi-Role Time-Based Assignment System
-- ============================================================================
-- Purpose: Allow users to have multiple roles with validity periods (Hijri dates)
-- Author: Claude Code
-- Date: 2025-02-01
-- ============================================================================

-- 1. Extend user_role_assignments table with temporal fields
-- ============================================================================

ALTER TABLE IF EXISTS public.user_role_assignments
ADD COLUMN IF NOT EXISTS start_date_gregorian DATE,
ADD COLUMN IF NOT EXISTS end_date_gregorian DATE,
ADD COLUMN IF NOT EXISTS start_date_hijri VARCHAR(20), -- Format: YYYY-MM-DD (Hijri)
ADD COLUMN IF NOT EXISTS end_date_hijri VARCHAR(20),   -- Format: YYYY-MM-DD (Hijri)
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- 2. Create index for efficient active role queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_active_dates
ON public.user_role_assignments(user_id, is_active, start_date_gregorian, end_date_gregorian)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_role
ON public.user_role_assignments(user_id, role_id);

-- 3. Create function to get active roles for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_active_roles(p_user_id UUID, p_check_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  role_id UUID,
  role_name VARCHAR(100),
  role_name_ar VARCHAR(100),
  permissions JSONB,
  priority INTEGER,
  start_date DATE,
  end_date DATE,
  assignment_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ur.id as role_id,
    ur.role_name,
    ur.role_name_ar,
    ur.permissions,
    ur.priority,
    ura.start_date_gregorian as start_date,
    ura.end_date_gregorian as end_date,
    ura.id as assignment_id
  FROM public.user_role_assignments ura
  JOIN public.user_roles ur ON ura.role_id = ur.id
  WHERE ura.user_id = p_user_id
    AND ura.is_active = true
    AND (ura.start_date_gregorian IS NULL OR ura.start_date_gregorian <= p_check_date)
    AND (ura.end_date_gregorian IS NULL OR ura.end_date_gregorian >= p_check_date)
  ORDER BY ur.priority DESC;
END;
$$;

-- 4. Create function to check if user has specific permission
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id UUID,
  p_permission_path TEXT, -- e.g., 'manage_finances', 'all_access'
  p_check_date DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_permission BOOLEAN := false;
  v_role RECORD;
BEGIN
  -- Check all active roles for the user
  FOR v_role IN
    SELECT permissions FROM public.get_active_roles(p_user_id, p_check_date)
  LOOP
    -- Check if permissions JSONB contains the required permission
    IF v_role.permissions ? p_permission_path THEN
      IF (v_role.permissions->p_permission_path)::boolean = true THEN
        v_has_permission := true;
        EXIT; -- Found permission, no need to check further
      END IF;
    END IF;

    -- Check for all_access permission
    IF v_role.permissions ? 'all_access' THEN
      IF (v_role.permissions->'all_access')::boolean = true THEN
        v_has_permission := true;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  RETURN v_has_permission;
END;
$$;

-- 5. Create function to merge permissions from multiple roles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_merged_permissions(p_user_id UUID, p_check_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_merged_permissions JSONB := '{}'::jsonb;
  v_role RECORD;
BEGIN
  -- Get all active roles and merge their permissions
  FOR v_role IN
    SELECT permissions FROM public.get_active_roles(p_user_id, p_check_date)
  LOOP
    -- Merge permissions (later roles override earlier ones due to priority ordering)
    v_merged_permissions := v_merged_permissions || v_role.permissions;
  END LOOP;

  RETURN v_merged_permissions;
END;
$$;

-- 6. Create trigger to update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_user_role_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_role_assignments_updated_at ON public.user_role_assignments;
CREATE TRIGGER trigger_update_user_role_assignments_updated_at
  BEFORE UPDATE ON public.user_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_role_assignments_updated_at();

-- 7. Create view for easy querying of user roles with dates
-- ============================================================================

CREATE OR REPLACE VIEW public.v_user_roles_with_periods AS
SELECT
  ura.id as assignment_id,
  ura.user_id,
  COALESCE(u.email, m.email) as user_email,
  COALESCE(u.full_name, m.full_name) as user_name,
  ur.id as role_id,
  ur.role_name,
  ur.role_name_ar,
  ur.priority,
  ura.start_date_gregorian,
  ura.end_date_gregorian,
  ura.start_date_hijri,
  ura.end_date_hijri,
  ura.is_active,
  ura.notes,
  ura.assigned_at,
  ura.assigned_by,
  COALESCE(assigner_u.full_name, assigner_m.full_name) as assigned_by_name,
  CASE
    WHEN ura.is_active = false THEN 'inactive'
    WHEN ura.start_date_gregorian IS NOT NULL AND ura.start_date_gregorian > CURRENT_DATE THEN 'pending'
    WHEN ura.end_date_gregorian IS NOT NULL AND ura.end_date_gregorian < CURRENT_DATE THEN 'expired'
    ELSE 'active'
  END as status
FROM public.user_role_assignments ura
JOIN public.user_roles ur ON ura.role_id = ur.id
LEFT JOIN public.users u ON ura.user_id = u.id
LEFT JOIN public.members m ON ura.user_id = m.id
LEFT JOIN public.users assigner_u ON ura.assigned_by = assigner_u.id
LEFT JOIN public.members assigner_m ON ura.assigned_by = assigner_m.id;

-- 8. Add RLS policies for role assignments
-- ============================================================================

ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all role assignments
DROP POLICY IF EXISTS super_admin_manage_role_assignments ON public.user_role_assignments;
CREATE POLICY super_admin_manage_role_assignments ON public.user_role_assignments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Users can view their own role assignments
DROP POLICY IF EXISTS users_view_own_role_assignments ON public.user_role_assignments;
CREATE POLICY users_view_own_role_assignments ON public.user_role_assignments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 9. Create audit log entries for role assignment changes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_role_assignment_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      details,
      ip_address
    ) VALUES (
      NEW.assigned_by,
      'role_assigned',
      'user_role_assignment',
      NEW.id::text,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role_id', NEW.role_id,
        'start_date', NEW.start_date_gregorian,
        'end_date', NEW.end_date_gregorian,
        'start_date_hijri', NEW.start_date_hijri,
        'end_date_hijri', NEW.end_date_hijri
      ),
      NULL
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      details,
      ip_address
    ) VALUES (
      NEW.updated_by,
      'role_assignment_updated',
      'user_role_assignment',
      NEW.id::text,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'role_id', NEW.role_id,
        'changes', jsonb_build_object(
          'old_active', OLD.is_active,
          'new_active', NEW.is_active,
          'old_start_date', OLD.start_date_gregorian,
          'new_start_date', NEW.start_date_gregorian,
          'old_end_date', OLD.end_date_gregorian,
          'new_end_date', NEW.end_date_gregorian
        )
      ),
      NULL
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      resource_type,
      resource_id,
      details,
      ip_address
    ) VALUES (
      OLD.assigned_by,
      'role_unassigned',
      'user_role_assignment',
      OLD.id::text,
      jsonb_build_object(
        'user_id', OLD.user_id,
        'role_id', OLD.role_id
      ),
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_role_assignment_change ON public.user_role_assignments;
CREATE TRIGGER trigger_log_role_assignment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_assignment_change();

-- 10. Grant necessary permissions
-- ============================================================================

GRANT SELECT ON public.v_user_roles_with_periods TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_roles(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_permission(UUID, TEXT, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_merged_permissions(UUID, DATE) TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON TABLE public.user_role_assignments IS 'Stores multiple role assignments per user with time-based validity periods using Hijri calendar';
COMMENT ON COLUMN public.user_role_assignments.start_date_gregorian IS 'Role becomes active on this date (Gregorian calendar for efficient queries)';
COMMENT ON COLUMN public.user_role_assignments.end_date_gregorian IS 'Role expires after this date (Gregorian calendar)';
COMMENT ON COLUMN public.user_role_assignments.start_date_hijri IS 'Display-only Hijri date for start (format: YYYY-MM-DD)';
COMMENT ON COLUMN public.user_role_assignments.end_date_hijri IS 'Display-only Hijri date for end (format: YYYY-MM-DD)';
COMMENT ON FUNCTION public.get_active_roles(UUID, DATE) IS 'Returns all active roles for a user on a specific date';
COMMENT ON FUNCTION public.user_has_permission(UUID, TEXT, DATE) IS 'Checks if user has a specific permission through any active role';
COMMENT ON FUNCTION public.get_merged_permissions(UUID, DATE) IS 'Returns merged permissions from all active roles';
