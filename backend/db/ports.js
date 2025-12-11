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
 * Get all ports for a tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Array of ports
 */
export async function getPorts(tenantId) {
  validateTenantId(tenantId, 'getPorts');
  
  const result = await query(
    'SELECT * FROM ports WHERE tenant_id = $1 ORDER BY name ASC',
    [tenantId]
  );
  
  return result.rows;
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
  
  return result.rows[0] || null;
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
  
  return result.rows[0] || null;
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
 * Create a new port
 * @param {Object} portData - Port data
 * @param {string} portData.id - Port ID (UUID)
 * @param {string} portData.tenant_id - Tenant ID
 * @param {string} portData.name - Port name
 * @param {string} [portData.port_id] - MyShipTracking port_id
 * @param {string} [portData.unlocode] - UN/LOCODE
 * @param {string} [portData.country_code] - Country code
 * @param {string} [portData.timezone] - Timezone
 * @param {number} [portData.lat] - Latitude
 * @param {number} [portData.lon] - Longitude
 * @returns {Promise<Object>} Created port
 */
export async function createPort(portData) {
  const {
    id,
    tenant_id,
    name,
    port_id,
    unlocode,
    country_code,
    timezone,
    lat,
    lon,
  } = portData;
  
  validateTenantId(tenant_id, 'createPort');
  
  const result = await query(
    `INSERT INTO ports (
      id, tenant_id, name, port_id, unlocode, country_code, timezone, lat, lon
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [id, tenant_id, name, port_id || null, unlocode || null, country_code || null, timezone || null, lat || null, lon || null]
  );
  
  return result.rows[0];
}

/**
 * Update a port
 * @param {string} portId - Port ID
 * @param {string} tenantId - Tenant ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated port or null
 */
export async function updatePort(portId, tenantId, updates) {
  validateTenantId(tenantId, 'updatePort');
  
  const allowedFields = ['name', 'port_id', 'unlocode', 'country_code', 'timezone', 'lat', 'lon'];
  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key) && value !== undefined) {
      updateFields.push(`${key} = $${paramIndex}`);
      updateValues.push(value);
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
  
  return result.rows[0] || null;
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
 * Search ports by name or UN/LOCODE
 * @param {string} searchTerm - Search term
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Array of matching ports
 */
export async function searchPorts(searchTerm, tenantId) {
  validateTenantId(tenantId, 'searchPorts');
  
  const searchPattern = `%${searchTerm}%`;
  const result = await query(
    `SELECT * FROM ports 
     WHERE tenant_id = $1 
     AND (name ILIKE $2 OR unlocode ILIKE $2 OR port_id ILIKE $2)
     ORDER BY name ASC
     LIMIT 50`,
    [tenantId, searchPattern]
  );
  
  return result.rows;
}

