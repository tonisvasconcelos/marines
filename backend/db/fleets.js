/**
 * Database functions for Fleets
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
 * Get all fleets for a tenant
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Array of fleets
 */
export async function getFleets(tenantId) {
  validateTenantId(tenantId, 'getFleets');
  
  const result = await query(
    'SELECT * FROM fleets WHERE tenant_id = $1 ORDER BY name ASC',
    [tenantId]
  );
  
  return result.rows;
}

/**
 * Get fleet by ID
 * @param {string} fleetId - Fleet ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object|null>} Fleet object or null
 */
export async function getFleetById(fleetId, tenantId) {
  validateTenantId(tenantId, 'getFleetById');
  
  const result = await query(
    'SELECT * FROM fleets WHERE id = $1 AND tenant_id = $2',
    [fleetId, tenantId]
  );
  
  return result.rows[0] || null;
}

/**
 * Create a new fleet
 * @param {Object} fleetData - Fleet data
 * @param {string} fleetData.id - Fleet ID (UUID)
 * @param {string} fleetData.tenant_id - Tenant ID
 * @param {string} fleetData.name - Fleet name
 * @param {string} [fleetData.description] - Fleet description
 * @returns {Promise<Object>} Created fleet
 */
export async function createFleet(fleetData) {
  const { id, tenant_id, name, description } = fleetData;
  
  validateTenantId(tenant_id, 'createFleet');
  
  const result = await query(
    `INSERT INTO fleets (id, tenant_id, name, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, tenant_id, name, description || null]
  );
  
  return result.rows[0];
}

/**
 * Update a fleet
 * @param {string} fleetId - Fleet ID
 * @param {string} tenantId - Tenant ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated fleet or null
 */
export async function updateFleet(fleetId, tenantId, updates) {
  validateTenantId(tenantId, 'updateFleet');
  
  const allowedFields = ['name', 'description'];
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
    return getFleetById(fleetId, tenantId);
  }
  
  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateValues.push(fleetId, tenantId);
  
  const result = await query(
    `UPDATE fleets 
     SET ${updateFields.join(', ')}
     WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
     RETURNING *`,
    updateValues
  );
  
  return result.rows[0] || null;
}

/**
 * Delete a fleet
 * @param {string} fleetId - Fleet ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteFleet(fleetId, tenantId) {
  validateTenantId(tenantId, 'deleteFleet');
  
  const result = await query(
    'DELETE FROM fleets WHERE id = $1 AND tenant_id = $2',
    [fleetId, tenantId]
  );
  
  return result.rowCount > 0;
}

/**
 * Get vessels in a fleet
 * @param {string} fleetId - Fleet ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} Array of vessels
 */
export async function getFleetVessels(fleetId, tenantId) {
  validateTenantId(tenantId, 'getFleetVessels');
  
  const result = await query(
    `SELECT v.* 
     FROM vessels v
     INNER JOIN fleet_vessels fv ON v.id = fv.vessel_id
     WHERE fv.fleet_id = $1 AND fv.tenant_id = $2 AND v.tenant_id = $2
     ORDER BY v.name ASC`,
    [fleetId, tenantId]
  );
  
  return result.rows;
}

/**
 * Add vessel to fleet
 * @param {string} fleetId - Fleet ID
 * @param {string} vesselId - Vessel ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} Created fleet_vessel association
 */
export async function addVesselToFleet(fleetId, vesselId, tenantId) {
  validateTenantId(tenantId, 'addVesselToFleet');
  
  // Generate ID for fleet_vessels entry
  const id = `${fleetId}-${vesselId}-${tenantId}`;
  
  const result = await query(
    `INSERT INTO fleet_vessels (id, fleet_id, vessel_id, tenant_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (fleet_id, vessel_id, tenant_id) DO NOTHING
     RETURNING *`,
    [id, fleetId, vesselId, tenantId]
  );
  
  return result.rows[0] || null;
}

/**
 * Remove vessel from fleet
 * @param {string} fleetId - Fleet ID
 * @param {string} vesselId - Vessel ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<boolean>} Success status
 */
export async function removeVesselFromFleet(fleetId, vesselId, tenantId) {
  validateTenantId(tenantId, 'removeVesselFromFleet');
  
  const result = await query(
    'DELETE FROM fleet_vessels WHERE fleet_id = $1 AND vessel_id = $2 AND tenant_id = $3',
    [fleetId, vesselId, tenantId]
  );
  
  return result.rowCount > 0;
}

