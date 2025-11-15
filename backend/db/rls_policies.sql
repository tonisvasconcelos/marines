-- Row-Level Security (RLS) Policies for Multi-Tenant Data Isolation
-- This ensures that even if application code has bugs, database-level security prevents data leakage
-- 
-- IMPORTANT: This is a critical security feature for SaaS applications
-- Run this after creating the tables (schema.sql)

-- Enable Row-Level Security on all tenant-scoped tables
ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_position_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_customer_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_agent_associations ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current tenant ID from the application context
-- This function will be called by the application using SET LOCAL
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS VARCHAR(255) AS $$
  SELECT current_setting('app.current_tenant_id', true)::VARCHAR(255);
$$ LANGUAGE sql STABLE;

-- Policy: Users can only SELECT vessels from their own tenant
CREATE POLICY vessels_tenant_isolation ON vessels
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Policy: Users can only SELECT position history from their own tenant
CREATE POLICY position_history_tenant_isolation ON vessel_position_history
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Policy: Users can only access associations from their own tenant
CREATE POLICY vessel_customer_associations_tenant_isolation ON vessel_customer_associations
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY vessel_agent_associations_tenant_isolation ON vessel_agent_associations
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Note: The application must set the tenant context before executing queries
-- Example: SET LOCAL app.current_tenant_id = 'tenant-1';
-- 
-- However, with connection pooling, we'll use application-level filtering instead
-- RLS policies above provide defense-in-depth but require careful connection management
-- 
-- For now, we rely on application-level filtering (WHERE tenant_id = $1) which is safer
-- with connection pooling. RLS can be enabled later if needed.

