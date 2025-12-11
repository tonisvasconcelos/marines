/**
 * Database functions for Ports
 * Multi-tenant aware - all queries filter by tenant_id
 */

import { query } from './connection.js';

/**
 * Validate tenant ID
 */
function validateTenantId(tenantId, functionName) {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new Error(`${functionName}: tenantId is required and must be a string`);
  }
}

/**
 * Transform database row to API format (camelCase + parse polygon)
 */
function transformPortRow(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    portId: row.port_id,
    unlocode: row.unlocode,
    code: row.code,
    type: row.type || 'PORT',
    countryCode: row.country_code,
    country: row.country_code, // Alias for Ops Sites compatibility
    timezone: row.timezone,
    latitude: row.lat,
    lat: row.lat, // Alias
    longitude: row.lon,
    lon: row.lon, // Alias
    polygon: row.polygon ? (typeof row.polygon === 'string' ? JSON.parse(row.polygon) : row.polygon) : null,
    parentCode: row.parent_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all ports for a tenant (also returns Ops Sites)
 * @param {string} tenantId - Tenant ID
 * @param {string} [type] - Optional filter by type (PORT, TERMINAL, BERTH, ANCHORED_ZONE)
 * @returns {Promise<Array>} Array of ports/ops sites
 */
export async function getPorts(tenantId, type = null) {
  validateTenantId(tenantId, 'getPorts');
  
  let queryStr = 'SELECT * FROM ports WHERE tenant_id = $1';
  const params = [tenantId];
  
  if (type) {
    queryStr += ' AND type = $2';
    params.push(type);
  }
  
  queryStr += ' ORDER BY name ASC';
  
  const result = await query(queryStr, params);
  
  return result.rows.map(transformPortRow);
}

/**
 * Get port by ID
 * @param {string} portId - Port ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} Port object or null
 */
export async function getPortById(portId, tenantId) {
  validateTenantId(tenantId, 'getPortById');
  
  const result = await query(
    'SELECT * FROM ports WHERE id = $1 AND tenant_id = $2',
    [portId, tenantId]
  );
  
  return transformPortRow(result.rows[0] || null);
}

/**
 * Get port by UN/LOCODE
 * @param {string} unlocode - UN/LOCODE
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} Port object or null
 */
export async function getPortByUnlocode(unlocode, tenantId) {
  validateTenantId(tenantId, 'getPortByUnlocode');
  
  const result = await query(
    'SELECT * FROM ports WHERE unlocode = $1 AND tenant_id = $2',
    [unlocode, tenantId]
  );
  
  return transformPortRow(result.rows[0] || null);
}

/**
 * Get port/ops site by code
 * @param {string} code - Ops Site code
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} Port/Ops Site object or null
 */
export async function getPortByCode(code, tenantId) {
  validateTenantId(tenantId, 'getPortByCode');
  
  const result = await query(
    'SELECT * FROM ports WHERE code = $1 AND tenant_id = $2',
    [code, tenantId]
  );
  
  return transformPortRow(result.rows[0] || null);
}

/**
 * Get port by MyShipTracking port_id
 * @param {string} portId - MyShipTracking port_id
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} Port object or null
 */
export async function getPortByPortId(portId, tenantId) {
  validateTenantId(tenantId, 'getPortByPortId');
  
  const result = await query(
    'SELECT * FROM ports WHERE port_id = $1 AND tenant_id = $2',
    [portId, tenantId]
  );
  
  return result.rows[0] || null;
}

/**
 * Create a new port (also supports Ops Sites/Zones)
 * @param {Object} portData - Port/Ops Site data
 * @param {string} portData.id - Port ID (UUID)
 * @param {string} portData.tenant_id - Tenant ID
 * @param {string} portData.name - Port/Ops Site name
 * @param {string} [portData.port_id] - MyShipTracking port_id
 * @param {string} [portData.unlocode] - UN/LOCODE
 * @param {string} [portData.code] - Ops Site code
 * @param {string} [portData.type] - Type: PORT, TERMINAL, BERTH, ANCHORED_ZONE
 * @param {string} [portData.country_code] - Country code
 * @param {string} [portData.timezone] - Timezone
 * @param {number} [portData.lat] - Latitude
 * @param {number} [portData.lon] - Longitude
 * @param {Array} [portData.polygon] - Polygon coordinates array
 * @param {string} [portData.parent_code] - Parent ops site code
 * @returns {Promise<Object>} Created port
 */
export async function createPort(portData) {
  const {
    id,
    tenant_id,
    name,
    port_id,
    unlocode,
    code,
    type = 'PORT',
    country_code,
    timezone,
    lat,
    lon,
    polygon,
    parent_code,
  } = portData;
  
  validateTenantId(tenant_id, 'createPort');
  
  // Convert polygon array to JSONB if provided
  const polygonJson = polygon ? JSON.stringify(polygon) : null;
  
  const result = await query(
    `INSERT INTO ports (
      id, tenant_id, name, port_id, unlocode, code, type, country_code, timezone, lat, lon, polygon, parent_code
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      id, tenant_id, name, 
      port_id || null, 
      unlocode || null, 
      code || null, 
      type, 
      country_code || null, 
      timezone || null, 
      lat || null, 
      lon || null,
      polygonJson,
      parent_code || null
    ]
  );
  
  return transformPortRow(result.rows[0]);
}

/**
 * Update a port/ops site
 * @param {string} portId - Port ID
 * @param {string} tenantId - Tenant ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated port or null
 */
export async function updatePort(portId, tenantId, updates) {
  validateTenantId(tenantId, 'updatePort');
  
  const allowedFields = ['name', 'port_id', 'unlocode', 'code', 'type', 'country_code', 'timezone', 'lat', 'lon', 'polygon', 'parent_code'];
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(updates)) {
    // Map camelCase to snake_case for database
    const dbKey = key === 'latitude' ? 'lat' : 
                  key === 'longitude' ? 'lon' : 
                  key === 'country' ? 'country_code' :
                  key;
    
    if (allowedFields.includes(dbKey) && value !== undefined) {
      // Handle polygon conversion
      if (dbKey === 'polygon' && Array.isArray(value)) {
        updateFields.push(`polygon = $${paramIndex}`);
        updateValues.push(JSON.stringify(value));
      } else {
        updateFields.push(`${dbKey} = $${paramIndex}`);
        updateValues.push(value);
      }
      paramIndex++;
    }
  }
  
  if (updateFields.length === 0) {
    return getPortById(portId, tenantId);
  }
  
  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateValues.push(portId, tenantId);
  
  const result = await query(
    `UPDATE ports 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
     RETURNING *`,
    updateValues
  );
  
  return transformPortRow(result.rows[0] || null);
}

/**
 * Delete a port
 * @param {string} portId - Port ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} Success status
 */
export async function deletePort(portId, tenantId) {
  validateTenantId(tenantId, 'deletePort');
  
  const result = await query(
    'DELETE FROM ports WHERE id = $1 AND tenant_id = $2',
    [portId, tenantId]
  );
  
  return result.rowCount > 0;
}

/**
 * Search ports/ops sites by name, code, or UN/LOCODE
 * @param {string} searchTerm - Search term
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Array of matching ports/ops sites
 */
export async function searchPorts(searchTerm, tenantId) {
  validateTenantId(tenantId, 'searchPorts');
  
  const searchPattern = `%${searchTerm}%`;
  const result = await query(
    `SELECT * FROM ports 
     WHERE tenant_id = $1 
     AND (name ILIKE $2 OR unlocode ILIKE $2 OR port_id ILIKE $2 OR code ILIKE $2)
     ORDER BY name ASC
     LIMIT 50`,
    [tenantId, searchPattern]
  );
  
  return result.rows.map(transformPortRow);
}

