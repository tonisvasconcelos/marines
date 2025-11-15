/**
 * Check if database tables exist
 * Used to determine if we should use database or fall back to mock data
 */

import { query } from './connection.js';

/**
 * Check if vessels table exists
 */
export async function checkTablesExist() {
  try {
    // Try to query the vessels table
    await query('SELECT 1 FROM vessels LIMIT 1');
    return true;
  } catch (error) {
    // If table doesn't exist, error will contain 'relation' or 'does not exist'
    if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
      return false;
    }
    // For other errors (connection, etc.), assume tables don't exist
    return false;
  }
}

/**
 * Initialize database tables if they don't exist
 */
export async function initializeTables() {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema (split by semicolons and execute each statement)
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      try {
        await query(statement);
      } catch (error) {
        // Ignore "already exists" errors
        if (!error.message?.includes('already exists')) {
          console.warn('Schema statement failed:', error.message);
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Failed to initialize tables:', error);
    return false;
  }
}

