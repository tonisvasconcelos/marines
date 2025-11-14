/**
 * MyShipTracking API Service
 * Documentation: https://api.myshiptracking.com/
 */

const MYSHIPTRACKING_BASE_URL = 'https://api.myshiptracking.com';

/**
 * Get AIS configuration for a tenant
 */
function getAisConfig(tenantId) {
  // This will be imported from settings route or a shared config service
  // For now, we'll pass it as a parameter
  return null; // Will be passed from route
}

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
    if (value !== null && value !== undefined) {
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
      throw new Error(`MyShipTracking API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('MyShipTracking API request failed:', error);
    throw error;
  }
}

/**
 * Get vessel information by MMSI
 */
export async function getVesselByMmsi(mmsi, apiKey, secretKey) {
  return makeRequest('/vessels', apiKey, secretKey, { mmsi });
}

/**
 * Get vessel information by IMO
 */
export async function getVesselByImo(imo, apiKey, secretKey) {
  return makeRequest('/vessels', apiKey, secretKey, { imo });
}

/**
 * Get vessel current position
 */
export async function getVesselPosition(mmsi, apiKey, secretKey) {
  return makeRequest('/vessels', apiKey, secretKey, { mmsi });
}

/**
 * Search vessels by name
 */
export async function searchVessels(query, apiKey, secretKey, limit = 50) {
  return makeRequest('/vessels/search', apiKey, secretKey, { 
    name: query,
    limit 
  });
}

/**
 * Get port calls for a specific port
 */
export async function getPortCallsByPort(portId, apiKey, secretKey, options = {}) {
  const params = {
    port_id: portId,
    ...options,
  };
  return makeRequest('/portcalls', apiKey, secretKey, params);
}

/**
 * Get port calls by coordinates (for ops area)
 */
export async function getPortCallsByArea(latitude, longitude, radius, apiKey, secretKey, options = {}) {
  const params = {
    lat: latitude,
    lon: longitude,
    radius: radius || 50, // radius in nautical miles
    ...options,
  };
  return makeRequest('/portcalls', apiKey, secretKey, params);
}

/**
 * Get port calls by vessel MMSI
 */
export async function getPortCallsByVessel(mmsi, apiKey, secretKey, options = {}) {
  const params = {
    mmsi,
    ...options,
  };
  return makeRequest('/portcalls', apiKey, secretKey, params);
}

