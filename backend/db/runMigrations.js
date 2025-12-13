/**
 * Database Migration Runner
 * Executes SQL migrations against the database
 * 
 * Usage: node backend/db/runMigrations.js
 * Or: npm run migrate (if added to package.json)
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { query, testConnection } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Execute SQL file
 */
async function executeSqlFile(filePath) {
  try {
    console.log(`\n📄 Executing migration: ${filePath}`);
    const sql = readFileSync(filePath, 'utf8');
    
    // Split by semicolons and execute each statement
    // Handle DO $$ blocks specially
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    
    for (const line of sql.split('\n')) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('DO $$')) {
        inDoBlock = true;
        currentStatement = trimmed;
      } else if (inDoBlock) {
        currentStatement += '\n' + line;
        if (trimmed === 'END $$;') {
          statements.push(currentStatement);
          currentStatement = '';
          inDoBlock = false;
        }
      } else if (trimmed && !trimmed.startsWith('--')) {
        currentStatement += (currentStatement ? '\n' : '') + line;
        if (trimmed.endsWith(';')) {
          statements.push(currentStatement);
          currentStatement = '';
        }
      }
    }
    
    if (currentStatement.trim()) {
      statements.push(currentStatement);
    }
    
    let executed = 0;
    for (const statement of statements) {
      const trimmed = statement.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        try {
          await query(trimmed);
          executed++;
        } catch (error) {
          // Ignore "already exists" errors for CREATE TABLE IF NOT EXISTS
          if (error.message?.includes('already exists') || 
              error.code === '42P07' || // duplicate_table
              error.code === '42710') {  // duplicate_object
            console.log(`  ⚠️  Skipped (already exists): ${error.message.split('\n')[0]}`);
          } else {
            console.error(`  ❌ Error: ${error.message}`);
            throw error;
          }
        }
      }
    }
    
    console.log(`  ✅ Executed ${executed} statements`);
    return true;
  } catch (error) {
    console.error(`  ❌ Failed to execute migration: ${error.message}`);
    throw error;
  }
}

/**
 * Run all migrations
 */
async function runMigrations() {
  console.log('🚀 Starting database migrations...\n');
  
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    const connected = await testConnection();
    if (!connected) {
      console.error('❌ Database connection failed. Please check DATABASE_URL environment variable.');
      process.exit(1);
    }
    console.log('✅ Database connection established\n');
    
    // Migration 1: Main schema (creates ports, fleets, fleet_vessels tables)
    // Only run the ports/fleets related parts since other tables may already exist
    console.log('📦 Migration 1: Creating ports and fleets tables...');
    
    // Execute ports table creation
    const portsTableSql = `
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
      CREATE INDEX IF NOT EXISTS idx_ports_tenant_id ON ports(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_ports_unlocode ON ports(unlocode);
      CREATE INDEX IF NOT EXISTS idx_ports_port_id ON ports(port_id);
      CREATE INDEX IF NOT EXISTS idx_ports_code ON ports(code);
      CREATE INDEX IF NOT EXISTS idx_ports_type ON ports(type);
      CREATE INDEX IF NOT EXISTS idx_ports_parent_code ON ports(parent_code);
    `;
    
    await query(portsTableSql);
    console.log('  ✅ Ports table created/verified');
    
    // Execute fleets table creation
    const fleetsTableSql = `
      CREATE TABLE IF NOT EXISTS fleets (
        id VARCHAR(255) PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_fleets_tenant_id ON fleets(tenant_id);
    `;
    
    await query(fleetsTableSql);
    console.log('  ✅ Fleets table created/verified');
    
    // Execute fleet_vessels junction table creation
    const fleetVesselsTableSql = `
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
    `;
    
    await query(fleetVesselsTableSql);
    console.log('  ✅ Fleet_vessels table created/verified');
    
    // Migration 2: Add Ops Sites fields to ports table (if needed)
    console.log('\n📦 Migration 2: Adding Ops Sites fields to ports table...');
    const migration1Path = join(__dirname, 'migrations', '001_add_ops_sites_fields_to_ports.sql');
    await executeSqlFile(migration1Path);
    
    console.log('\n✅ All migrations completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Ports table created/updated with Ops Sites fields');
    console.log('  - Fleets table created');
    console.log('  - Fleet_vessels junction table created');
    console.log('  - All indexes created');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if executed directly
// Check multiple ways to detect if this is the main module
const scriptPath = process.argv[1]?.replace(/\\/g, '/');
const currentUrl = import.meta.url.replace('file:///', '').replace(/\\/g, '/');
const isMainModule = scriptPath?.endsWith('runMigrations.js') || 
                     currentUrl.endsWith('runMigrations.js') ||
                     process.argv[1]?.includes('runMigrations');

if (isMainModule) {
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.error('\n❌ DATABASE_URL environment variable is not set!');
    console.error('\nTo run migrations, you need to:');
    console.error('  1. Get your DATABASE_URL from Railway dashboard');
    console.error('  2. Set it as an environment variable:');
    console.error('     Windows PowerShell: $env:DATABASE_URL="your-connection-string"');
    console.error('     Linux/Mac: export DATABASE_URL="your-connection-string"');
    console.error('  3. Or run: DATABASE_URL="your-connection-string" node db/runMigrations.js');
    console.error('\nAlternatively, you can run migrations directly via Railway CLI:');
    console.error('  railway run node backend/db/runMigrations.js');
    process.exit(1);
  }
  
  runMigrations()
    .then(() => {
      console.log('\n✨ Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration error:', error.message);
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
      if (error.stack) {
        console.error(`   Stack: ${error.stack}`);
      }
      process.exit(1);
    });
}

export { runMigrations };

