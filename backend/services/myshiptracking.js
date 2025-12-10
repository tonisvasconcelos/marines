/**
 * MyShipTracking API Service
 * Documentation: https://api.myshiptracking.com/
 * 
 * Provides vessel position, track, and zone queries via REST API
 * Supports both MMSI and IMO identifiers
 */

const API_BASE_URL = process.env.MYSHIPTRACKING_API_URL || 'https://api.myshiptracking.com';
const API_VERSION = 'v1';

/**
 * Get API key from environment variables
 */
function getApiKey() {
  return process.env.MYSHIPTRACKING_API_KEY;
}

/**
 * Get Secret key from environment variables
 */
function getSecretKey() {
  return process.env.MYSHIPTRACKING_SECRET_KEY;
}

/**
 * Get authentication parameters for API requests
 * MyShipTracking uses query parameters, not headers
 */
function getAuthParams() {
  const apiKey = getApiKey();
  const secretKey = getSecretKey();
  
  if (!apiKey || !secretKey) {
    throw new Error('MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY must be set');
  }
  
  return {
    apikey: apiKey,
    secret: secretKey,
  };
}

/**
 * Make HTTP request to MyShipTracking API
 * Authentication uses query parameters (apikey, secret), not headers
 */
async function makeRequest(endpoint, params = {}) {
  const authParams = getAuthParams();
  const allParams = { ...authParams, ...params };
  const queryString = new URLSearchParams(allParams).toString();
  const url = `${API_BASE_URL}/api/${API_VERSION}/${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  console.log('[MyShipTracking] API Request:', {
    endpoint,
    url: url.replace(/[?&](apikey|secret)=[^&]*/g, ''),
    paramsCount: Object.keys(params).length,
  });
  
  try {
    const response = await fetch(url, { 
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      method: 'GET',
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      const errorCode = data.error_code || 'UNKNOWN';
      const errorMessage = data.message || `API error: ${response.status}`;
      
      console.error('[MyShipTracking] API Error:', {
        status: response.status,
        errorCode,
        errorMessage,
        endpoint,
        responseData: data,
      });
      
      // Handle specific error codes
      if (response.status === 401) {
        throw new Error('Invalid API credentials');
      } else if (response.status === 402) {
        throw new Error('Insufficient credits');
      } else if (response.status === 404) {
        throw new Error('Vessel not found');
      } else if (response.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error connecting to MyShipTracking API');
    }
    throw error;
  }
}

/**
 * Normalize MyShipTracking vessel status response to app format
 */
function normalizePosition(response) {
  // MyShipTracking response structure may vary
  // Handle both simple and extended response formats
  const vessel = response.data?.vessel || response.vessel || response.data || response;
  
  if (!vessel) {
    return null;
  }
  
  // Extract position data
  const lat = vessel.latitude || vessel.lat;
  const lon = vessel.longitude || vessel.lon || vessel.lng;
  
  if (lat === undefined || lon === undefined || lat === null || lon === null) {
    return null;
  }
  
  return {
    mmsi: String(vessel.mmsi || vessel.MMSI || ''),
    imo: vessel.imo ? String(vessel.imo) : vessel.IMO ? String(vessel.IMO) : undefined,
    name: vessel.name || vessel.vessel_name || vessel.ship_name,
    callSign: vessel.call_sign || vessel.callSign || vessel.callsign,
    lat: Number(lat),
    lon: Number(lon),
    cog: vessel.cog !== undefined ? Number(vessel.cog) : vessel.course !== undefined ? Number(vessel.course) : undefined,
    sog: vessel.sog !== undefined ? Number(vessel.sog) : vessel.speed !== undefined ? Number(vessel.speed) : undefined,
    heading: vessel.heading !== undefined ? Number(vessel.heading) : undefined,
    navStatus: vessel.nav_status || vessel.navigational_status || vessel.status,
    timestamp: vessel.timestamp || vessel.last_position_time || vessel.position_time || new Date().toISOString(),
    destination: vessel.destination,
    eta: vessel.eta,
    draught: vessel.draught || vessel.draft,
  };
}

/**
 * Normalize MyShipTracking track/history response to app format
 */
function normalizeTrack(response) {
  const tracks = response.data?.track || response.track || response.data || [];
  
  if (!Array.isArray(tracks)) {
    return [];
  }
  
  return tracks
    .map((point) => {
      const lat = point.latitude || point.lat;
      const lon = point.longitude || point.lon || point.lng;
      
      if (lat === undefined || lon === undefined) {
        return null;
      }
      
      return {
        mmsi: String(point.mmsi || ''),
        lat: Number(lat),
        lon: Number(lon),
        timestamp: point.timestamp || point.time || point.position_time,
        cog: point.cog !== undefined ? Number(point.cog) : undefined,
        sog: point.sog !== undefined ? Number(point.sog) : undefined,
        heading: point.heading !== undefined ? Number(point.heading) : undefined,
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

/**
 * Normalize MyShipTracking zone vessels response to app format
 */
function normalizeZoneVessels(response) {
  const vessels = response.data?.vessels || response.vessels || response.data || [];
  
  if (!Array.isArray(vessels)) {
    return [];
  }
  
  return vessels.map((vessel) => {
    const lat = vessel.latitude || vessel.lat;
    const lon = vessel.longitude || vessel.lon || vessel.lng;
    
    if (lat === undefined || lon === undefined) {
      return null;
    }
    
    return {
      mmsi: String(vessel.mmsi || ''),
      imo: vessel.imo ? String(vessel.imo) : undefined,
      name: vessel.name || vessel.vessel_name || vessel.ship_name,
      callSign: vessel.call_sign || vessel.callSign,
      lat: Number(lat),
      lon: Number(lon),
      lng: Number(lon), // Also provide lng for compatibility
      cog: vessel.cog !== undefined ? Number(vessel.cog) : undefined,
      sog: vessel.sog !== undefined ? Number(vessel.sog) : undefined,
      heading: vessel.heading !== undefined ? Number(vessel.heading) : undefined,
      navStatus: vessel.nav_status || vessel.navigational_status,
      timestamp: vessel.timestamp || vessel.last_position_time || new Date().toISOString(),
    };
  }).filter(Boolean);
}

/**
 * Fetch latest vessel position by MMSI or IMO
 * @param {string} identifier - MMSI or IMO number
 * @param {object} options - Options object
 * @param {string} options.type - 'mmsi' or 'imo'
 * @returns {Promise<object|null>} Normalized position data or null if not found
 */
export async function fetchLatestPosition(identifier, { type = 'mmsi' } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('[MyShipTracking] MYSHIPTRACKING_API_KEY is not set');
    throw new Error('MYSHIPTRACKING_API_KEY is not configured');
  }
  
  console.log('[MyShipTracking] Fetching position:', {
    identifier,
    type,
    apiKeyPresent: !!apiKey,
  });
  
  try {
    const params = type === 'imo' ? { imo: identifier } : { mmsi: identifier };
    const response = await makeRequest('vessels', params);
    const position = normalizePosition(response);
    
    if (position) {
      console.log('[MyShipTracking] Successfully fetched position:', {
        identifier,
        type,
        lat: position.lat,
        lon: position.lon,
        mmsi: position.mmsi,
      });
    } else {
      console.warn('[MyShipTracking] No position data found:', {
        identifier,
        type,
        responseKeys: Object.keys(response),
      });
    }
    
    return position;
  } catch (error) {
    console.error('[MyShipTracking] Error fetching position:', {
      identifier,
      type,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Fetch latest vessel position by MMSI (backward compatibility)
 */
export async function fetchLatestPositionByMmsi(mmsi) {
  return fetchLatestPosition(mmsi, { type: 'mmsi' });
}

/**
 * Fetch latest vessel position by IMO
 */
export async function fetchLatestPositionByImo(imo) {
  return fetchLatestPosition(imo, { type: 'imo' });
}

/**
 * Fetch vessel historical track
 * @param {string} identifier - MMSI or IMO number
 * @param {object} options - Options object
 * @param {string} options.type - 'mmsi' or 'imo'
 * @param {number} options.hours - Number of hours of history (default: 24)
 * @returns {Promise<Array>} Array of position points
 */
export async function fetchTrack(identifier, { type = 'mmsi', hours = 24 } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('[MyShipTracking] MYSHIPTRACKING_API_KEY is not set');
    throw new Error('MYSHIPTRACKING_API_KEY is not configured');
  }
  
  console.log('[MyShipTracking] Fetching track:', {
    identifier,
    type,
    hours,
  });
  
  try {
    // Calculate date range
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - hours * 60 * 60 * 1000);
    
    // Format dates as ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)
    const fromDateStr = fromDate.toISOString().split('.')[0] + 'Z';
    const toDateStr = toDate.toISOString().split('.')[0] + 'Z';
    
    const params = {
      ...(type === 'imo' ? { imo: identifier } : { mmsi: identifier }),
      fromdate: fromDateStr,
      todate: toDateStr,
    };
    
    const response = await makeRequest('vessel/history', params);
    const track = normalizeTrack(response);
    
    console.log('[MyShipTracking] Successfully fetched track:', {
      identifier,
      type,
      pointsCount: track.length,
    });
    
    return track;
  } catch (error) {
    console.error('[MyShipTracking] Error fetching track:', {
      identifier,
      type,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Fetch vessel track by MMSI (backward compatibility)
 */
export async function fetchTrackByMmsi(mmsi, { hours = 24 } = {}) {
  return fetchTrack(mmsi, { type: 'mmsi', hours });
}

/**
 * Fetch vessels in a geographic zone
 * @param {object} bounds - Bounding box object
 * @param {number} bounds.minlat - Minimum latitude
 * @param {number} bounds.minlon - Minimum longitude
 * @param {number} bounds.maxlat - Maximum latitude
 * @param {number} bounds.maxlon - Maximum longitude
 * @param {object} options - Options object
 * @param {number} options.max - Maximum number of vessels to return (default: 150)
 * @returns {Promise<Array>} Array of vessel positions
 */
export async function fetchVesselsInZone(bounds, { max = 150 } = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('[MyShipTracking] MYSHIPTRACKING_API_KEY is not set');
    throw new Error('MYSHIPTRACKING_API_KEY is not configured');
  }
  
  console.log('[MyShipTracking] Fetching vessels in zone:', {
    minlat: bounds.minlat,
    minlon: bounds.minlon,
    maxlat: bounds.maxlat,
    maxlon: bounds.maxlon,
    max,
  });
  
  try {
    const params = {
      minlat: Number(bounds.minlat),
      minlon: Number(bounds.minlon),
      maxlat: Number(bounds.maxlat),
      maxlon: Number(bounds.maxlon),
    };
    
    const response = await makeRequest('vessels/in-zone', params);
    const vessels = normalizeZoneVessels(response);
    
    // Limit results if needed
    const limitedVessels = vessels.slice(0, max);
    
    console.log('[MyShipTracking] Successfully fetched vessels in zone:', {
      totalVessels: vessels.length,
      returnedVessels: limitedVessels.length,
    });
    
    return limitedVessels;
  } catch (error) {
    console.error('[MyShipTracking] Error fetching vessels in zone:', {
      bounds,
      error: error.message,
    });
    throw error;
  }
}
