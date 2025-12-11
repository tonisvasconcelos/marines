/**
 * AIS API Client (via backend proxy under /api/ais)
 * Supports multiple AIS providers (Datalastic, MyShipTracking, etc.)
 * The backend automatically routes to the configured provider
 */

/**
 * Get API base URL (use backend proxy for security)
 * VITE_API_URL should be the full backend URL (e.g., https://backend.railway.app)
 * We need to add /api prefix like the main api.js client does
 */
function getApiBaseUrl() {
  // @ts-ignore - Vite environment variables
  const viteApiUrl = import.meta.env?.VITE_API_URL;
  const baseUrl = viteApiUrl 
    ? `${viteApiUrl}/api`
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
    console.log('[AIS API] ✅ Authorization header added:', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
      headerValue: `Bearer ${token.substring(0, 20)}...`,
    });
  } else {
    // Critical error - always log
    console.error('[AIS API] ❌ No authentication token found!');
    console.error('[AIS API] localStorage keys:', Object.keys(localStorage));
    console.error('[AIS API] This will cause 401 Unauthorized errors');
    console.error('[AIS API] Please ensure you are logged in');
  }

  try {
    // Always log request details to debug auth issues
    console.log('[AIS API] Making request:', {
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
        console.error('[AIS API] ❌ 401 Unauthorized - Authentication failed!');
        console.error('[AIS API] Request details:', {
          endpoint: url.toString(),
          hasToken: !!token,
          tokenLength: token?.length || 0,
          authHeaderInRequest: 'Authorization' in headers,
          requestHeaders: Object.keys(headers),
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries()),
        });
        console.error('[AIS API] Check if token is valid and not expired');
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

function attachLng<T extends { lon?: number; lng?: number }>(item: T): T & { lng?: number } {
  if (item && item.lng === undefined && item.lon !== undefined) {
    return { ...item, lng: item.lon };
  }
  return item as T & { lng?: number };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Search vessels by name
 * Note: Not all providers support this endpoint
 */
export async function searchVessels(name: string): Promise<VesselSearchResult[]> {
  console.warn('[AIS API] Search not supported; returning empty list.');
    return [];
}

/**
 * Get vessel status (single vessel)
 * Endpoint: /api/ais/vessel/last-position
 * Note: AIS API supports both MMSI and IMO
 */
export async function getVesselStatus(
  mmsi?: string,
  imo?: string,
  extended: boolean = false
): Promise<VesselStatus> {
  if (!mmsi && !imo) {
    throw new Error('Either mmsi or imo must be provided');
  }

  const params: Record<string, string | boolean> = {};
  if (mmsi) {
    params.mmsi = mmsi;
  } else if (imo) {
    params.imo = imo;
  }

  const result = await makeProxyRequest<VesselStatus>('/ais/vessel/last-position', params);
  return attachLng(result);
}

/**
 * Get bulk vessel status (multiple vessels)
 */
export async function getBulkStatus(
  mmsis: string[],
  extended: boolean = false
): Promise<VesselStatus[]> {
  if (!mmsis || mmsis.length === 0) {
    return [];
  }

  const limited = mmsis.slice(0, 50);
  const results = await Promise.all(
    limited.map((id) =>
      getVesselStatus(id, undefined, extended).catch((err) => {
        console.warn('[AIS API] Bulk fetch failed for', id, err);
        return null;
      })
    )
  );
  return results.filter((r): r is VesselStatus => !!r).map(attachLng);
}

/**
 * Get vessels nearby a reference vessel
 * Note: Not all providers support this endpoint
 */
export async function getVesselsNearby(
  mmsi: string,
  radius: number = 20,
  extended: boolean = false
): Promise<NearbyVessel[]> {
  console.warn('[AIS API] Nearby query not supported; returning empty list.');
  return [];
}

/**
 * Get vessels in a geographic zone (bounding box)
 * Endpoint: /api/ais/zone
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
  };

  const data = await makeProxyRequest<VesselStatus[]>('/ais/zone', params);
  return data.map(attachLng);
}

/**
 * Get vessel historical track
 * Endpoint: /api/ais/vessel/track
 * Note: AIS API supports both MMSI and IMO
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

  // Calculate hours from days or date range
  if (days) {
    params.hours = days * 24;
  } else if (from && to) {
    const hoursDiff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60));
    params.hours = Math.min(hoursDiff, 168); // Cap at 7 days
  } else {
    params.hours = 24; // Default to 24 hours
  }

  const data = await makeProxyRequest<TrackPoint[]>('/ais/vessel/track', params);
  return data.map((p) => attachLng(p));
}

