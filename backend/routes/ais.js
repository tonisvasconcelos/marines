import express from 'express';
import {
  fetchLatestPositionByMmsi,
  fetchTrackByMmsi,
  fetchVesselsInZone,
} from '../services/aisstream.js';
import * as vesselDb from '../db/vessels.js';

const router = express.Router();

// Helper function to get AIS configuration
function getAisConfig() {
  // AISStream only supports MMSI
  // In the future, this could be tenant-specific or provider-specific
  return {
    provider: 'aisstream',
    supportedIdentifiers: ['MMSI'],
  };
}

// GET /api/ais/vessel/last-position?mmsi=123
router.get('/vessel/last-position', async (req, res) => {
  try {
    const { tenantId } = req;
    const { mmsi, imo } = req.query;
    const aisConfig = getAisConfig();
    
    // Check if provider supports the requested identifier
    if (imo && !mmsi && !aisConfig.supportedIdentifiers.includes('IMO')) {
      return res.status(400).json({ 
        message: `MMSI is required. The current AIS provider (${aisConfig.provider}) only supports: ${aisConfig.supportedIdentifiers.join(', ')}.` 
      });
    }
    
    if (!mmsi && !aisConfig.supportedIdentifiers.includes('IMO')) {
      return res.status(400).json({ 
        message: `mmsi is required. The current AIS provider (${aisConfig.provider}) only supports: ${aisConfig.supportedIdentifiers.join(', ')}.` 
      });
    }
    
    if (!mmsi && !imo) {
      return res.status(400).json({ 
        message: `Either mmsi or imo is required. Supported identifiers: ${aisConfig.supportedIdentifiers.join(', ')}.` 
      });
    }
    
    const position = await fetchLatestPositionByMmsi(String(mmsi));
    if (!position) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    // Try to find vessel by MMSI and store position history if found
    try {
      const vessel = await vesselDb.getVesselByMmsi(String(mmsi), tenantId);
      if (vessel) {
        const positionData = {
          lat: position.lat,
          lon: position.lon,
          timestamp: position.timestamp || new Date().toISOString(),
          sog: position.sog,
          cog: position.cog,
          heading: position.heading,
          navStatus: position.navStatus,
          source: 'aisstream',
        };
        await vesselDb.storePositionHistory(vessel.id, tenantId, positionData);
        console.log(`[AIS] Stored position history for vessel ${vessel.id} (MMSI: ${mmsi})`);
      }
    } catch (error) {
      console.warn('Failed to store position history for AIS position:', error.message);
      // Don't fail the request if history storage fails
    }
    
    res.json(position);
  } catch (error) {
    console.error('AIS last-position error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch position' });
  }
});

// GET /api/ais/vessel/track?mmsi=123
router.get('/vessel/track', async (req, res) => {
  try {
    const { mmsi, imo } = req.query;
    const aisConfig = getAisConfig();
    
    // Check if provider supports the requested identifier
    if (imo && !mmsi && !aisConfig.supportedIdentifiers.includes('IMO')) {
      return res.status(400).json({ 
        message: `MMSI is required. The current AIS provider (${aisConfig.provider}) only supports: ${aisConfig.supportedIdentifiers.join(', ')}.` 
      });
    }
    
    if (!mmsi && !aisConfig.supportedIdentifiers.includes('IMO')) {
      return res.status(400).json({ 
        message: `mmsi is required. The current AIS provider (${aisConfig.provider}) only supports: ${aisConfig.supportedIdentifiers.join(', ')}.` 
      });
    }
    
    if (!mmsi && !imo) {
      return res.status(400).json({ 
        message: `Either mmsi or imo is required. Supported identifiers: ${aisConfig.supportedIdentifiers.join(', ')}.` 
      });
    }
    
    const track = await fetchTrackByMmsi(String(mmsi));
    res.json(track);
  } catch (error) {
    console.error('AIS track error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch track' });
  }
});

// GET /api/ais/zone?minlon=&maxlon=&minlat=&maxlat=
router.get('/zone', async (req, res) => {
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
    console.error('AIS zone error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch vessels in zone' });
  }
});

// GET /api/ais/vessels/:vesselId/last-position - Bridge endpoint that accepts vesselId
router.get('/vessels/:vesselId/last-position', async (req, res) => {
  try {
    const { tenantId } = req;
    const { vesselId } = req.params;
    
    // Fetch vessel to get MMSI
    const vessel = await vesselDb.getVesselById(vesselId, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    const aisConfig = getAisConfig();
    
    // Check if vessel has a supported identifier
    const hasSupportedId = aisConfig.supportedIdentifiers.some(id => {
      if (id === 'MMSI') return !!vessel.mmsi;
      if (id === 'IMO') return !!vessel.imo;
      return false;
    });
    
    if (!hasSupportedId) {
      return res.status(400).json({ 
        message: `Vessel does not have a supported identifier. The current AIS provider (${aisConfig.provider}) requires: ${aisConfig.supportedIdentifiers.join(' or ')}.` 
      });
    }
    
    if (!vessel.mmsi && aisConfig.supportedIdentifiers.includes('MMSI')) {
      return res.status(400).json({ 
        message: `Vessel does not have an MMSI number. The current AIS provider (${aisConfig.provider}) requires MMSI for position queries.` 
      });
    }
    
    const position = await fetchLatestPositionByMmsi(String(vessel.mmsi));
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
        source: 'aisstream',
      };
      await vesselDb.storePositionHistory(vesselId, tenantId, positionData);
      console.log(`[AIS] Stored position history for vessel ${vesselId} (MMSI: ${vessel.mmsi})`);
    } catch (error) {
      console.warn('Failed to store position history:', error.message);
      // Don't fail the request if history storage fails
    }
    
    res.json(position);
  } catch (error) {
    console.error('AIS vessel last-position error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch vessel position' });
  }
});

// GET /api/ais/vessels/:vesselId/track - Bridge endpoint that accepts vesselId
router.get('/vessels/:vesselId/track', async (req, res) => {
  try {
    const { tenantId } = req;
    const { vesselId } = req.params;
    const hours = parseInt(req.query.hours) || 24;
    
    // Fetch vessel to get MMSI
    const vessel = await vesselDb.getVesselById(vesselId, tenantId);
    
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }
    
    const aisConfig = getAisConfig();
    
    // Check if vessel has a supported identifier
    const hasSupportedId = aisConfig.supportedIdentifiers.some(id => {
      if (id === 'MMSI') return !!vessel.mmsi;
      if (id === 'IMO') return !!vessel.imo;
      return false;
    });
    
    if (!hasSupportedId) {
      return res.status(400).json({ 
        message: `Vessel does not have a supported identifier. The current AIS provider (${aisConfig.provider}) requires: ${aisConfig.supportedIdentifiers.join(' or ')}.` 
      });
    }
    
    if (!vessel.mmsi && aisConfig.supportedIdentifiers.includes('MMSI')) {
      return res.status(400).json({ 
        message: `Vessel does not have an MMSI number. The current AIS provider (${aisConfig.provider}) requires MMSI for track queries.` 
      });
    }
    
    // Note: AISStream is real-time only, so we collect recent positions
    // The hours parameter is ignored as AISStream doesn't provide historical data
    const track = await fetchTrackByMmsi(String(vessel.mmsi), { 
      timeoutMs: Math.min(hours * 1000, 10000), // Cap timeout at 10s
      max: Math.min(hours * 10, 200) // Approximate max positions based on hours
    });
    
    res.json(track);
  } catch (error) {
    console.error('AIS vessel track error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch vessel track' });
  }
});

export default router;
