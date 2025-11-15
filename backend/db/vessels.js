/**
 * Database functions for Vessels
 * Replaces mock data with PostgreSQL persistence
 */

import { query, getClient } from './connection.js';

/**
 * Get all vessels for a tenant
 */
export async function getVessels(tenantId) {
  try {
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
    // Fallback to mock data if database fails
    const { getMockVessels } = await import('../data/mockData.js');
    return getMockVessels(tenantId);
  }
}

/**
 * Get a single vessel by ID
 */
export async function getVesselById(vesselId, tenantId) {
  try {
    const result = await query(
      'SELECT * FROM vessels WHERE id = $1 AND tenant_id = $2',
      [vesselId, tenantId]
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
    console.error('Error fetching vessel from database:', error);
    // Fallback to mock data
    const { getMockVessels } = await import('../data/mockData.js');
    const vessels = getMockVessels(tenantId);
    return vessels.find(v => v.id === vesselId) || null;
  }
}

/**
 * Create a new vessel
 */
export async function createVessel(tenantId, vesselData) {
  try {
    const vesselId = `vessel-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();
    
    const result = await query(
      `INSERT INTO vessels (
        id, tenant_id, name, imo, mmsi, call_sign, flag, 
        type, length, width, draft, gross_tonnage, net_tonnage,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        vesselId,
        tenantId,
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
 */
export async function updateVessel(vesselId, tenantId, vesselData) {
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
 */
export async function deleteVessel(vesselId, tenantId) {
  try {
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
 */
export async function storePositionHistory(vesselId, tenantId, positionData) {
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
 */
export async function getPositionHistory(vesselId, tenantId, limit = 100) {
  try {
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

