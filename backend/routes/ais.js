import express from 'express';
import {
  fetchLatestPosition,
  fetchLatestPositionByMmsi,
  fetchLatestPositionByImo,
  fetchTrack,
  fetchTrackByMmsi,
  fetchVesselsInZone,
} from '../services/myshiptracking.js';
import * as vesselDb from '../db/vessels.js';
import { myshiptrackingLimiter } from '../middleware/externalApiRateLimit.js';
import { validateVesselIdentifier, validateZoneBoundsParam } from '../middleware/validateMyShipTracking.js';

const router = express.Router();

// Helper function to get AIS configuration
function getAisConfig() {
  // MyShipTracking supports both MMSI and IMO
  return {
    provider: 'myshiptracking',
    supportedIdentifiers: ['MMSI', 'IMO'],
  };
}

// GET /api/ais/vessel/last-position?mmsi=123 or ?imo=1234567
router.get('/vessel/last-position', myshiptrackingLimiter, validateVesselIdentifier, async (req, res) => {
  try {
    const { tenantId } = req;
    const { mmsi, imo } = req.query;
    const aisConfig = getAisConfig();
    
    if (!mmsi && !imo) {
      return res.status(400).json({ 
        message: `Either mmsi or imo is required. Supported identifiers: ${aisConfig.supportedIdentifiers.join(', ')}.` 
      });
    }
    
    // Determine identifier type and value
    let identifier, type;
    if (mmsi) {
      identifier = String(mmsi);
      type = 'mmsi';
    } else {
      identifier = String(imo);
      type = 'imo';
    }
    
    const position = await fetchLatestPosition(identifier, { type });
    if (!position) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    // Try to find vessel by MMSI or IMO and store position history if found
    try {
      let vessel = null;
      if (mmsi) {
        vessel = await vesselDb.getVesselByMmsi(String(mmsi), tenantId);
      } else if (imo) {
        // Check if getVesselByImo exists, otherwise try to find by IMO
        vessel = await vesselDb.getVesselByImo ? 
          await vesselDb.getVesselByImo(String(imo), tenantId) :
          null;
      }
      
      if (vessel) {
        const positionData = {
          lat: position.lat,
          lon: position.lon,
          timestamp: position.timestamp || new Date().toISOString(),
          sog: position.sog,
          cog: position.cog,
          heading: position.heading,
          navStatus: position.navStatus,
          source: 'myshiptracking',
        };
        await vesselDb.storePositionHistory(vessel.id, tenantId, positionData);
        console.log(`[AIS] Stored position history for vessel ${vessel.id} (${type.toUpperCase()}: ${identifier})`);
      }
    } catch (error) {
      console.warn('Failed to store position history for AIS position:', error.message);
      // Don't fail the request if history storage fails
    }
    
    res.json(position);
  } catch (error) {
    console.error('AIS last-position error:', error);
    // Map specific errors to appropriate status codes
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Invalid API credentials') || error.message.includes('not configured')) {
      return res.status(500).json({ message: 'AIS API configuration error' });
    }
    res.status(500).json({ message: error.message || 'Failed to fetch position' });
  }
});

// GET /api/ais/vessel/track?mmsi=123&hours=72 or ?imo=1234567&hours=72
router.get('/vessel/track', myshiptrackingLimiter, async (req, res) => {
  try {
    const { mmsi, imo, hours } = req.query;
    const aisConfig = getAisConfig();
    
    if (!mmsi && !imo) {
      return res.status(400).json({ 
        message: `Either mmsi or imo is required. Supported identifiers: ${aisConfig.supportedIdentifiers.join(', ')}.` 
      });
    }
    
    // Parse hours parameter (default: 24 hours)
    const hoursNum = hours ? parseInt(hours, 10) : 24;
    if (isNaN(hoursNum) || hoursNum < 1 || hoursNum > 168) {
      return res.status(400).json({ 
        message: 'hours parameter must be a number between 1 and 168 (7 days)' 
      });
    }
    
    // Determine identifier type and value
    let identifier, type;
    if (mmsi) {
      identifier = String(mmsi);
      type = 'mmsi';
    } else {
      identifier = String(imo);
      type = 'imo';
    }
    
    const track = await fetchTrack(identifier, { type, hours: hoursNum });
    res.json(track);
  } catch (error) {
    console.error('AIS track error:', error);
    // Map specific errors to appropriate status codes
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Invalid API credentials') || error.message.includes('not configured')) {
      return res.status(500).json({ message: 'AIS API configuration error' });
    }
    res.status(500).json({ message: error.message || 'Failed to fetch track' });
  }
});

// GET /api/ais/zone?minlon=&maxlon=&minlat=&maxlat=
router.get('/zone', myshiptrackingLimiter, validateZoneBoundsParam, async (req, res) => {
  try {
    const { minlon, maxlon, minlat, maxlat } = req.query;
    
    // Validate all parameters are present and non-empty
    const params = { minlon, maxlon, minlat, maxlat };
    const missing = Object.entries(params)
      .filter(([key, value]) => value === undefined || value === '')
      .map(([key]) => key);
    
    if (missing.length > 0) {
      return res.status(400).json({ 
        message: `Missing required parameters: ${missing.join(', ')}` 
      });
    }
    
    // Parse and validate numeric values
    const parsed = {
      minlon: parseFloat(minlon),
      maxlon: parseFloat(maxlon),
      minlat: parseFloat(minlat),
      maxlat: parseFloat(maxlat),
    };
    
    const invalid = Object.entries(parsed)
      .filter(([key, value]) => !Number.isFinite(value))
      .map(([key]) => key);
    
    if (invalid.length > 0) {
      return res.status(400).json({ 
        message: `Invalid numeric values for: ${invalid.join(', ')}` 
      });
    }
    
    const results = await fetchVesselsInZone(parsed);
    res.json(results);
  } catch (error) {
    console.error('[AIS Zone] Error fetching vessels in zone:', {
      error: error.message,
      errorType: error.constructor.name,
      apiKeyConfigured: !!process.env.MYSHIPTRACKING_API_KEY,
      secretKeyConfigured: !!process.env.MYSHIPTRACKING_SECRET_KEY,
    });
    
    // Provide more helpful error messages
    if (error.message.includes('not configured') || error.message.includes('must be set')) {
      return res.status(500).json({ 
        message: 'AIS API is not properly configured. Please contact administrator to set MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY environment variables.' 
      });
    } else if (error.message.includes('Invalid API credentials')) {
      return res.status(401).json({ 
        message: 'Invalid AIS API credentials. Please verify MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY are correct.' 
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Failed to fetch vessels in zone' 
    });
  }
});

// GET /api/ais/vessels/:vesselId/last-position - Bridge endpoint that accepts vesselId
router.get('/vessels/:vesselId/last-position', myshiptrackingLimiter, async (req, res) => {
  try {
    const { tenantId } = req;
    const { vesselId } = req.params;
    
    // Fetch vessel to get MMSI or IMO
    const vessel = await vesselDb.getVesselById(vesselId, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    const aisConfig = getAisConfig();
    
    // Check if vessel has a supported identifier (prefer MMSI, fallback to IMO)
    let identifier, type;
    if (vessel.mmsi) {
      identifier = String(vessel.mmsi);
      type = 'mmsi';
    } else if (vessel.imo) {
      // Clean IMO - remove 'IMO' prefix if present
      identifier = String(vessel.imo).replace(/^IMO/i, '').trim();
      type = 'imo';
    } else {
      return res.status(400).json({ 
        message: `Vessel does not have a supported identifier. The current AIS provider (${aisConfig.provider}) requires: ${aisConfig.supportedIdentifiers.join(' or ')}.` 
      });
    }
    
    const position = await fetchLatestPosition(identifier, { type });
    if (!position) {
      return res.status(404).json({ message: 'Vessel position not found in AIS data' });
    }
    
    // Store position in history
    try {
      const positionData = {
        lat: position.lat,
        lon: position.lon,
        timestamp: position.timestamp || new Date().toISOString(),
        sog: position.sog,
        cog: position.cog,
        heading: position.heading,
        navStatus: position.navStatus,
        source: 'myshiptracking',
      };
      await vesselDb.storePositionHistory(vesselId, tenantId, positionData);
      console.log(`[AIS] Stored position history for vessel ${vesselId} (${type.toUpperCase()}: ${identifier})`);
    } catch (error) {
      console.warn('Failed to store position history:', error.message);
      // Don't fail the request if history storage fails
    }
    
    res.json(position);
  } catch (error) {
    console.error('AIS vessel last-position error:', error);
    // Map specific errors to appropriate status codes
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Invalid API credentials') || error.message.includes('not configured')) {
      return res.status(500).json({ message: 'AIS API configuration error' });
    }
    res.status(500).json({ message: error.message || 'Failed to fetch vessel position' });
  }
});

// GET /api/ais/vessels/:vesselId/track?hours=72 - Bridge endpoint that accepts vesselId
router.get('/vessels/:vesselId/track', myshiptrackingLimiter, async (req, res) => {
  try {
    const { tenantId } = req;
    const { vesselId } = req.params;
    const hours = parseInt(req.query.hours) || 24;
    
    // Validate hours parameter
    if (isNaN(hours) || hours < 1 || hours > 168) {
      return res.status(400).json({ 
        message: 'hours parameter must be a number between 1 and 168 (7 days)' 
      });
    }
    
    // Fetch vessel to get MMSI or IMO
    const vessel = await vesselDb.getVesselById(vesselId, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    const aisConfig = getAisConfig();
    
    // Check if vessel has a supported identifier (prefer MMSI, fallback to IMO)
    let identifier, type;
    if (vessel.mmsi) {
      identifier = String(vessel.mmsi);
      type = 'mmsi';
    } else if (vessel.imo) {
      // Clean IMO - remove 'IMO' prefix if present
      identifier = String(vessel.imo).replace(/^IMO/i, '').trim();
      type = 'imo';
    } else {
      return res.status(400).json({ 
        message: `Vessel does not have a supported identifier. The current AIS provider (${aisConfig.provider}) requires: ${aisConfig.supportedIdentifiers.join(' or ')}.` 
      });
    }
    
    const track = await fetchTrack(identifier, { type, hours });
    
    res.json(track);
  } catch (error) {
    console.error('AIS vessel track error:', error);
    // Map specific errors to appropriate status codes
    if (error.message.includes('not found')) {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes('Invalid API credentials') || error.message.includes('not configured')) {
      return res.status(500).json({ message: 'AIS API configuration error' });
    }
    res.status(500).json({ message: error.message || 'Failed to fetch vessel track' });
  }
});

export default router;
