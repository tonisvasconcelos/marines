-- Initialize database schema
-- Run this script to create all necessary tables
-- Usage: psql $DATABASE_URL -f backend/db/init.sql
-- Or execute via your database client

\i schema.sql
\i rls_policies.sql
\i seeds.sql

