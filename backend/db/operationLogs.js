/**
 * Database functions for Operation Logs
 * Stores operational events for vessels (creation, position updates, geofence entries, status changes)
 * 
 * SECURITY: All functions enforce tenant isolation by requiring tenantId parameter
 * and filtering all queries by tenant_id. This ensures multi-tenant data segregation.
 */

import { query } from './connection.js';

/**
 * Validate tenant ID is provided (security check)
 */
function validateTenantId(tenantId, operation = 'operation') {
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new Error(`Tenant ID is required for ${operation}. This is a security requirement.`);
  }
}

/**
 * Create an operation log entry
 * SECURITY: Ensures log is created with the correct tenant_id
 */
export async function createOperationLog({
  tenantId,
  vesselId = null,
  eventType,
  description,
  positionLat = null,
  positionLon = null,
  previousStatus = null,
  currentStatus = null,
}) {
  validateTenantId(tenantId, 'createOperationLog');

  if (!eventType || !description) {
    throw new Error('eventType and description are required');
  }

  try {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const timestamp = new Date().toISOString();

    await query(
      `INSERT INTO portcall_operation_logs (
        id, tenant_id, vessel_id, event_type, description, timestamp,
        position_lat, position_lon, previous_status, current_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        logId,
        tenantId, // SECURITY: Use tenantId from authenticated session, not from input
        vesselId,
        eventType,
        description,
        timestamp,
        positionLat,
        positionLon,
        previousStatus,
        currentStatus,
      ]
    );

    return { id: logId, timestamp };
  } catch (error) {
    // Handle foreign key constraint errors silently (expected for mock vessels)
    const isForeignKeyError = error.code === '23503' || 
                              error.message?.includes('foreign key constraint') ||
                              error.message?.includes('violates foreign key constraint');
    
    if (isForeignKeyError) {
      // Silently skip - vessel doesn't exist in database (likely mock data)
      return null;
    }
    
    // Log other errors but don't throw - operation logs are non-critical
    console.error('Error creating operation log in database:', error.message);
    // Return null to indicate log was not created
    return null;
  }
}

/**
 * Get operation logs for a tenant
 * SECURITY: Only returns logs for the specified tenant
 */
export async function getOperationLogs(tenantId, options = {}) {
  validateTenantId(tenantId, 'getOperationLogs');

  const {
    vesselId = null,
    eventType = null,
    limit = 50,
    offset = 0,
  } = options;

  try {
    let sql = 'SELECT * FROM portcall_operation_logs WHERE tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (vesselId) {
      sql += ` AND vessel_id = $${paramIndex++}`;
      params.push(vesselId);
    }

    if (eventType) {
      sql += ` AND event_type = $${paramIndex++}`;
      params.push(eventType);
    }

    sql += ` ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Transform database column names to camelCase
    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      vesselId: row.vessel_id,
      eventType: row.event_type,
      description: row.description,
      timestamp: row.timestamp,
      positionLat: row.position_lat ? parseFloat(row.position_lat) : null,
      positionLon: row.position_lon ? parseFloat(row.position_lon) : null,
      previousStatus: row.previous_status,
      currentStatus: row.current_status,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('Error fetching operation logs from database:', error);
    
    // Check if error is about missing table
    const isTableMissing = error.message?.includes('relation') || 
                          error.message?.includes('does not exist') ||
                          error.code === '42P01';
    
    if (isTableMissing) {
      console.warn('Operation logs table missing, returning empty array');
      return [];
    }
    
    // For other errors, return empty array
    return [];
  }
}

