/**
 * MyShipTracking API Service
 * Documentation: https://api.myshiptracking.com/
 * 
 * API Endpoints:
 * - Vessel Current Position: https://api.myshiptracking.com/docs/vessel-current-position-api
 * - Vessels in Zone: https://api.myshiptracking.com/docs/vessels-in-zone
 * - Vessels Nearby: https://api.myshiptracking.com/docs/vessels-nearby
 * - Port Details: https://api.myshiptracking.com/docs/port-details
 * - Port Search: https://api.myshiptracking.com/docs/port-search
 * - In-Port API: https://api.myshiptracking.com/docs/in-port-api
 * - Port Estimate Arrivals: https://api.myshiptracking.com/docs/port-estimate-arrivals
 * - Port Calls: https://api.myshiptracking.com/docs/port-calls
 */

const MYSHIPTRACKING_BASE_URL = 'https://api.myshiptracking.com';

/**
 * Make authenticated request to MyShipTracking API
 */
async function makeRequest(endpoint, apiKey, secretKey, params = {}) {
  const url = new URL(`${MYSHIPTRACKING_BASE_URL}${endpoint}`);
  
  // Add API key and secret to query params
  url.searchParams.append('apikey', apiKey);
  if (secretKey && secretKey.trim() !== '') {
    url.searchParams.append('secret', secretKey);
  }
  
  // Add additional params
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.append(key, value);
    }
  });

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `MyShipTracking API error: ${response.status} - ${errorText}`;
      console.error(errorMessage);
      console.error('Request URL:', url.toString().replace(/apikey=[^&]+/, 'apikey=***').replace(/secret=[^&]+/, 'secret=***'));
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('MyShipTracking API response received:', {
      endpoint,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : [],
    });
    return data;
  } catch (error) {
    console.error('MyShipTracking API request failed:', {
      endpoint,
      error: error.message,
      url: url.toString().replace(/apikey=[^&]+/, 'apikey=***').replace(/secret=[^&]+/, 'secret=***'),
    });
    throw error;
  }
}

// ============================================================================
// VESSEL ENDPOINTS
// ============================================================================

/**
 * Get vessel information by MMSI
 * @param {string} mmsi - Vessel MMSI number
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 */
export async function getVesselByMmsi(mmsi, apiKey, secretKey) {
  return makeRequest('/vessels', apiKey, secretKey, { mmsi });
}

/**
 * Get vessel information by IMO
 * @param {string} imo - Vessel IMO number
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 */
export async function getVesselByImo(imo, apiKey, secretKey) {
  return makeRequest('/vessels', apiKey, secretKey, { imo });
}

/**
 * Get vessel current position
 * Documentation: https://api.myshiptracking.com/docs/vessel-current-position-api
 * @param {string} mmsi - Vessel MMSI number (or IMO)
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 * @param {string} identifier - 'mmsi' or 'imo'
 */
export async function getVesselCurrentPosition(identifier, identifierType = 'mmsi', apiKey, secretKey) {
  const params = identifierType === 'imo' ? { imo: identifier } : { mmsi: identifier };
  return makeRequest('/vessels', apiKey, secretKey, params);
}

/**
 * Get vessels in a specific zone (polygon or circle)
 * Documentation: https://api.myshiptracking.com/docs/vessels-in-zone
 * @param {Object} zone - Zone definition (polygon coordinates or circle with center + radius)
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 * @param {Object} options - Additional options (limit, etc.)
 */
export async function getVesselsInZone(zone, apiKey, secretKey, options = {}) {
  const params = {
    ...zone,
    ...options,
  };
  return makeRequest('/vessels/in-zone', apiKey, secretKey, params);
}

/**
 * Get vessels nearby a specific location
 * Documentation: https://api.myshiptracking.com/docs/vessels-nearby
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} radius - Radius in nautical miles
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 * @param {Object} options - Additional options (limit, etc.)
 */
export async function getVesselsNearby(latitude, longitude, radius, apiKey, secretKey, options = {}) {
  const params = {
    lat: latitude,
    lon: longitude,
    radius: radius,
    ...options,
  };
  return makeRequest('/vessels/nearby', apiKey, secretKey, params);
}

/**
 * Search vessels by name
 * @param {string} query - Search query (vessel name)
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 * @param {number} limit - Maximum results (default: 50)
 */
export async function searchVessels(query, apiKey, secretKey, limit = 50) {
  return makeRequest('/vessels/search', apiKey, secretKey, { 
    name: query,
    limit 
  });
}

// ============================================================================
// PORT ENDPOINTS
// ============================================================================

/**
 * Get port details
 * Documentation: https://api.myshiptracking.com/docs/port-details
 * This is used for Ops. Sites (operational sites like ports, terminals, berths)
 * @param {string|number} portIdentifier - Port ID or UN/LOCODE
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 */
export async function getPortDetails(portIdentifier, apiKey, secretKey) {
  // Try as port_id first (numeric), then as unloco (text)
  const params = isNaN(portIdentifier) 
    ? { unloco: portIdentifier }
    : { port_id: portIdentifier };
  return makeRequest('/port/details', apiKey, secretKey, params);
}

/**
 * Search ports
 * Documentation: https://api.myshiptracking.com/docs/port-search
 * @param {string} query - Search query (port name, city, country, etc.)
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 * @param {Object} options - Additional options (limit, country, etc.)
 */
export async function searchPorts(query, apiKey, secretKey, options = {}) {
  const params = {
    q: query,
    ...options,
  };
  return makeRequest('/port/search', apiKey, secretKey, params);
}

/**
 * Get vessels currently in port
 * Documentation: https://api.myshiptracking.com/docs/in-port-api
 * Used for dashboard when zooming into a port area
 * @param {string|number} portIdentifier - Port ID or UN/LOCODE
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 * @param {Object} options - Additional options (limit, etc.)
 */
export async function getVesselsInPort(portIdentifier, apiKey, secretKey, options = {}) {
  const params = isNaN(portIdentifier) 
    ? { unloco: portIdentifier }
    : { port_id: portIdentifier };
  return makeRequest('/port/in-port', apiKey, secretKey, { ...params, ...options });
}

/**
 * Get port estimated arrivals
 * Documentation: https://api.myshiptracking.com/docs/port-estimate-arrivals
 * @param {string|number} portIdentifier - Port ID or UN/LOCODE
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 * @param {Object} options - Additional options (hours, limit, etc.)
 */
export async function getPortEstimateArrivals(portIdentifier, apiKey, secretKey, options = {}) {
  const params = isNaN(portIdentifier) 
    ? { unloco: portIdentifier }
    : { port_id: portIdentifier };
  return makeRequest('/port/estimate-arrivals', apiKey, secretKey, { ...params, ...options });
}

/**
 * Get port calls
 * Documentation: https://api.myshiptracking.com/docs/port-calls
 * @param {Object} filters - Filter options (mmsi, port_id, unloco, fromdate, todate, days, type)
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 */
export async function getPortCalls(filters, apiKey, secretKey) {
  return makeRequest('/port/calls', apiKey, secretKey, filters);
}

/**
 * Get port calls for a specific port
 * @param {string|number} portIdentifier - Port ID or UN/LOCODE
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 * @param {Object} options - Additional options (fromdate, todate, days, type, limit)
 */
export async function getPortCallsByPort(portIdentifier, apiKey, secretKey, options = {}) {
  const params = isNaN(portIdentifier) 
    ? { unloco: portIdentifier }
    : { port_id: portIdentifier };
  return getPortCalls({ ...params, ...options }, apiKey, secretKey);
}

/**
 * Get port calls by coordinates (for ops area)
 * @param {number} latitude - Center latitude
 * @param {number} longitude - Center longitude
 * @param {number} radius - Radius in nautical miles
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 * @param {Object} options - Additional options (fromdate, todate, days, type, limit)
 */
export async function getPortCallsByArea(latitude, longitude, radius, apiKey, secretKey, options = {}) {
  return getPortCalls({
    lat: latitude,
    lon: longitude,
    radius: radius || 50,
    ...options,
  }, apiKey, secretKey);
}

/**
 * Get port calls by vessel MMSI
 * @param {string} mmsi - Vessel MMSI number
 * @param {string} apiKey - API key
 * @param {string} secretKey - Secret key (optional)
 * @param {Object} options - Additional options (fromdate, todate, days, type, limit)
 */
export async function getPortCallsByVessel(mmsi, apiKey, secretKey, options = {}) {
  return getPortCalls({ mmsi, ...options }, apiKey, secretKey);
}

// ============================================================================
// LEGACY COMPATIBILITY (for backward compatibility)
// ============================================================================

/**
 * Get vessel current position (legacy - uses MMSI)
 * @deprecated Use getVesselCurrentPosition instead
 */
export async function getVesselPosition(mmsi, apiKey, secretKey) {
  return getVesselCurrentPosition(mmsi, 'mmsi', apiKey, secretKey);
}
