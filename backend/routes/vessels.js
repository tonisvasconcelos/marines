import express from 'express';
import {
  getCustomersByVessel,
  createVesselCustomerAssociation,
  deleteVesselCustomerAssociation,
} from '../data/mockData.js';
import * as vesselDb from '../db/vessels.js';
import * as operationLogsDb from '../db/operationLogs.js';
import { fetchLatestPosition, fetchLatestPositionByMmsi, fetchLatestPositionByImo, getProviderName } from '../services/ais/index.js';
import { aisApiLimiter } from '../middleware/aisApiRateLimit.js';
import { validateVesselIdentifier } from '../middleware/validateAis.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { tenantId } = req;
  
  try {
    // Get vessels from database (with fallback to mock data)
    // Note: AISStream is real-time position data only, not vessel lookup
    // Vessel enrichment with AIS data happens on-demand via position endpoints
    const vessels = await vesselDb.getVessels(tenantId);
    res.json(vessels);
  } catch (error) {
    console.error('Error fetching vessels:', error);
    res.status(500).json({ message: 'Failed to fetch vessels' });
  }
});

// GET /api/vessels/preview-position - Get position preview by IMO or MMSI (for form)
router.get('/preview-position', aisApiLimiter, validateVesselIdentifier, async (req, res) => {
  const { tenantId } = req;
  const { imo, mmsi } = req.query;
  
  if (!imo && !mmsi) {
    return res.status(400).json({ message: 'IMO or MMSI is required' });
  }
  
  // MyShipTracking supports both MMSI and IMO
  let identifier, type;
  if (mmsi) {
    identifier = String(mmsi);
    type = 'mmsi';
  } else if (imo) {
    identifier = String(imo);
    type = 'imo';
  } else {
    return res.status(400).json({ 
      message: 'Either MMSI or IMO is required for AIS position preview.' 
    });
  }
  
  // Fetch position from AIS API
  try {
    const position = await fetchLatestPosition(identifier, { type });
    
    if (position && position.lat !== undefined && position.lon !== undefined) {
      const positionData = {
        lat: position.lat,
        lon: position.lon,
        timestamp: position.timestamp || new Date().toISOString(),
        sog: position.sog,
        cog: position.cog,
        heading: position.heading,
        navStatus: position.navStatus,
        source: getProviderName().toLowerCase(),
      };
      res.json(positionData);
      return;
    } else {
      // Position not found in AIS data
      return res.status(404).json({ 
        message: `No AIS position data found for ${type.toUpperCase()} ${identifier}. The vessel may not be transmitting AIS data or may not exist in the AIS database.` 
      });
    }
  } catch (error) {
    console.error(`[Preview Position] Failed to fetch position from AIS API:`, {
      identifier,
      type,
      error: error.message,
      errorType: error.constructor.name,
      provider: getProviderName(),
    });
    
    // Return appropriate error based on error type
    if (error.message.includes('not configured') || error.message.includes('API credentials')) {
      return res.status(500).json({ 
        message: 'AIS API is not properly configured. Please contact administrator.' 
      });
    } else if (error.message.includes('not found')) {
      return res.status(404).json({ 
        message: `Vessel not found in AIS database for ${type.toUpperCase()} ${identifier}.` 
      });
    } else {
      return res.status(500).json({ 
        message: `Failed to fetch AIS position: ${error.message}` 
      });
    }
  }
});

router.post('/', async (req, res) => {
  const { tenantId } = req;
  const { name, imo, mmsi, callSign, flag } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Vessel name is required' });
  }
  
  // Validate that at least one of IMO or MMSI is provided
  const cleanImo = imo ? String(imo).replace(/^IMO/i, '').trim() : '';
  const cleanMmsi = mmsi ? String(mmsi).trim() : '';
  
  if (!cleanImo && !cleanMmsi) {
    return res.status(400).json({ 
      message: 'Either IMO or MMSI is required to create a vessel. These identifiers are needed to fetch AIS position data.' 
    });
  }
  
  try {
    // Create vessel in database
    let newVessel = await vesselDb.createVessel(tenantId, {
      name,
      imo: cleanImo ? `IMO${cleanImo}` : null,
      mmsi: cleanMmsi || null,
      callSign,
      flag,
    });
    
    // CRITICAL: Fetch position once on vessel creation to ensure it appears on the dashboard map
    // This is a one-time fetch to make the vessel visible - subsequent refreshes are manual
    if ((cleanMmsi || cleanImo)) {
      try {
        const identifier = cleanMmsi || cleanImo;
        const type = cleanMmsi ? 'mmsi' : 'imo';
        
        console.log(`[Vessel Creation] Fetching initial position for vessel ${newVessel.id} (${newVessel.name}) - ${type.toUpperCase()}: ${identifier}`);
        
        const position = await fetchLatestPosition(identifier, { type });
        
        if (position && position.lat && position.lon) {
          // Store the position in database so vessel appears on dashboard map
          try {
            await vesselDb.storePositionHistory(newVessel.id, tenantId, {
              lat: position.lat,
              lon: position.lon,
              timestamp: position.timestamp || new Date().toISOString(),
              sog: position.sog,
              cog: position.cog,
              heading: position.heading,
              navStatus: position.navStatus,
              source: getProviderName().toLowerCase(),
            });
            console.log(`[Vessel Creation] ✅ Position stored for vessel ${newVessel.id} (${newVessel.name}): ${position.lat.toFixed(4)}, ${position.lon.toFixed(4)}`);
          } catch (storeError) {
            console.warn(`[Vessel Creation] Failed to store position for vessel ${newVessel.id}:`, storeError.message);
          }
        } else {
          console.warn(`[Vessel Creation] ⚠️ No position data returned from AIS API for vessel ${newVessel.id} (${newVessel.name})`);
        }
      } catch (positionError) {
        // Don't fail vessel creation if position fetch fails - vessel can still be created
        console.error(`[Vessel Creation] ❌ Error fetching position for vessel ${newVessel.id} (${newVessel.name}):`, {
          error: positionError.message,
          identifier: cleanMmsi || cleanImo,
          type: cleanMmsi ? 'mmsi' : 'imo',
        });
      }
    } else {
      console.warn(`[Vessel Creation] ⚠️ Vessel ${newVessel.id} (${newVessel.name}) created without MMSI/IMO - position cannot be fetched`);
    }
    
    // Create operation log for vessel creation
    try {
      await operationLogsDb.createOperationLog({
        tenantId,
        vesselId: newVessel.id,
        eventType: 'VESSEL_CREATED',
        description: `New vessel "${newVessel.name}" was created${newVessel.mmsi ? ` (MMSI: ${newVessel.mmsi})` : ''}${newVessel.imo ? ` (IMO: ${newVessel.imo})` : ''}`,
        positionLat: null,
        positionLon: null,
      });
    } catch (logError) {
      console.error('Failed to create operation log for vessel creation:', logError);
      // Don't fail the request if logging fails
    }
    
    res.status(201).json(newVessel);
  } catch (error) {
    console.error('Error creating vessel:', error);
    res.status(500).json({ message: 'Failed to create vessel' });
  }
});

// GET /api/vessels/:id/customers - Get customers associated with vessel
// This must come before /:id route to avoid route conflicts
router.get('/:id/customers', (req, res) => {
  const { tenantId } = req;
  const { id: vesselId } = req.params;
  
  const customers = getCustomersByVessel(tenantId, vesselId);
  res.json(customers);
});

// POST /api/vessels/:id/customers - Associate customer with vessel
router.post('/:id/customers', (req, res) => {
  const { tenantId } = req;
  const { id: vesselId } = req.params;
  const { customerId } = req.body;
  
  if (!customerId) {
    return res.status(400).json({ message: 'customerId is required' });
  }
  
  const association = createVesselCustomerAssociation(tenantId, vesselId, customerId);
  
  if (!association) {
    return res.status(400).json({ message: 'Association already exists' });
  }
  
  res.status(201).json(association);
});

// DELETE /api/vessels/:id/customers/:customerId - Remove customer association
router.delete('/:id/customers/:customerId', (req, res) => {
  const { tenantId } = req;
  const { id: vesselId, customerId } = req.params;
  
  const deleted = deleteVesselCustomerAssociation(tenantId, vesselId, customerId);
  
  if (!deleted) {
    return res.status(404).json({ message: 'Association not found' });
  }
  
  res.json({ message: 'Association removed' });
});

// GET /api/vessels/:id/position - Get current vessel position
// CRITICAL: Uses stored positions first to save AIS API credits
// Only calls AIS API if no stored position exists (manual refresh scenario)
// This must come before /:id route to avoid route conflicts
router.get('/:id/position', aisApiLimiter, async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    const vessel = await vesselDb.getVesselById(id, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    // CRITICAL: Try stored position FIRST to save AIS API credits
    // Only call AIS API if no stored position exists
    try {
      const latestPosition = await vesselDb.getLatestPosition(id, tenantId);
      if (latestPosition && latestPosition.lat != null && latestPosition.lon != null) {
        console.log('[Vessel Position] ✅ Using stored position from database (saves API credits):', {
          vesselId: id,
          vesselName: vessel.name,
          source: latestPosition.source || 'stored',
          lat: latestPosition.lat,
          lon: latestPosition.lon,
        });
        res.json({
          ...latestPosition,
          source: latestPosition.source || 'stored',
        });
        return;
      }
    } catch (error) {
      console.warn('[Vessel Position] Failed to fetch stored position, will try AIS API:', error.message);
    }
    
    // Fallback: Try AIS API only if no stored position exists (supports both MMSI and IMO)
    let identifier, type;
    if (vessel.mmsi) {
      identifier = String(vessel.mmsi);
      type = 'mmsi';
    } else if (vessel.imo) {
      // Clean IMO - remove 'IMO' prefix if present
      identifier = String(vessel.imo).replace(/^IMO/i, '').trim();
      type = 'imo';
    }
    
    if (identifier) {
      const providerName = getProviderName();
      console.log('[Vessel Position] Attempting to fetch from AIS API:', {
        vesselId: id,
        vesselName: vessel.name,
        identifier,
        type,
        provider: providerName,
      });
      
      try {
        const position = await fetchLatestPosition(identifier, { type });
        
        if (position && position.lat !== undefined && position.lon !== undefined) {
          console.log('[Vessel Position] Successfully fetched from AIS API:', {
            vesselId: id,
            identifier,
            type,
            lat: position.lat,
            lon: position.lon,
            provider: providerName,
          });
          
          const positionData = {
            lat: position.lat,
            lon: position.lon,
            timestamp: position.timestamp || new Date().toISOString(),
            sog: position.sog,
            cog: position.cog,
            heading: position.heading,
            navStatus: position.navStatus,
            source: providerName.toLowerCase(),
          };
          
          // Store position in history
          try {
            await vesselDb.storePositionHistory(id, tenantId, positionData);
            
            // Create operation log for position update
            await operationLogsDb.createOperationLog({
              tenantId,
              vesselId: id,
              eventType: 'POSITION_UPDATE',
              description: `Vessel position updated: ${positionData.lat.toFixed(6)}, ${positionData.lon.toFixed(6)}${positionData.sog ? ` (Speed: ${positionData.sog} kn)` : ''}`,
              positionLat: positionData.lat,
              positionLon: positionData.lon,
            });
          } catch (error) {
            console.error('Failed to store position history:', error);
            // Don't fail the request if history storage fails
          }
          
          res.json(positionData);
          return;
        } else {
          console.warn('[Vessel Position] AIS API returned null or invalid position:', {
            vesselId: id,
            identifier,
            type,
            position: position,
            provider: getProviderName(),
          });
        }
      } catch (error) {
        console.error('[Vessel Position] Failed to fetch position from AIS API:', {
          vesselId: id,
          identifier,
          type,
          error: error.message,
          errorStack: error.stack,
          errorType: error.constructor.name,
          provider: getProviderName(),
        });
        // Fall through to fallback options
      }
    } else {
      console.warn(`Vessel ${id} does not have MMSI or IMO. AIS API requires MMSI or IMO for position queries.`);
    }
    
    // Fallback: Try to get latest stored position from database
    try {
      const latestPosition = await vesselDb.getLatestPosition(id, tenantId);
      if (latestPosition && latestPosition.lat && latestPosition.lon) {
        console.log('[Vessel Position] Using stored position from database:', {
          vesselId: id,
          source: latestPosition.source || 'stored',
        });
        res.json({
          ...latestPosition,
          source: latestPosition.source || 'stored',
        });
        return;
      }
    } catch (error) {
      console.warn('[Vessel Position] Failed to fetch stored position:', error.message);
    }
    
    // No position available from AIS API or database
    if (!identifier) {
      return res.status(400).json({ 
        message: 'Vessel does not have MMSI or IMO. AIS position cannot be fetched without these identifiers.' 
      });
    }
    
    // Return error if AIS API failed and no stored position exists
    return res.status(404).json({ 
      message: `No position data available for vessel. AIS API query failed and no stored position found. Please ensure the vessel is transmitting AIS data.` 
    });
  } catch (error) {
    console.error('Error fetching vessel position:', error);
    res.status(500).json({ message: 'Failed to fetch vessel position' });
  }
});

// GET /api/vessels/:id/position-history - Get vessel position history
router.get('/:id/position-history', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 100;
  
  try {
    const vessel = await vesselDb.getVesselById(id, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    // Get position history from database (with fallback to mock data)
    const history = await vesselDb.getPositionHistory(id, tenantId, limit);
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching position history:', error);
    res.status(500).json({ message: 'Failed to fetch position history' });
  }
});

router.get('/:id', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    let vessel = await vesselDb.getVesselById(id, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
  
  // Note: AISStream is real-time position data only, not vessel lookup
  // Vessel enrichment with AIS data happens on-demand via position endpoints
  res.json(vessel);
  } catch (error) {
    console.error('Error fetching vessel:', error);
    res.status(500).json({ message: 'Failed to fetch vessel' });
  }
});

// DELETE /api/vessels/:id - Delete a vessel
router.delete('/:id', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    // Check if vessel exists
    const vessel = await vesselDb.getVesselById(id, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    // Delete vessel from database (with fallback to mock data)
    const deleted = await vesselDb.deleteVessel(id, tenantId);
    
    if (!deleted) {
      return res.status(500).json({ message: 'Failed to delete vessel' });
    }
    
    res.json({ message: 'Vessel deleted successfully' });
  } catch (error) {
    console.error('Error deleting vessel:', error);
    res.status(500).json({ message: 'Failed to delete vessel' });
  }
});

export default router;

