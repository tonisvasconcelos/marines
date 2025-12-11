/**
 * Migration Utility: Sync existing vessels to default fleet
 * This script creates a default fleet for each tenant and adds all existing vessels to it
 * 
 * Usage: Run this after creating fleets table and fleet_vessels table
 * This ensures all existing vessels are part of at least one fleet
 */

import { query } from '../connection.js';
import * as fleetsDb from '../fleets.js';
import * as vesselsDb from '../vessels.js';
import crypto from 'crypto';

/**
 * Create default fleet for a tenant and sync all vessels
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Object>} Result object with fleet info and synced vessel count
 */
export async function syncVesselsToDefaultFleet(tenantId) {
  try {
    // Check if default fleet already exists
    const existingFleets = await fleetsDb.getFleets(tenantId);
    let defaultFleet = existingFleets.find(f => f.name === 'Default Fleet' || f.name === 'All Vessels');
    
    if (!defaultFleet) {
      // Create default fleet
      const fleetData = {
        id: `fleet-default-${crypto.randomUUID()}`,
        tenant_id: tenantId,
        name: 'All Vessels',
        description: 'Default fleet containing all vessels',
      };
      
      defaultFleet = await fleetsDb.createFleet(fleetData);
      console.log(`Created default fleet for tenant ${tenantId}: ${defaultFleet.id}`);
    }
    
    // Get all vessels for tenant
    const vessels = await vesselsDb.getVessels(tenantId);
    
    // Add all vessels to default fleet
    let syncedCount = 0;
    for (const vessel of vessels) {
      try {
        const association = await fleetsDb.addVesselToFleet(defaultFleet.id, vessel.id, tenantId);
        if (association) {
          syncedCount++;
        }
      } catch (error) {
        // Vessel might already be in fleet, skip
        if (!error.message.includes('already')) {
          console.error(`Error adding vessel ${vessel.id} to fleet:`, error);
        }
      }
    }
    
    console.log(`Synced ${syncedCount} vessels to default fleet for tenant ${tenantId}`);
    
    return {
      fleet: defaultFleet,
      syncedVesselCount: syncedCount,
      totalVessels: vessels.length,
    };
  } catch (error) {
    console.error(`Error syncing vessels to default fleet for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Sync vessels to default fleet for all tenants
 * @returns {Promise<Array>} Array of results per tenant
 */
export async function syncAllTenantsVesselsToDefaultFleet() {
  try {
    // Get all tenants
    const tenantsResult = await query('SELECT id FROM tenants');
    const tenants = tenantsResult.rows;
    
    const results = [];
    for (const tenant of tenants) {
      try {
        const result = await syncVesselsToDefaultFleet(tenant.id);
        results.push({
          tenantId: tenant.id,
          ...result,
        });
      } catch (error) {
        console.error(`Error syncing tenant ${tenant.id}:`, error);
        results.push({
          tenantId: tenant.id,
          error: error.message,
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error syncing all tenants:', error);
    throw error;
  }
}

