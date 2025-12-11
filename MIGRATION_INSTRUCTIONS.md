# Database Migration Instructions

## Running Migrations After Railway Deployment

After Railway finishes deploying, you need to run the database migrations to create the `ports`, `fleets`, and `fleet_vessels` tables.

### Option 1: Run via Railway CLI (Recommended)

If you have Railway CLI installed:

```bash
railway run node backend/db/runMigrations.js
```

This will automatically use the DATABASE_URL from your Railway project.

### Option 2: Run Locally with Railway DATABASE_URL

1. **Get your DATABASE_URL from Railway:**
   - Go to your Railway project dashboard
   - Click on your PostgreSQL service
   - Copy the `DATABASE_URL` connection string

2. **Run the migration:**

   **Windows PowerShell:**
   ```powershell
   $env:DATABASE_URL="your-railway-database-url"
   cd backend
   node db/runMigrations.js
   ```

   **Linux/Mac:**
   ```bash
   export DATABASE_URL="your-railway-database-url"
   cd backend
   node db/runMigrations.js
   ```

   **One-liner (Windows PowerShell):**
   ```powershell
   $env:DATABASE_URL="your-railway-database-url"; cd backend; node db/runMigrations.js
   ```

### Option 3: Run SQL Directly via Railway Database Dashboard

1. Go to Railway → Your PostgreSQL service → Query tab
2. Run the SQL from `backend/db/migrations/001_add_ops_sites_fields_to_ports.sql`

Or use Railway's built-in SQL editor to run:

```sql
-- Create ports table (if not exists)
CREATE TABLE IF NOT EXISTS ports (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  port_id VARCHAR(255),
  unlocode VARCHAR(10),
  code VARCHAR(50),
  name TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'PORT',
  country_code VARCHAR(5),
  timezone VARCHAR(50),
  lat DECIMAL(10, 8),
  lon DECIMAL(11, 8),
  polygon JSONB,
  parent_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ports_tenant_id ON ports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ports_unlocode ON ports(unlocode);
CREATE INDEX IF NOT EXISTS idx_ports_port_id ON ports(port_id);
CREATE INDEX IF NOT EXISTS idx_ports_code ON ports(code);
CREATE INDEX IF NOT EXISTS idx_ports_type ON ports(type);
CREATE INDEX IF NOT EXISTS idx_ports_parent_code ON ports(parent_code);

-- Create fleets table
CREATE TABLE IF NOT EXISTS fleets (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fleets_tenant_id ON fleets(tenant_id);

-- Create fleet_vessels junction table
CREATE TABLE IF NOT EXISTS fleet_vessels (
  id VARCHAR(255) PRIMARY KEY,
  fleet_id VARCHAR(255) NOT NULL REFERENCES fleets(id) ON DELETE CASCADE,
  vessel_id VARCHAR(255) NOT NULL REFERENCES vessels(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fleet_id, vessel_id, tenant_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fleet_vessels_fleet_id ON fleet_vessels(fleet_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vessels_vessel_id ON fleet_vessels(vessel_id);
CREATE INDEX IF NOT EXISTS idx_fleet_vessels_tenant_id ON fleet_vessels(tenant_id);

-- Add Ops Sites fields to ports table (if columns don't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='ports' AND column_name='code') THEN
    ALTER TABLE ports ADD COLUMN code VARCHAR(50);
    CREATE INDEX IF NOT EXISTS idx_ports_code ON ports(code);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='ports' AND column_name='type') THEN
    ALTER TABLE ports ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'PORT';
    CREATE INDEX IF NOT EXISTS idx_ports_type ON ports(type);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='ports' AND column_name='polygon') THEN
    ALTER TABLE ports ADD COLUMN polygon JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='ports' AND column_name='parent_code') THEN
    ALTER TABLE ports ADD COLUMN parent_code VARCHAR(50);
    CREATE INDEX IF NOT EXISTS idx_ports_parent_code ON ports(parent_code);
  END IF;

  UPDATE ports SET code = unlocode WHERE code IS NULL AND unlocode IS NOT NULL;
END $$;
```

## Verify Migration Success

After running migrations, verify the tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ports', 'fleets', 'fleet_vessels')
ORDER BY table_name;
```

You should see all three tables listed.

## What Gets Created

- ✅ `ports` table - Stores Ops Sites/Zones (PORT, TERMINAL, BERTH, ANCHORED_ZONE)
- ✅ `fleets` table - Stores fleet information
- ✅ `fleet_vessels` table - Junction table linking vessels to fleets
- ✅ All necessary indexes for performance

## Troubleshooting

### Error: "relation 'tenants' does not exist"
This means the base schema hasn't been run yet. Run `backend/db/schema.sql` first, or ensure your Railway database has the base tables created.

### Error: "column already exists"
This is normal - the migration uses `IF NOT EXISTS` and `DO $$` blocks to safely handle existing columns. The migration will skip columns that already exist.

### Error: "connection refused" or "ECONNREFUSED"
- Check that your DATABASE_URL is correct
- Verify Railway PostgreSQL service is running
- Check that your IP is allowed (if using IP restrictions)

