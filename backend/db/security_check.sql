-- Security Check: Verify tenant isolation is properly configured
-- Run this to check if all tables have tenant_id columns and indexes

-- Check if tenant_id columns exist
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'tenant_id'
ORDER BY table_name;

-- Check if tenant_id indexes exist
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%tenant%'
ORDER BY tablename, indexname;

-- Check if RLS is enabled (if you've run rls_policies.sql)
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('vessels', 'vessel_position_history', 'vessel_customer_associations', 'vessel_agent_associations')
ORDER BY tablename;

