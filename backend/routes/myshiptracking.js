/**
 * MyShipTracking API v2 Proxy Routes
 * Secure proxy endpoints that use tenant's configured API key
 */

import express from 'express';
import { getAisConfig } from '../services/aisConfig.js';
import * as myshiptracking from '../services/myshiptracking.js';

const router = express.Router();

/**
 * Helper to get API config for tenant
 */
function getApiConfig(req) {
  const { tenantId } = req;
  const aisConfig = getAisConfig(tenantId);
  
  if (!aisConfig || aisConfig.provider !== 'myshiptracking' || !aisConfig.apiKey) {
    throw new Error('MyShipTracking API not configured for this tenant');
  }
  
  return {
    apiKey: aisConfig.apiKey,
    secretKey: aisConfig.secretKey || '',
  };
}

/**
 * GET /api/myshiptracking/search
 * Search vessels by name
 */
router.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || name.length < 3) {
      return res.json([]);
    }
    
    const { apiKey, secretKey } = getApiConfig(req);
    // Note: This uses the old API format, need to update to v2
    const results = await myshiptracking.searchVessels(name, apiKey, secretKey);
    res.json(results);
  } catch (error) {
    console.error('Error searching vessels:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/myshiptracking/vessel
 * Get vessel status (single)
 */
router.get('/vessel', async (req, res) => {
  try {
    const { mmsi, imo, response = 'simple' } = req.query;
    
    if (!mmsi && !imo) {
      return res.status(400).json({ error: 'Either mmsi or imo required' });
    }
    
    const { apiKey, secretKey } = getApiConfig(req);
    let result;
    
    if (mmsi) {
      result = await myshiptracking.getVesselByMmsi(mmsi, apiKey, secretKey);
    } else {
      result = await myshiptracking.getVesselByImo(imo, apiKey, secretKey);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching vessel status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/myshiptracking/vessel/bulk
 * Get bulk vessel status
 */
router.get('/vessel/bulk', async (req, res) => {
  try {
    const { mmsis, response = 'simple' } = req.query;
    
    if (!mmsis) {
      return res.status(400).json({ error: 'mmsis parameter required (comma-separated)' });
    }
    
    const mmsiArray = mmsis.split(',').map(s => s.trim()).filter(s => s);
    if (mmsiArray.length === 0 || mmsiArray.length > 100) {
      return res.status(400).json({ error: 'Must provide 1-100 MMSI values' });
    }
    
    const { apiKey, secretKey } = getApiConfig(req);
    // Note: Need to implement bulk endpoint in myshiptracking service
    const results = await Promise.all(
      mmsiArray.map(mmsi => 
        myshiptracking.getVesselByMmsi(mmsi, apiKey, secretKey).catch(err => {
          console.error(`Error fetching vessel ${mmsi}:`, err);
          return null;
        })
      )
    );
    
    res.json(results.filter(r => r !== null));
  } catch (error) {
    console.error('Error fetching bulk vessel status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/myshiptracking/vessel/nearby
 * Get vessels nearby a reference vessel
 */
router.get('/vessel/nearby', async (req, res) => {
  try {
    const { mmsi, radius = 20 } = req.query;
    
    if (!mmsi) {
      return res.status(400).json({ error: 'mmsi parameter required' });
    }
    
    const { apiKey, secretKey } = getApiConfig(req);
    const results = await myshiptracking.getVesselsNearby(
      parseFloat(radius),
      mmsi,
      apiKey,
      secretKey
    );
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching nearby vessels:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/myshiptracking/vessel/zone
 * Get vessels in a geographic zone
 */
router.get('/vessel/zone', async (req, res) => {
  try {
    const { minlon, maxlon, minlat, maxlat, minutesBack, response = 'simple' } = req.query;
    
    if (!minlon || !maxlon || !minlat || !maxlat) {
      return res.status(400).json({ error: 'minlon, maxlon, minlat, maxlat required' });
    }
    
    const { apiKey, secretKey } = getApiConfig(req);
    const zoneParams = {
      minlon: parseFloat(minlon),
      maxlon: parseFloat(maxlon),
      minlat: parseFloat(minlat),
      maxlat: parseFloat(maxlat),
    };
    
    // Build options object with optional parameters
    const options = {};
    if (minutesBack) {
      options.minutesBack = parseInt(minutesBack);
    }
    if (response) {
      options.response = response;
    }
    
    const results = await myshiptracking.getVesselsInZone(
      zoneParams,
      apiKey,
      secretKey,
      options
    );
    
    res.json(results);
  } catch (error) {
    console.error('Error fetching vessels in zone:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/myshiptracking/vessel/track
 * Get vessel historical track
 */
router.get('/vessel/track', async (req, res) => {
  try {
    const { mmsi, imo, fromdate, todate, days, timegroup } = req.query;
    
    if (!mmsi && !imo) {
      return res.status(400).json({ error: 'Either mmsi or imo required' });
    }
    
    const { apiKey, secretKey } = getApiConfig(req);
    // Note: Need to implement track endpoint in myshiptracking service
    // For now, return empty array
    res.json([]);
  } catch (error) {
    console.error('Error fetching vessel track:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

