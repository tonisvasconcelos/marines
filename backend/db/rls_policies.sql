-- Row-Level Security (RLS) Policies for Multi-Tenant Data Isolation
-- This ensures that even if application code has bugs, database-level security prevents data leakage
-- 
-- IMPORTANT: This is a critical security feature for SaaS applications
-- Run this after creating the tables (schema.sql)

-- Enable Row-Level Security on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessels ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_position_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_customer_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vessel_agent_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE port_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create a function to get the current tenant ID from the application context
-- This function will be called by the application using SET LOCAL
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS VARCHAR(255) AS $$
  SELECT current_setting('app.current_tenant_id', true)::VARCHAR(255);
$$ LANGUAGE sql STABLE;

-- Policy: Tenants are isolated by id
CREATE POLICY tenants_isolation ON tenants
  FOR ALL
  USING (id = current_tenant_id())
  WITH CHECK (id = current_tenant_id());

-- Policy: Users are limited to their tenant
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Policy: Refresh tokens per tenant
CREATE POLICY refresh_tokens_isolation ON refresh_tokens
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Policy: Customers per tenant
CREATE POLICY customers_tenant_isolation ON customers
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Policy: Suppliers per tenant
CREATE POLICY suppliers_tenant_isolation ON suppliers
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

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

-- Policy: Port calls per tenant
CREATE POLICY port_calls_tenant_isolation ON port_calls
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Policy: Invoices per tenant
CREATE POLICY invoices_tenant_isolation ON invoices
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Policy: Purchase orders per tenant
CREATE POLICY purchase_orders_tenant_isolation ON purchase_orders
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Policy: Audit logs per tenant
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  FOR ALL
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Note: The application must set the tenant context before executing queries
-- Example: SET LOCAL app.current_tenant_id = 'tenant-1';

