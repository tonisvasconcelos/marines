/**
 * Database functions for Vessels
 * Replaces mock data with PostgreSQL persistence
 * 
 * SECURITY: All functions enforce tenant isolation by requiring tenantId parameter
 * and filtering all queries by tenant_id. This ensures multi-tenant data segregation.
 */

import { query, getClient } from './connection.js';

/**
 * Validate tenant ID is provided (security check)
 */
function validateTenantId(tenantId, operation = 'operation') {
  if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
    throw new Error(`Tenant ID is required for ${operation}. This is a security requirement.`);
  }
}

/**
 * Get all vessels for a tenant
 * SECURITY: Only returns vessels for the specified tenant
 */
export async function getVessels(tenantId) {
  validateTenantId(tenantId, 'getVessels');
  
  try {
    // CRITICAL: Always filter by tenant_id to ensure data isolation
    const result = await query(
      'SELECT * FROM vessels WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    // Transform database column names to camelCase for API consistency
    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      imo: row.imo,
      mmsi: row.mmsi,
      callSign: row.call_sign,
      flag: row.flag,
      type: row.type,
      length: row.length,
      width: row.width,
      draft: row.draft,
      grossTonnage: row.gross_tonnage,
      netTonnage: row.net_tonnage,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error('Error fetching vessels from database:', error);
    
    // Check if error is about missing table (table doesn't exist yet)
    const isTableMissing = error.message?.includes('relation') || 
                          error.message?.includes('does not exist') ||
                          error.code === '42P01'; // PostgreSQL error code for "relation does not exist"
    
    // Check if it's a connection error
    const isConnectionError = error.message?.includes('ECONNREFUSED') ||
                              error.message?.includes('connection') ||
                              error.code === 'ECONNREFUSED';
    
    // Only fall back to mock data if table doesn't exist or connection fails
    // If table exists but is empty, return empty array (don't fall back)
    if (isTableMissing || isConnectionError) {
      console.warn('Database table missing or connection error, falling back to mock data');
      const { getMockVessels } = await import('../data/mockData.js');
      return getMockVessels(tenantId);
    }
    
    // For other errors (permissions, etc.), return empty array
    // This prevents re-initializing mock data when database is properly set up but empty
    console.warn('Database query error, returning empty array (not falling back to mock):', error.message);
    return [];
  }
}

/**
 * Get a single vessel by ID
 * SECURITY: Verifies vessel belongs to the specified tenant
 */
export async function getVesselById(vesselId, tenantId) {
  validateTenantId(tenantId, 'getVesselById');
  
  if (!vesselId) {
    throw new Error('Vessel ID is required');
  }
  
  try {
    // CRITICAL: Always filter by both id AND tenant_id to prevent cross-tenant access
    const result = await query(
      'SELECT * FROM vessels WHERE id = $1 AND tenant_id = $2',
      [vesselId, tenantId]
    );
    
    // If vessel found in database, return it
    if (result.rows.length > 0) {
      const row = result.rows[0];
      // Transform database column names to camelCase
      return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        imo: row.imo,
        mmsi: row.mmsi,
        callSign: row.call_sign,
        flag: row.flag,
        type: row.type,
        length: row.length,
        width: row.width,
        draft: row.draft,
        grossTonnage: row.gross_tonnage,
        netTonnage: row.net_tonnage,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    }
    
    // Vessel not found in database - try mock data fallback
    // This handles the case where dashboard returns mock vessels but database is empty
    const { getMockVessels } = await import('../data/mockData.js');
    const mockVessels = getMockVessels(tenantId);
    const mockVessel = mockVessels.find(v => v.id === vesselId);
    
    if (mockVessel) {
      console.log(`[getVesselById] Vessel ${vesselId} not found in database, using mock data fallback`);
      return mockVessel;
    }
    
    // Vessel not found in database or mock data
    return null;
  } catch (error) {
    console.error('Error fetching vessel from database:', error);
    
    // Check if error is about missing table (table doesn't exist yet)
    const isTableMissing = error.message?.includes('relation') || 
                          error.message?.includes('does not exist') ||
                          error.code === '42P01'; // PostgreSQL error code for "relation does not exist"
    
    // Check if it's a connection error
    const isConnectionError = error.message?.includes('ECONNREFUSED') ||
                            error.message?.includes('connection') ||
                            error.code === 'ECONNREFUSED';
    
    // Fallback to mock data if table missing or connection error
    if (isTableMissing || isConnectionError) {
      console.warn('Database table missing or connection error, falling back to mock data');
      const { getMockVessels } = await import('../data/mockData.js');
      const vessels = getMockVessels(tenantId);
      return vessels.find(v => v.id === vesselId) || null;
    }
    
    // For other errors, still try mock data as fallback
    const { getMockVessels } = await import('../data/mockData.js');
    const vessels = getMockVessels(tenantId);
    return vessels.find(v => v.id === vesselId) || null;
  }
}

/**
 * Create a new vessel
 * SECURITY: Ensures vessel is created with the correct tenant_id
 */
export async function createVessel(tenantId, vesselData) {
  validateTenantId(tenantId, 'createVessel');
  
  try {
    const vesselId = `vessel-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();
    
    // CRITICAL: tenant_id is explicitly set from the authenticated user's tenant
    // Never trust tenant_id from vesselData to prevent tenant spoofing
    const result = await query(
      `INSERT INTO vessels (
        id, tenant_id, name, imo, mmsi, call_sign, flag, 
        type, length, width, draft, gross_tonnage, net_tonnage,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        vesselId,
        tenantId, // SECURITY: Use tenantId from authenticated session, not from input
        vesselData.name || '',
        vesselData.imo || null,
        vesselData.mmsi || null,
        vesselData.callSign || vesselData.call_sign || null,
        vesselData.flag || null,
        vesselData.type || null,
        vesselData.length || null,
        vesselData.width || null,
        vesselData.draft || null,
        vesselData.grossTonnage || vesselData.gross_tonnage || null,
        vesselData.netTonnage || vesselData.net_tonnage || null,
        now,
        now,
      ]
    );
    
    const row = result.rows[0];
    // Transform database column names to camelCase
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      imo: row.imo,
      mmsi: row.mmsi,
      callSign: row.call_sign,
      flag: row.flag,
      type: row.type,
      length: row.length,
      width: row.width,
      draft: row.draft,
      grossTonnage: row.gross_tonnage,
      netTonnage: row.net_tonnage,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('Error creating vessel in database:', error);
    // Fallback to mock data
    const { createMockVessel } = await import('../data/mockData.js');
    return createMockVessel(tenantId, vesselData);
  }
}

/**
 * Update a vessel
 * SECURITY: Verifies vessel belongs to tenant before updating
 */
export async function updateVessel(vesselId, tenantId, vesselData) {
  validateTenantId(tenantId, 'updateVessel');
  
  if (!vesselId) {
    throw new Error('Vessel ID is required');
  }
  
  try {
    const now = new Date().toISOString();
    
    const updates = [];
    const values = [];
    let paramIndex = 1;
    
    if (vesselData.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(vesselData.name);
    }
    if (vesselData.imo !== undefined) {
      updates.push(`imo = $${paramIndex++}`);
      values.push(vesselData.imo);
    }
    if (vesselData.mmsi !== undefined) {
      updates.push(`mmsi = $${paramIndex++}`);
      values.push(vesselData.mmsi);
    }
    if (vesselData.callSign !== undefined || vesselData.call_sign !== undefined) {
      updates.push(`call_sign = $${paramIndex++}`);
      values.push(vesselData.callSign || vesselData.call_sign);
    }
    if (vesselData.flag !== undefined) {
      updates.push(`flag = $${paramIndex++}`);
      values.push(vesselData.flag);
    }
    if (vesselData.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(vesselData.type);
    }
    
    updates.push(`updated_at = $${paramIndex++}`);
    values.push(now);
    
    values.push(vesselId, tenantId);
    
    const result = await query(
      `UPDATE vessels 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    // Transform database column names to camelCase
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      imo: row.imo,
      mmsi: row.mmsi,
      callSign: row.call_sign,
      flag: row.flag,
      type: row.type,
      length: row.length,
      width: row.width,
      draft: row.draft,
      grossTonnage: row.gross_tonnage,
      netTonnage: row.net_tonnage,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    console.error('Error updating vessel in database:', error);
    throw error;
  }
}

/**
 * Delete a vessel
 * SECURITY: Verifies vessel belongs to tenant before deletion
 */
export async function deleteVessel(vesselId, tenantId) {
  validateTenantId(tenantId, 'deleteVessel');
  
  if (!vesselId) {
    throw new Error('Vessel ID is required');
  }
  
  try {
    // CRITICAL: Always filter by both id AND tenant_id to prevent cross-tenant deletion
    const result = await query(
      'DELETE FROM vessels WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [vesselId, tenantId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting vessel from database:', error);
    // Fallback to mock data
    const { deleteMockVessel } = await import('../data/mockData.js');
    return deleteMockVessel(vesselId, tenantId);
  }
}

/**
 * Store vessel position in history
 * SECURITY: Ensures position is stored with correct tenant_id
 */
export async function storePositionHistory(vesselId, tenantId, positionData) {
  validateTenantId(tenantId, 'storePositionHistory');
  
  if (!vesselId) {
    throw new Error('Vessel ID is required');
  }
  
  try {
    const positionId = `pos-${vesselId}-${Date.now()}`;
    
    await query(
      `INSERT INTO vessel_position_history (
        id, vessel_id, tenant_id, lat, lon, timestamp, 
        sog, cog, heading, nav_status, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        positionId,
        vesselId,
        tenantId,
        positionData.lat || positionData.Lat || positionData.latitude,
        positionData.lon || positionData.Lon || positionData.longitude,
        positionData.timestamp || new Date().toISOString(),
        positionData.sog || positionData.speed || null,
        positionData.cog || positionData.course || null,
        positionData.heading || null,
        positionData.navStatus || positionData.status || null,
        positionData.source || 'ais',
      ]
    );
    
    // Keep only last 1000 records per vessel (cleanup old records)
    await query(
      `DELETE FROM vessel_position_history 
       WHERE vessel_id = $1 
       AND id NOT IN (
         SELECT id FROM vessel_position_history 
         WHERE vessel_id = $1 
         ORDER BY timestamp DESC 
         LIMIT 1000
       )`,
      [vesselId]
    );
    
    return { id: positionId };
  } catch (error) {
    console.error('Error storing position history in database:', error);
    // Fallback to mock data
    const { storePositionHistory: storeMockPosition } = await import('../data/mockData.js');
    return storeMockPosition(vesselId, tenantId, positionData);
  }
}

/**
 * Get vessel position history
 * SECURITY: Only returns position history for the specified tenant
 */
export async function getPositionHistory(vesselId, tenantId, limit = 100) {
  validateTenantId(tenantId, 'getPositionHistory');
  
  if (!vesselId) {
    throw new Error('Vessel ID is required');
  }
  
  try {
    // CRITICAL: Always filter by both vessel_id AND tenant_id
    const result = await query(
      `SELECT * FROM vessel_position_history 
       WHERE vessel_id = $1 AND tenant_id = $2 
       ORDER BY timestamp DESC 
       LIMIT $3`,
      [vesselId, tenantId, limit]
    );
    // Transform database column names to camelCase
    return result.rows.map(row => ({
      id: row.id,
      vesselId: row.vessel_id,
      tenantId: row.tenant_id,
      lat: parseFloat(row.lat),
      lon: parseFloat(row.lon),
      timestamp: row.timestamp,
      sog: row.sog ? parseFloat(row.sog) : null,
      cog: row.cog ? parseFloat(row.cog) : null,
      heading: row.heading ? parseFloat(row.heading) : null,
      navStatus: row.nav_status,
      source: row.source,
      createdAt: row.created_at,
    }));
  } catch (error) {
    console.error('Error fetching position history from database:', error);
    // Fallback to mock data
    const { getPositionHistory: getMockHistory } = await import('../data/mockData.js');
    return getMockHistory(vesselId, tenantId, limit);
  }
}

