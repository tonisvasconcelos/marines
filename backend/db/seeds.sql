-- Seed data for local/stage environments
-- Safe to re-run; uses ON CONFLICT DO NOTHING

INSERT INTO tenants (id, name, slug, default_locale, default_country_code)
VALUES ('tenant-1', 'Demo Shipping Agency', 'demo', 'pt-BR', 'BR')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, tenant_id, email, password_hash, name, role)
VALUES (
  'user-1',
  'tenant-1',
  'demo@marines.app',
  '$2a$10$RxWbhMNJrpFY.mQCgisLCONxJxQ/sfXspX0SujuZKTVJZNRQ0bEFy', -- demo123
  'Demo User',
  'ADMIN'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, tenant_id, name, contact_email)
VALUES ('customer-1', 'tenant-1', 'Demo Vessel Owner', 'owner@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO suppliers (id, tenant_id, name, contact_email)
VALUES ('supplier-1', 'tenant-1', 'Demo Supplier', 'supplier@example.com')
ON CONFLICT (id) DO NOTHING;

