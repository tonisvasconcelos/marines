/**
 * MyShipTracking API Client
 * Official API v2 endpoints integration
 * Documentation: https://api.myshiptracking.com/
 */

const MYSHIPTRACKING_BASE_URL = 'https://api.myshiptracking.com';

/**
 * Get API base URL (use backend proxy for security)
 * VITE_API_URL should be the full backend URL (e.g., https://backend.railway.app)
 * We need to add /api prefix like the main api.js client does
 */
function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_URL 
    ? `${import.meta.env.VITE_API_URL}/api`
    : '/api';
  return baseUrl;
}

/**
 * Make request to backend proxy (which uses tenant's configured API key)
 */
async function makeProxyRequest<T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const fullUrl = baseUrl.startsWith('http') 
    ? `${baseUrl}${endpoint}`
    : `${window.location.origin}${baseUrl}${endpoint}`;
  const url = new URL(fullUrl);
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.append(key, String(value));
    }
  });

  const headers: HeadersInit = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  // Include auth token if available
  // The app stores the token as 'auth_token' (see AuthContext.jsx)
  const token = localStorage.getItem('auth_token');
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    // Always log to help debug production issues
    console.log('[MyShipTracking API] ✅ Authorization header added:', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
      headerValue: `Bearer ${token.substring(0, 20)}...`,
    });
  } else {
    // Critical error - always log
    console.error('[MyShipTracking API] ❌ No authentication token found!');
    console.error('[MyShipTracking API] localStorage keys:', Object.keys(localStorage));
    console.error('[MyShipTracking API] This will cause 401 Unauthorized errors');
    console.error('[MyShipTracking API] Please ensure you are logged in');
  }

  try {
    // Always log request details to debug auth issues
    console.log('[MyShipTracking API] Making request:', {
      url: url.toString(),
      hasAuthHeader: !!headers['Authorization'],
      authHeaderPresent: 'Authorization' in headers,
      headerKeys: Object.keys(headers),
      tokenAvailable: !!token,
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      
      if (response.status === 401) {
        console.error('[MyShipTracking API] ❌ 401 Unauthorized - Authentication failed!');
        console.error('[MyShipTracking API] Request details:', {
          endpoint: url.toString(),
          hasToken: !!token,
          tokenLength: token?.length || 0,
          authHeaderInRequest: 'Authorization' in headers,
          requestHeaders: Object.keys(headers),
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries()),
        });
        console.error('[MyShipTracking API] Check if token is valid and not expired');
      }
      
      throw new Error(errorData.error || errorData.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error('API request failed:', {
      endpoint,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Standard API response envelope
 */
interface ApiResponse<T> {
  status: 'ok' | 'error';
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Removed - using proxy instead

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface VesselSearchResult {
  vessel_name: string;
  mmsi: string;
  imo?: string;
  vessel_type?: string;
  flag?: string;
  area?: string;
}

export interface VesselStatus {
  mmsi: string;
  imo?: string;
  lat: number;
  lng: number;
  course?: number;
  speed?: number;
  nav_status?: string;
  timestamp?: string;
  // Extended fields
  callsign?: string;
  vessel_type?: string;
  draught?: number;
  length?: number;
  width?: number;
  ports?: Array<{
    port_name: string;
    port_country: string;
    eta?: string;
  }>;
  eta?: string;
  avg_speed?: number;
  max_speed?: number;
  distance_covered?: number;
  environmental?: {
    wind_speed?: number;
    wind_direction?: number;
    wave_height?: number;
    temperature?: number;
  };
}

export interface NearbyVessel extends VesselStatus {
  distance?: number; // Distance in NM
  bearing?: number; // Bearing in degrees
}

export interface TrackPoint {
  lat: number;
  lng: number;
  timestamp: string;
  course?: number;
  speed?: number;
}

export interface Bounds {
  minlon: number;
  maxlon: number;
  minlat: number;
  maxlat: number;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Search vessels by name
 * Endpoint: /api/v2/vessel/search
 */
export async function searchVessels(name: string): Promise<VesselSearchResult[]> {
  if (!name || name.length < 3) {
    return [];
  }

  return makeProxyRequest<VesselSearchResult[]>('/api/myshiptracking/search', {
    name: name.trim(),
  });
}

/**
 * Get vessel status (single vessel)
 * Endpoint: /api/v2/vessel
 */
export async function getVesselStatus(
  mmsi?: string,
  imo?: string,
  extended: boolean = false
): Promise<VesselStatus> {
  if (!mmsi && !imo) {
    throw new Error('Either mmsi or imo must be provided');
  }

  const params: Record<string, string | boolean> = {
    response: extended ? 'extended' : 'simple',
  };

  if (mmsi) {
    params.mmsi = mmsi;
  } else if (imo) {
    params.imo = imo;
  }

  return makeProxyRequest<VesselStatus>('/api/myshiptracking/vessel', params);
}

/**
 * Get bulk vessel status (multiple vessels)
 * Endpoint: /api/v2/vessel/bulk
 */
export async function getBulkStatus(
  mmsis: string[],
  extended: boolean = false
): Promise<VesselStatus[]> {
  if (!mmsis || mmsis.length === 0) {
    return [];
  }

  if (mmsis.length > 100) {
    console.warn('Bulk status limited to 100 vessels, truncating');
    mmsis = mmsis.slice(0, 100);
  }

  return makeProxyRequest<VesselStatus[]>('/api/myshiptracking/vessel/bulk', {
    mmsis: mmsis.join(','),
    response: extended ? 'extended' : 'simple',
  });
}

/**
 * Get vessels nearby a reference vessel
 * Endpoint: /api/v2/vessel/nearby
 */
export async function getVesselsNearby(
  mmsi: string,
  radius: number = 20,
  extended: boolean = false
): Promise<NearbyVessel[]> {
  if (!mmsi) {
    throw new Error('MMSI is required');
  }

  // Clamp radius to valid range (1-100 NM)
  const clampedRadius = Math.max(1, Math.min(100, radius));

  return makeProxyRequest<NearbyVessel[]>('/api/myshiptracking/vessel/nearby', {
    mmsi,
    radius: clampedRadius,
    response: extended ? 'extended' : 'simple',
  });
}

/**
 * Get vessels in a geographic zone (bounding box)
 * Endpoint: /api/v2/vessel/zone
 */
export async function getVesselsInZone(
  bounds: Bounds,
  minutesBack?: number,
  extended: boolean = false
): Promise<VesselStatus[]> {
  const params: Record<string, string | number | boolean> = {
    minlon: bounds.minlon,
    maxlon: bounds.maxlon,
    minlat: bounds.minlat,
    maxlat: bounds.maxlat,
    response: extended ? 'extended' : 'simple',
  };

  if (minutesBack !== undefined) {
    params.minutesBack = minutesBack;
  }

  return makeProxyRequest<VesselStatus[]>('/api/myshiptracking/vessel/zone', params);
}

/**
 * Get vessel historical track
 * Endpoint: /api/v2/vessel/track
 */
export async function getVesselTrack(
  mmsi?: string,
  imo?: string,
  from?: Date,
  to?: Date,
  days?: number,
  timegroup?: number
): Promise<TrackPoint[]> {
  if (!mmsi && !imo) {
    throw new Error('Either mmsi or imo must be provided');
  }

  const params: Record<string, string | number> = {};

  if (mmsi) {
    params.mmsi = mmsi;
  } else if (imo) {
    params.imo = imo;
  }

  if (from && to) {
    params.fromdate = from.toISOString().split('T')[0];
    params.todate = to.toISOString().split('T')[0];
  } else if (days) {
    params.days = days;
  } else {
    // Default to last 24 hours
    params.days = 1;
  }

  if (timegroup !== undefined) {
    params.timegroup = Math.max(1, Math.min(60, timegroup));
  }

  return makeProxyRequest<TrackPoint[]>('/api/myshiptracking/vessel/track', params);
}

