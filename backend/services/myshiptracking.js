/**
 * MyShipTracking API Service
 * Documentation: https://api.myshiptracking.com/
 * 
 * Provides vessel position, track, and zone queries via REST API
 * Supports both MMSI and IMO identifiers
 */

import { 
  getCached, 
  setCached, 
  getPositionCacheKey, 
  getZoneCacheKey, 
  getTrackCacheKey,
  CACHE_TTL 
} from './cache.js';
import { 
  createMyShipTrackingError, 
  formatErrorResponse 
} from './myshiptrackingErrors.js';

const API_BASE_URL = process.env.MYSHIPTRACKING_API_URL || 'https://api.myshiptracking.com';
const API_VERSION = 'v2';

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
 * MyShipTracking uses headers for authentication, not query parameters
 */
function getAuthParams() {
  const apiKey = getApiKey();
  const secretKey = getSecretKey();
  
  if (!apiKey || !secretKey) {
    throw new Error('MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY must be set');
  }
  
  return {
    apiKey,
    secretKey,
  };
}

/**
 * Make HTTP request to MyShipTracking API
 * Authentication uses headers (x-api-key and x-api-secret), not query parameters
 */
async function makeRequest(endpoint, params = {}) {
  const authParams = getAuthParams();
  
  // Build query string for endpoint parameters only (no auth params in query)
  const queryParts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(String(value));
      queryParts.push(`${encodedKey}=${encodedValue}`);
    }
  }
  const queryString = queryParts.join('&');
  const url = `${API_BASE_URL}/api/${API_VERSION}/${endpoint}${queryString ? `?${queryString}` : ''}`;
  
  console.log('[MyShipTracking] API Request:', {
    endpoint,
    url: url.replace(/\?.*$/, '?[PARAMS]'), // Hide query params in log
    paramsCount: Object.keys(params).length,
    hasAuthParams: !!authParams.apiKey && !!authParams.secretKey,
    apiKeyLength: authParams.apiKey?.length || 0,
    secretKeyLength: authParams.secretKey?.length || 0,
    apiKeyFirstChars: authParams.apiKey?.substring(0, 5) || 'N/A',
    secretKeyFirstChars: authParams.secretKey?.substring(0, 3) || 'N/A',
  });
  
  try {
    // MyShipTracking API uses Authorization Bearer header
    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${authParams.apiKey}`,
    };
    
    const response = await fetch(url, { 
      headers,
      method: 'GET',
    });
    
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // If response is not JSON, get text instead
      const text = await response.text();
      console.error('[MyShipTracking] Non-JSON response:', {
        status: response.status,
        statusText: response.statusText,
        text: text.substring(0, 500),
        endpoint,
      });
      throw new Error(`API returned non-JSON response: ${response.status} ${response.statusText}`);
    }
    
    if (!response.ok) {
      // Create standardized error
      const standardizedError = createMyShipTrackingError(data, response.status, endpoint);
      
      console.error('[MyShipTracking] API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorCode: standardizedError.code,
        errorMessage: standardizedError.message,
        endpoint,
        userFacing: standardizedError.userFacing,
        responseData: data,
        apiKeyLength: authParams.apiKey?.length || 0,
        secretKeyLength: authParams.secretKey?.length || 0,
        apiKeyFirstChars: authParams.apiKey?.substring(0, 5) || 'N/A',
        secretKeyFirstChars: authParams.secretKey?.substring(0, 3) || 'N/A',
      });
      
      // Create error object with standardized information
      const error = new Error(standardizedError.message);
      error.code = standardizedError.code;
      error.status = standardizedError.status;
      error.userFacing = standardizedError.userFacing;
      error.description = standardizedError.description;
      error.retryAfter = standardizedError.retryAfter;
      error.endpoint = standardizedError.endpoint;
      error.originalError = standardizedError.originalError;
      
      throw error;
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
  // MyShipTracking API v2 response structure:
  // { status: "success", data: { vessel_name, mmsi, imo, lat, lng, course, speed, nav_status, received, ... } }
  // Reference: https://api.myshiptracking.com/docs/vessel-current-position-api
  if (response.status === 'error') {
    console.warn('[MyShipTracking] API returned error status in response:', response);
    return null;
  }
  
  const vessel = response.data || response.vessel || response;
  
  if (!vessel) {
    return null;
  }
  
  // Extract position data - API uses 'lat' and 'lng' (not 'lon')
  const lat = vessel.lat;
  const lng = vessel.lng;
  
  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    return null;
  }
  
  return {
    mmsi: String(vessel.mmsi || ''),
    imo: vessel.imo ? String(vessel.imo) : undefined,
    name: vessel.vessel_name || vessel.name,
    callSign: vessel.callsign || vessel.call_sign,
    lat: Number(lat),
    lon: Number(lng), // API uses 'lng', we normalize to 'lon' for internal use
    cog: vessel.course !== undefined ? Number(vessel.course) : undefined,
    sog: vessel.speed !== undefined ? Number(vessel.speed) : undefined,
    heading: vessel.heading !== undefined ? Number(vessel.heading) : undefined,
    navStatus: vessel.nav_status || vessel.navigational_status,
    timestamp: vessel.received || vessel.timestamp || new Date().toISOString(), // API uses 'received' field
    destination: vessel.destination,
    eta: vessel.eta,
    draught: vessel.draught || vessel.draft,
    // Extended response fields (if available)
    vesselType: vessel.vessel_type || vessel.vtype,
    flag: vessel.flag,
    currentPort: vessel.current_port,
    lastPort: vessel.last_port,
    nextPort: vessel.next_port,
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
/**
 * Normalize MyShipTracking zone vessels response to app format
 * API v2 response structure: { status: "success", data: [{ vessel_name, mmsi, imo, lat, lng, course, speed, nav_status, received, ... }] }
 * Reference: https://api.myshiptracking.com/docs/vessels-in-zone
 */
function normalizeZoneVessels(response) {
  // API returns data as an array directly: { status: "success", data: [...] }
  const vessels = response.data || response.vessels || [];
  
  if (!Array.isArray(vessels)) {
    return [];
  }
  
  return vessels.map((vessel) => {
    // API uses 'lat' and 'lng' (not 'lon')
    const lat = vessel.lat;
    const lng = vessel.lng;
    
    if (lat === undefined || lng === undefined || lat === null || lng === null) {
      return null;
    }
    
    return {
      mmsi: String(vessel.mmsi || ''),
      imo: vessel.imo ? String(vessel.imo) : undefined,
      name: vessel.vessel_name || vessel.name,
      callSign: vessel.callsign || vessel.call_sign,
      lat: Number(lat),
      lon: Number(lng), // API uses 'lng', we normalize to 'lon' for internal use
      lng: Number(lng), // Also provide lng for compatibility
      cog: vessel.course !== undefined ? Number(vessel.course) : undefined,
      sog: vessel.speed !== undefined ? Number(vessel.speed) : undefined,
      heading: vessel.heading !== undefined ? Number(vessel.heading) : undefined,
      navStatus: vessel.nav_status || vessel.navigational_status,
      timestamp: vessel.received || vessel.timestamp || new Date().toISOString(), // API uses 'received' field
      vesselType: vessel.vessel_type || vessel.vtype,
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
  const secretKey = getSecretKey();
  if (!apiKey || !secretKey) {
    console.error('[MyShipTracking] API credentials not configured:', {
      hasApiKey: !!apiKey,
      hasSecretKey: !!secretKey,
    });
    throw new Error('MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY must be set');
  }
  
  // Check cache first
  const cacheKey = getPositionCacheKey(identifier, type);
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[MyShipTracking] Using cached position:', {
      identifier,
      type,
    });
    return cached;
  }
  
  console.log('[MyShipTracking] Fetching position:', {
    identifier,
    type,
    apiKeyPresent: !!apiKey,
  });
  
  try {
    // Use the correct endpoint: /vessel with query parameters (mmsi or imo)
    // API docs: https://api.myshiptracking.com/docs/vessel-current-position-api
    const params = type === 'imo' ? { imo: identifier } : { mmsi: identifier };
    const response = await makeRequest('vessel', params);
    const position = normalizePosition(response);
    
    if (position) {
      // Cache the position for 60 seconds
      setCached(cacheKey, position, CACHE_TTL.POSITION);
      
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
  const secretKey = getSecretKey();
  if (!apiKey || !secretKey) {
    console.error('[MyShipTracking] API credentials not configured:', {
      hasApiKey: !!apiKey,
      hasSecretKey: !!secretKey,
    });
    throw new Error('MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY must be set');
  }
  
  // Check cache first
  const cacheKey = getTrackCacheKey(identifier, type, hours);
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[MyShipTracking] Using cached track:', {
      identifier,
      type,
      hours,
      pointsCount: cached.length,
    });
    return cached;
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
    
    // Cache the track for 15 minutes
    setCached(cacheKey, track, CACHE_TTL.TRACK);
    
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
  const secretKey = getSecretKey();
  if (!apiKey || !secretKey) {
    console.error('[MyShipTracking] API credentials not configured:', {
      hasApiKey: !!apiKey,
      hasSecretKey: !!secretKey,
    });
    throw new Error('MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY must be set');
  }
  
  // Check cache first
  const cacheKey = getZoneCacheKey(bounds);
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[MyShipTracking] Using cached zone vessels:', {
      bounds,
      vesselsCount: cached.length,
    });
    return cached;
  }
  
  console.log('[MyShipTracking] Fetching vessels in zone:', {
    minlat: bounds.minlat,
    minlon: bounds.minlon,
    maxlat: bounds.maxlat,
    maxlon: bounds.maxlon,
    max,
  });
  
  try {
    // Use the correct endpoint: /vessel/zone with bounding box parameters
    // API docs: https://api.myshiptracking.com/docs/vessels-in-zone
    const params = {
      minlat: Number(bounds.minlat),
      minlon: Number(bounds.minlon),
      maxlat: Number(bounds.maxlat),
      maxlon: Number(bounds.maxlon),
    };
    
    const response = await makeRequest('vessel/zone', params);
    const vessels = normalizeZoneVessels(response);
    
    // Limit results if needed
    const limitedVessels = vessels.slice(0, max);
    
    // Cache the zone results for 5 minutes
    setCached(cacheKey, limitedVessels, CACHE_TTL.ZONE);
    
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

/**
 * Fetch port estimates (expected arrivals) for a specific port
 * API docs: https://api.myshiptracking.com/docs/port-estimate-arrivals
 * @param {string|number} portId - Port ID (integer) or UN/LOCODE
 * @param {object} options - Options object
 * @param {boolean} options.useUnloco - If true, use unloco parameter instead of port_id
 * @returns {Promise<Array>} Array of port estimate objects
 */
export async function fetchPortEstimates(portId, { useUnloco = false } = {}) {
  const apiKey = getApiKey();
  const secretKey = getSecretKey();
  if (!apiKey || !secretKey) {
    console.error('[MyShipTracking] API credentials not configured:', {
      hasApiKey: !!apiKey,
      hasSecretKey: !!secretKey,
    });
    throw new Error('MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY must be set');
  }
  
  // Check cache first
  const cacheKey = `port-estimates:${portId}:${useUnloco ? 'unloco' : 'portid'}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[MyShipTracking] Using cached port estimates:', {
      portId,
      estimatesCount: cached.length,
    });
    return cached;
  }
  
  console.log('[MyShipTracking] Fetching port estimates:', {
    portId,
    useUnloco,
  });
  
  try {
    const params = useUnloco 
      ? { unloco: String(portId) }
      : { port_id: Number(portId) };
    
    const response = await makeRequest('port/estimate', params);
    const estimates = normalizePortEstimates(response);
    
    // Cache for 5 minutes (estimates change frequently)
    setCached(cacheKey, estimates, 300); // 5 minutes
    
    console.log('[MyShipTracking] Successfully fetched port estimates:', {
      portId,
      estimatesCount: estimates.length,
    });
    
    return estimates;
  } catch (error) {
    console.error('[MyShipTracking] Error fetching port estimates:', {
      portId,
      useUnloco,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Fetch port calls for a specific port or vessel
 * API docs: https://api.myshiptracking.com/docs/port-calls
 * @param {object} params - Query parameters
 * @param {string|number} params.portId - Port ID (optional, if using port)
 * @param {string} params.unloco - UN/LOCODE (optional, if using port)
 * @param {string|number} params.mmsi - MMSI (optional, if using vessel)
 * @param {string} params.fromdate - Start date (ISO 8601, optional)
 * @param {string} params.todate - End date (ISO 8601, optional)
 * @param {number} params.days - Number of days back (optional, default 30)
 * @param {number} params.type - Event type: 0=all, 1=arrivals, 2=departures (optional)
 * @returns {Promise<Array>} Array of port call objects
 */
export async function fetchPortCalls(params) {
  const apiKey = getApiKey();
  const secretKey = getSecretKey();
  if (!apiKey || !secretKey) {
    console.error('[MyShipTracking] API credentials not configured:', {
      hasApiKey: !!apiKey,
      hasSecretKey: !!secretKey,
    });
    throw new Error('MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY must be set');
  }
  
  // Build cache key from params
  const cacheKey = `port-calls:${JSON.stringify(params)}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[MyShipTracking] Using cached port calls:', {
      params,
      callsCount: cached.length,
    });
    return cached;
  }
  
  console.log('[MyShipTracking] Fetching port calls:', params);
  
  try {
    // Build query parameters
    const queryParams = {};
    if (params.portId) queryParams.port_id = Number(params.portId);
    if (params.unloco) queryParams.unloco = String(params.unloco);
    if (params.mmsi) queryParams.mmsi = String(params.mmsi);
    if (params.fromdate) queryParams.fromdate = String(params.fromdate);
    if (params.todate) queryParams.todate = String(params.todate);
    if (params.days) queryParams.days = Number(params.days);
    if (params.type !== undefined) queryParams.type = Number(params.type);
    
    const response = await makeRequest('port/calls', queryParams);
    const calls = normalizePortCalls(response);
    
    // Cache for 15 minutes (port calls don't change as frequently)
    setCached(cacheKey, calls, 900); // 15 minutes
    
    console.log('[MyShipTracking] Successfully fetched port calls:', {
      params,
      callsCount: calls.length,
    });
    
    return calls;
  } catch (error) {
    console.error('[MyShipTracking] Error fetching port calls:', {
      params,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Fetch vessels currently in port
 * API docs: https://api.myshiptracking.com/docs/in-port-api
 * @param {string|number} portId - Port ID (integer) or UN/LOCODE
 * @param {object} options - Options object
 * @param {boolean} options.useUnloco - If true, use unloco parameter instead of port_id
 * @returns {Promise<Array>} Array of vessel objects
 */
export async function fetchVesselsInPort(portId, { useUnloco = false } = {}) {
  const apiKey = getApiKey();
  const secretKey = getSecretKey();
  if (!apiKey || !secretKey) {
    console.error('[MyShipTracking] API credentials not configured:', {
      hasApiKey: !!apiKey,
      hasSecretKey: !!secretKey,
    });
    throw new Error('MYSHIPTRACKING_API_KEY and MYSHIPTRACKING_SECRET_KEY must be set');
  }
  
  // Check cache first
  const cacheKey = `vessels-in-port:${portId}:${useUnloco ? 'unloco' : 'portid'}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('[MyShipTracking] Using cached vessels in port:', {
      portId,
      vesselsCount: cached.length,
    });
    return cached;
  }
  
  console.log('[MyShipTracking] Fetching vessels in port:', {
    portId,
    useUnloco,
  });
  
  try {
    const params = useUnloco 
      ? { unloco: String(portId) }
      : { port_id: Number(portId) };
    
    const response = await makeRequest('port/in-port', params);
    const vessels = normalizeVesselsInPort(response);
    
    // Cache for 5 minutes (vessels in port change frequently)
    setCached(cacheKey, vessels, 300); // 5 minutes
    
    console.log('[MyShipTracking] Successfully fetched vessels in port:', {
      portId,
      vesselsCount: vessels.length,
    });
    
    return vessels;
  } catch (error) {
    console.error('[MyShipTracking] Error fetching vessels in port:', {
      portId,
      useUnloco,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Normalize MyShipTracking port estimates response to app format
 * API v2 response structure: { status: "success", data: [{ mmsi, imo, vessel_name, eta_utc, eta_local, ... }] }
 */
function normalizePortEstimates(response) {
  // Check for error status
  if (response.status === 'error') {
    console.warn('[MyShipTracking] API returned error status in port estimates response:', response);
    return [];
  }
  
  const estimates = response.data || [];
  
  if (!Array.isArray(estimates)) {
    return [];
  }
  
  return estimates.map((est) => ({
    mmsi: est.mmsi ? String(est.mmsi) : null,
    imo: est.imo ? String(est.imo) : null,
    vesselName: est.vessel_name || est.name,
    vesselType: est.vessel_type || est.vtype,
    flag: est.flag,
    gt: est.gt,
    dwt: est.dwt,
    built: est.built,
    length: est.length,
    width: est.width,
    etaUtc: est.eta_utc || est.eta,
    etaLocal: est.eta_local,
  }));
}

/**
 * Normalize MyShipTracking port calls response to app format
 * API v2 response structure: { status: "success", data: [{ mmsi, imo, vessel_name, arrival, departure, ... }] }
 */
function normalizePortCalls(response) {
  // Check for error status
  if (response.status === 'error') {
    console.warn('[MyShipTracking] API returned error status in port calls response:', response);
    return [];
  }
  
  const calls = response.data || [];
  
  if (!Array.isArray(calls)) {
    return [];
  }
  
  return calls.map((call) => ({
    mmsi: call.mmsi ? String(call.mmsi) : null,
    imo: call.imo ? String(call.imo) : null,
    vesselName: call.vessel_name || call.name,
    portId: call.port_id,
    portName: call.port_name || call.port,
    arrival: call.arrival || call.arrival_utc,
    departure: call.departure || call.departure_utc,
    arrivalLocal: call.arrival_local,
    departureLocal: call.departure_local,
    type: call.type, // 1=arrival, 2=departure
  }));
}

/**
 * Normalize MyShipTracking vessels in port response to app format
 * API v2 response structure: { status: "success", data: [{ mmsi, imo, vessel_name, ... }] }
 */
function normalizeVesselsInPort(response) {
  // Check for error status
  if (response.status === 'error') {
    console.warn('[MyShipTracking] API returned error status in vessels in port response:', response);
    return [];
  }
  
  const vessels = response.data || [];
  
  if (!Array.isArray(vessels)) {
    return [];
  }
  
  return vessels.map((vessel) => ({
    mmsi: vessel.mmsi ? String(vessel.mmsi) : null,
    imo: vessel.imo ? String(vessel.imo) : null,
    vesselName: vessel.vessel_name || vessel.name,
    vesselType: vessel.vessel_type || vessel.vtype,
    flag: vessel.flag,
    gt: vessel.gt,
    dwt: vessel.dwt,
    built: vessel.built,
    length: vessel.length,
    width: vessel.width,
    arrival: vessel.arrival || vessel.arrival_utc,
    arrivalLocal: vessel.arrival_local,
  }));
}
