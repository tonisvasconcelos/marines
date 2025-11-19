import express from 'express';
import * as myshiptracking from '../services/myshiptracking.js';
import { getAisConfig } from '../services/aisConfig.js';
import {
  getCustomersByVessel,
  createVesselCustomerAssociation,
  deleteVesselCustomerAssociation,
} from '../data/mockData.js';
import * as vesselDb from '../db/vessels.js';
import * as operationLogsDb from '../db/operationLogs.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { tenantId } = req;
  
  // Try to get vessels from MyShipTracking if configured
  const aisConfig = getAisConfig(tenantId);
  
  if (aisConfig?.provider === 'myshiptracking' && aisConfig?.apiKey) {
    try {
      // Get vessels from database (with fallback to mock data)
      const vessels = await vesselDb.getVessels(tenantId);
      
      // Enrich each vessel with data from MyShipTracking if MMSI is available
      const enrichedVessels = await Promise.all(
        vessels.map(async (vessel) => {
          if (vessel.mmsi) {
            try {
              const aisData = await myshiptracking.getVesselByMmsi(
                vessel.mmsi,
                aisConfig.apiKey,
                aisConfig.secretKey
              );
              
              // Merge AIS data with vessel data
              return {
                ...vessel,
                ...aisData,
                // Preserve our internal IDs
                id: vessel.id,
                tenantId: vessel.tenantId,
              };
            } catch (error) {
              console.error(`Failed to fetch AIS data for vessel ${vessel.mmsi}:`, error);
              return vessel; // Return original vessel if API call fails
            }
          }
          return vessel;
        })
      );
      
      res.json(enrichedVessels);
      return;
    } catch (error) {
      console.error('Error fetching vessels from MyShipTracking:', error);
      // Fall through to mock data
    }
  }
  
  try {
    // Get vessels from database (with fallback to mock data)
    const vessels = await vesselDb.getVessels(tenantId);
    res.json(vessels);
  } catch (error) {
    console.error('Error fetching vessels:', error);
    res.status(500).json({ message: 'Failed to fetch vessels' });
  }
});

// GET /api/vessels/preview-position - Get position preview by IMO or MMSI (for form)
router.get('/preview-position', async (req, res) => {
  const { tenantId } = req;
  const { imo, mmsi } = req.query;
  
  if (!imo && !mmsi) {
    return res.status(400).json({ message: 'IMO or MMSI is required' });
  }
  
  const aisConfig = getAisConfig(tenantId);
  
  // Try to get position from AIS provider if configured
  if (aisConfig?.provider === 'myshiptracking' && aisConfig?.apiKey) {
    try {
      let position = null;
      
      if (mmsi) {
        position = await myshiptracking.getVesselPosition(
          mmsi,
          aisConfig.apiKey,
          aisConfig.secretKey
        );
      } else if (imo) {
        // Remove 'IMO' prefix if present
        const imoNumber = imo.replace(/^IMO/i, '').trim();
        position = await myshiptracking.getVesselByImo(
          imoNumber,
          aisConfig.apiKey,
          aisConfig.secretKey
        );
      }
      
      if (position && (position.latitude || position.lat)) {
        // Transform MyShipTracking response to our format
        const positionData = {
          lat: position.latitude || position.lat,
          lon: position.longitude || position.lon,
          timestamp: position.timestamp || position.last_position_time || new Date().toISOString(),
          sog: position.speed || position.sog,
          cog: position.course || position.cog,
          heading: position.heading,
          navStatus: position.nav_status || position.status,
          source: 'myshiptracking',
        };
        res.json(positionData);
        return;
      }
    } catch (error) {
      console.warn(`Failed to fetch preview position from AIS provider:`, error.message);
      // Fall back to mock data
    }
  }
  
  // Fallback to mock data (if AIS provider not configured, failed, or returned no data)
  const { getMockAisPosition } = await import('../data/mockData.js');
  // Use a temporary vessel ID for mock data
  const tempVesselId = `temp-${imo || mmsi}`;
  const mockPosition = getMockAisPosition(tempVesselId);
  
  // Normalize position data
  const positionData = {
    ...mockPosition,
    lat: mockPosition.lat || mockPosition.Lat,
    lon: mockPosition.lon || mockPosition.Lon,
  };
  
  res.json(positionData);
});

router.post('/', async (req, res) => {
  const { tenantId } = req;
  const { name, imo, mmsi, callSign, flag } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Vessel name is required' });
  }
  
  try {
    // Create vessel in database (with fallback to mock data)
    let newVessel = await vesselDb.createVessel(tenantId, {
      name,
      imo,
      mmsi,
      callSign,
      flag,
    });
    
    // Try to enrich with MyShipTracking data if IMO or MMSI is provided
    const aisConfig = getAisConfig(tenantId);
    
    if (aisConfig?.provider === 'myshiptracking' && aisConfig?.apiKey) {
      try {
        let aisData = null;
        if (mmsi) {
          aisData = await myshiptracking.getVesselByMmsi(
            mmsi,
            aisConfig.apiKey,
            aisConfig.secretKey
          );
        } else if (imo) {
          // Remove 'IMO' prefix if present
          const imoNumber = imo.replace(/^IMO/i, '').trim();
          aisData = await myshiptracking.getVesselByImo(
            imoNumber,
            aisConfig.apiKey,
            aisConfig.secretKey
          );
        }
        
        if (aisData) {
          // Update vessel with AIS data if we have additional fields
          newVessel = {
            ...newVessel,
            ...aisData,
            // Preserve our internal IDs
            id: newVessel.id,
            tenantId: newVessel.tenantId,
          };
          
          // CRITICAL: Store the position in position_history when vessel is created
          if (aisData.lat !== undefined && aisData.lon !== undefined) {
            try {
              await vesselDb.storePositionHistory(newVessel.id, tenantId, {
                lat: aisData.lat || aisData.Lat || aisData.latitude,
                lon: aisData.lon || aisData.Lon || aisData.longitude,
                timestamp: aisData.timestamp || new Date().toISOString(),
                sog: aisData.sog || aisData.speed,
                cog: aisData.cog || aisData.course,
                heading: aisData.heading,
                navStatus: aisData.navStatus || aisData.status,
                source: 'ais',
              });
              console.log(`[Vessel Creation] Stored initial position for vessel ${newVessel.id}`);
            } catch (posError) {
              console.error('Failed to store initial position:', posError);
              // Continue even if position storage fails
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch AIS data for new vessel:', error);
        // Continue without AIS enrichment
      }
    }
    
    // Create operation log for vessel creation
    try {
      await operationLogsDb.createOperationLog({
        tenantId,
        vesselId: newVessel.id,
        eventType: 'VESSEL_CREATED',
        description: `New vessel "${newVessel.name}" was created${newVessel.mmsi ? ` (MMSI: ${newVessel.mmsi})` : ''}${newVessel.imo ? ` (IMO: ${newVessel.imo})` : ''}`,
        positionLat: aisData?.lat || aisData?.latitude || null,
        positionLon: aisData?.lon || aisData?.longitude || null,
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

// GET /api/vessels/:id/position - Get current vessel position from AIS
// This must come before /:id route to avoid route conflicts
router.get('/:id/position', async (req, res) => {
  const { tenantId } = req;
  const { id } = req.params;
  
  try {
    const vessel = await vesselDb.getVesselById(id, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    const aisConfig = getAisConfig(tenantId);
    
    // Try to get position from AIS provider if configured
    if (aisConfig?.provider === 'myshiptracking' && aisConfig?.apiKey) {
      try {
        let position = null;
        
        if (vessel.mmsi) {
          position = await myshiptracking.getVesselPosition(
            vessel.mmsi,
            aisConfig.apiKey,
            aisConfig.secretKey
          );
        } else if (vessel.imo) {
          // Remove 'IMO' prefix if present
          const imoNumber = vessel.imo.replace(/^IMO/i, '').trim();
          position = await myshiptracking.getVesselByImo(
            imoNumber,
            aisConfig.apiKey,
            aisConfig.secretKey
          );
        }
        
        if (position && (position.latitude || position.lat)) {
          // Extract coordinates - handle various MyShipTracking API response formats
          let lat = position.latitude ?? position.lat ?? null;
          let lon = position.longitude ?? position.lon ?? null;
          
          // Handle nested position object (if API returns { position: { lat, lon } })
          if ((lat === null || lon === null) && position.position) {
            lat = position.position.latitude ?? position.position.lat ?? lat;
            lon = position.position.longitude ?? position.position.lon ?? lon;
          }
          
          // Convert to numbers if strings
          if (typeof lat === 'string') lat = parseFloat(lat);
          if (typeof lon === 'string') lon = parseFloat(lon);
          
          // Validate coordinates are valid numbers
          if (lat !== null && lon !== null && isFinite(lat) && isFinite(lon)) {
            // Transform MyShipTracking response to our format
            const positionData = {
              lat: lat,  // CRITICAL: Use extracted lat (not swapped)
              lon: lon,  // CRITICAL: Use extracted lon (not swapped)
              timestamp: position.timestamp || position.last_position_time || new Date().toISOString(),
              sog: position.speed || position.sog,
              cog: position.course || position.cog,
              heading: position.heading,
              navStatus: position.nav_status || position.status,
              source: 'myshiptracking',
            };
            
            // Log in development for debugging
            if (process.env.NODE_ENV !== 'production') {
              console.log('[vessels/:id/position] MyShipTracking API response transformed:', {
                vesselId: id,
                rawApiResponse: {
                  latitude: position.latitude,
                  longitude: position.longitude,
                  lat: position.lat,
                  lon: position.lon,
                },
                transformed: positionData,
              });
            }
            
            // Store position in history (database with fallback to mock)
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
            console.warn(`[vessels/:id/position] Invalid coordinates from MyShipTracking for vessel ${id}:`, {
              lat,
              lon,
              position,
            });
          }
        }
      } catch (error) {
        // Log error but fall back to mock data instead of returning 500
        console.warn(`Failed to fetch vessel position from AIS provider:`, error.message);
        console.log('Falling back to mock AIS data');
        // Continue to fallback below
      }
    }
    
    // Fallback to mock data (if AIS provider not configured, failed, or returned no data)
    const { getMockAisPosition } = await import('../data/mockData.js');
    const mockPosition = getMockAisPosition(id);
    
    // Ensure mock position has tenantId for consistency
    if (mockPosition && !mockPosition.tenantId) {
      mockPosition.tenantId = tenantId;
    }
    
    // Store position in history (database with fallback to mock)
    if (mockPosition && (mockPosition.lat || mockPosition.Lat) && (mockPosition.lon || mockPosition.Lon)) {
      try {
        await vesselDb.storePositionHistory(id, tenantId, mockPosition);
        
        const lat = mockPosition.lat || mockPosition.Lat;
        const lon = mockPosition.lon || mockPosition.Lon;
        
        // Create operation log for position update
        await operationLogsDb.createOperationLog({
          tenantId,
          vesselId: id,
          eventType: 'POSITION_UPDATE',
          description: `Vessel position updated: ${lat.toFixed(6)}, ${lon.toFixed(6)}${mockPosition.sog ? ` (Speed: ${mockPosition.sog} kn)` : ''}`,
          positionLat: lat,
          positionLon: lon,
        });
      } catch (error) {
        console.error('Failed to store position history:', error);
        // Don't fail the request if history storage fails
      }
    }
    
    res.json(mockPosition);
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
  
  // Try to enrich with MyShipTracking data
  const aisConfig = getAisConfig(tenantId);
  
  if (aisConfig?.provider === 'myshiptracking' && aisConfig?.apiKey) {
    try {
      let aisData = null;
      if (vessel.mmsi) {
        aisData = await myshiptracking.getVesselByMmsi(
          vessel.mmsi,
          aisConfig.apiKey,
          aisConfig.secretKey
        );
      } else if (vessel.imo) {
        // Remove 'IMO' prefix if present
        const imoNumber = vessel.imo.replace(/^IMO/i, '').trim();
        aisData = await myshiptracking.getVesselByImo(
          imoNumber,
          aisConfig.apiKey,
          aisConfig.secretKey
        );
      }
      
      if (aisData) {
        // Merge AIS data with vessel data
        vessel = {
          ...vessel,
          ...aisData,
          // Preserve our internal IDs
          id: vessel.id,
          tenantId: vessel.tenantId,
        };
      }
    } catch (error) {
      console.error(`Failed to fetch AIS data for vessel:`, error);
      // Continue with vessel data without AIS enrichment
    }
  }
  
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

