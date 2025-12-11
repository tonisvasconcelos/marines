/**
 * Datalastic API Provider
 * Documentation: https://datalastic.com/api-reference/
 * 
 * Provides vessel position, track, and zone queries via REST API
 * Supports both MMSI and IMO identifiers
 */

import { BaseAisProvider } from './base.js';
import { 
  getCached, 
  setCached, 
  getPositionCacheKey, 
  getZoneCacheKey, 
  getTrackCacheKey,
  CACHE_TTL 
} from '../cache.js';
import { 
  createAisError
} from '../errors.js';

const API_BASE_URL = process.env.DATALASTIC_API_URL || 'https://api.datalastic.com';
const API_VERSION = 'v0';

/**
 * Calculate radius from bounding box in nautical miles
 * Uses Haversine formula to calculate distance between corners
 */
function calculateRadiusFromBounds(bounds) {
  const { minlat, maxlat, minlon, maxlon } = bounds;
  
  // Calculate center point
  const centerLat = (minlat + maxlat) / 2;
  const centerLon = (minlon + maxlon) / 2;
  
  // Calculate distance from center to corner (max distance)
  // Using Haversine formula
  const R = 3440; // Earth radius in nautical miles
  
  const lat1 = centerLat * Math.PI / 180;
  const lat2 = maxlat * Math.PI / 180;
  const lon1 = centerLon * Math.PI / 180;
  const lon2 = maxlon * Math.PI / 180;
  
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  // Datalastic max radius is 50NM, cap it
  return Math.min(distance, 50);
}

export class DatalasticProvider extends BaseAisProvider {
  constructor(config = {}) {
    super(config);
    this.providerName = 'Datalastic';
    this.apiBaseUrl = config.apiBaseUrl || API_BASE_URL;
    this.apiVersion = config.apiVersion || API_VERSION;
  }

  /**
   * Get API key from environment variables
   */
  getApiKey() {
    return process.env.DATALASTIC_API_KEY;
  }

  /**
   * Check if provider is properly configured
   */
  isConfigured() {
    const apiKey = this.getApiKey();
    return !!apiKey;
  }

  /**
   * Make HTTP request to Datalastic API
   */
  async makeRequest(endpoint, params = {}) {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      throw new Error('DATALASTIC_API_KEY must be set');
    }
    
    // Build query string including api-key parameter
    const queryParts = [];
    queryParts.push(`api-key=${encodeURIComponent(apiKey)}`);
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        const encodedKey = encodeURIComponent(key);
        const encodedValue = encodeURIComponent(String(value));
        queryParts.push(`${encodedKey}=${encodedValue}`);
      }
    }
    
    const queryString = queryParts.join('&');
    const url = `${this.apiBaseUrl}/api/${this.apiVersion}/${endpoint}?${queryString}`;
    
    console.log('[Datalastic] API Request:', {
      endpoint,
      url: url.replace(/api-key=[^&]+/, 'api-key=[HIDDEN]'), // Hide API key in log
      paramsCount: Object.keys(params).length,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyFirstChars: apiKey?.substring(0, 5) || 'N/A',
    });
    
    try {
      const headers = {
        'Accept': 'application/json',
      };
      
      const response = await fetch(url, { 
        headers,
        method: 'GET',
      });
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        const text = await response.text();
        console.error('[Datalastic] Non-JSON response:', {
          status: response.status,
          statusText: response.statusText,
          text: text.substring(0, 500),
          endpoint,
        });
        throw new Error(`API returned non-JSON response: ${response.status} ${response.statusText}`);
      }
      
      if (!response.ok) {
        const standardizedError = createAisError(data, response.status, endpoint, 'datalastic');
        
        console.error('[Datalastic] API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorCode: standardizedError.code,
          errorMessage: standardizedError.message,
          endpoint,
          userFacing: standardizedError.userFacing,
          responseData: data,
          apiKeyLength: apiKey?.length || 0,
          apiKeyFirstChars: apiKey?.substring(0, 5) || 'N/A',
        });
        
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
        throw new Error('Network error connecting to Datalastic API');
      }
      throw error;
    }
  }

  /**
   * Normalize Datalastic vessel response to app format
   * Datalastic response structure: { data: { vessel: {...} } } or { data: {...} }
   */
  normalizePosition(response) {
    // Datalastic may return error in response
    if (response.status === 'error' || response.error) {
      console.warn('[Datalastic] API returned error status in response:', response);
      return null;
    }
    
    // Extract vessel data - Datalastic wraps in data.vessel or data directly
    const vessel = response.data?.vessel || response.data || response.vessel || response;
    
    if (!vessel) {
      return null;
    }
    
    // Datalastic uses 'lat' and 'lon' (not 'lng')
    const lat = vessel.lat || vessel.latitude;
    const lon = vessel.lon || vessel.longitude;
    
    if (lat === undefined || lon === undefined || lat === null || lon === null) {
      return null;
    }
    
    return {
      mmsi: vessel.mmsi ? String(vessel.mmsi) : '',
      imo: vessel.imo ? String(vessel.imo) : undefined,
      name: vessel.name || vessel.vessel_name,
      callSign: vessel.callsign || vessel.call_sign,
      lat: Number(lat),
      lon: Number(lon),
      cog: vessel.course !== undefined ? Number(vessel.course) : vessel.cog !== undefined ? Number(vessel.cog) : undefined,
      sog: vessel.speed !== undefined ? Number(vessel.speed) : vessel.sog !== undefined ? Number(vessel.sog) : undefined,
      heading: vessel.heading !== undefined ? Number(vessel.heading) : undefined,
      navStatus: vessel.nav_status || vessel.navigational_status || vessel.status,
      timestamp: vessel.timestamp || vessel.received || vessel.last_position_time || new Date().toISOString(),
      destination: vessel.destination,
      eta: vessel.eta,
      draught: vessel.draught || vessel.draft,
      vesselType: vessel.vessel_type || vessel.type,
      flag: vessel.flag || vessel.country,
      currentPort: vessel.current_port,
      lastPort: vessel.last_port,
      nextPort: vessel.next_port,
    };
  }

  /**
   * Normalize Datalastic track/history response to app format
   */
  normalizeTrack(response) {
    // Datalastic vessel_history returns array of positions
    const tracks = response.data?.track || response.data || response.track || [];
    
    if (!Array.isArray(tracks)) {
      return [];
    }
    
    return tracks
      .map((point) => {
        const lat = point.lat || point.latitude;
        const lon = point.lon || point.longitude;
        
        if (lat === undefined || lon === undefined) {
          return null;
        }
        
        return {
          mmsi: String(point.mmsi || ''),
          lat: Number(lat),
          lon: Number(lon),
          timestamp: point.timestamp || point.time || point.position_time,
          cog: point.cog !== undefined ? Number(point.cog) : point.course !== undefined ? Number(point.course) : undefined,
          sog: point.sog !== undefined ? Number(point.sog) : point.speed !== undefined ? Number(point.speed) : undefined,
          heading: point.heading !== undefined ? Number(point.heading) : undefined,
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Normalize Datalastic zone vessels response to app format
   */
  normalizeZoneVessels(response) {
    // Datalastic vessel_inradius returns array of vessels
    const vessels = response.data || response.vessels || [];
    
    if (!Array.isArray(vessels)) {
      return [];
    }
    
    return vessels.map((vessel) => {
      const lat = vessel.lat || vessel.latitude;
      const lon = vessel.lon || vessel.longitude;
      
      if (lat === undefined || lon === undefined || lat === null || lon === null) {
        return null;
      }
      
      return {
        mmsi: String(vessel.mmsi || ''),
        imo: vessel.imo ? String(vessel.imo) : undefined,
        name: vessel.name || vessel.vessel_name,
        callSign: vessel.callsign || vessel.call_sign,
        lat: Number(lat),
        lon: Number(lon),
        lng: Number(lon), // Also provide lng for compatibility
        cog: vessel.course !== undefined ? Number(vessel.course) : vessel.cog !== undefined ? Number(vessel.cog) : undefined,
        sog: vessel.speed !== undefined ? Number(vessel.speed) : vessel.sog !== undefined ? Number(vessel.sog) : undefined,
        heading: vessel.heading !== undefined ? Number(vessel.heading) : undefined,
        navStatus: vessel.nav_status || vessel.navigational_status || vessel.status,
        timestamp: vessel.timestamp || vessel.received || vessel.last_position_time || new Date().toISOString(),
        vesselType: vessel.vessel_type || vessel.type,
      };
    }).filter(Boolean);
  }

  /**
   * Fetch latest vessel position by MMSI or IMO
   */
  async fetchLatestPosition(identifier, { type = 'mmsi' } = {}) {
    if (!this.isConfigured()) {
      throw new Error('DATALASTIC_API_KEY must be set');
    }
    
    // Check cache first
    const cacheKey = getPositionCacheKey(identifier, type);
    const cached = getCached(cacheKey);
    if (cached) {
      console.log('[Datalastic] Using cached position:', { identifier, type });
      return cached;
    }
    
    console.log('[Datalastic] Fetching position:', { identifier, type });
    
    try {
      // Datalastic uses /vessel endpoint with mmsi or imo parameter
      const params = type === 'imo' ? { imo: identifier } : { mmsi: identifier };
      const response = await this.makeRequest('vessel', params);
      const position = this.normalizePosition(response);
      
      if (position) {
        setCached(cacheKey, position, CACHE_TTL.POSITION);
        console.log('[Datalastic] Successfully fetched position:', {
          identifier,
          type,
          lat: position.lat,
          lon: position.lon,
        });
      }
      
      return position;
    } catch (error) {
      console.error('[Datalastic] Error fetching position:', {
        identifier,
        type,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Fetch vessel historical track
   */
  async fetchTrack(identifier, { type = 'mmsi', hours = 24 } = {}) {
    if (!this.isConfigured()) {
      throw new Error('DATALASTIC_API_KEY must be set');
    }
    
    // Check cache first
    const cacheKey = getTrackCacheKey(identifier, type, hours);
    const cached = getCached(cacheKey);
    if (cached) {
      console.log('[Datalastic] Using cached track:', {
        identifier,
        type,
        hours,
        pointsCount: cached.length,
      });
      return cached;
    }
    
    console.log('[Datalastic] Fetching track:', { identifier, type, hours });
    
    try {
      // Calculate date range - Datalastic uses YYYY-MM-DD format
      const toDate = new Date();
      const fromDate = new Date(toDate.getTime() - hours * 60 * 60 * 1000);
      
      const fromDateStr = fromDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const toDateStr = toDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const params = {
        ...(type === 'imo' ? { imo: identifier } : { mmsi: identifier }),
        from: fromDateStr,
        to: toDateStr,
      };
      
      const response = await this.makeRequest('vessel_history', params);
      const track = this.normalizeTrack(response);
      
      setCached(cacheKey, track, CACHE_TTL.TRACK);
      
      console.log('[Datalastic] Successfully fetched track:', {
        identifier,
        type,
        pointsCount: track.length,
      });
      
      return track;
    } catch (error) {
      console.error('[Datalastic] Error fetching track:', {
        identifier,
        type,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Fetch vessels in a geographic zone
   * Converts bounding box to center point + radius for Datalastic
   */
  async fetchVesselsInZone(bounds, { max = 150 } = {}) {
    if (!this.isConfigured()) {
      throw new Error('DATALASTIC_API_KEY must be set');
    }
    
    // Check cache first
    const cacheKey = getZoneCacheKey(bounds);
    const cached = getCached(cacheKey);
    if (cached) {
      console.log('[Datalastic] Using cached zone vessels:', {
        bounds,
        vesselsCount: cached.length,
      });
      return cached;
    }
    
    // Convert bounding box to center + radius
    const centerLat = (bounds.minlat + bounds.maxlat) / 2;
    const centerLon = (bounds.minlon + bounds.maxlon) / 2;
    const radius = calculateRadiusFromBounds(bounds);
    
    console.log('[Datalastic] Fetching vessels in zone:', {
      centerLat,
      centerLon,
      radius,
      max,
      originalBounds: bounds,
    });
    
    try {
      // Datalastic uses /vessel_inradius endpoint
      const params = {
        lat: Number(centerLat),
        lon: Number(centerLon),
        radius: Number(radius),
      };
      
      const response = await this.makeRequest('vessel_inradius', params);
      const vessels = this.normalizeZoneVessels(response);
      
      // Limit results if needed
      const limitedVessels = vessels.slice(0, max);
      
      setCached(cacheKey, limitedVessels, CACHE_TTL.ZONE);
      
      console.log('[Datalastic] Successfully fetched vessels in zone:', {
        totalVessels: vessels.length,
        returnedVessels: limitedVessels.length,
      });
      
      return limitedVessels;
    } catch (error) {
      console.error('[Datalastic] Error fetching vessels in zone:', {
        bounds,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Fetch port estimates (expected arrivals) for a specific port
   * Note: Datalastic may not have direct equivalent - return empty array with warning
   */
  async fetchPortEstimates(portId, { useUnloco = false } = {}) {
    console.warn('[Datalastic] Port estimates endpoint not available. Returning empty array.');
    return [];
  }

  /**
   * Fetch port calls for a specific port or vessel
   * Note: Datalastic may not have direct equivalent - return empty array with warning
   */
  async fetchPortCalls(params) {
    console.warn('[Datalastic] Port calls endpoint not available. Returning empty array.');
    return [];
  }

  /**
   * Fetch vessels currently in port
   * Note: Datalastic may not have direct equivalent - return empty array with warning
   */
  async fetchVesselsInPort(portId, { useUnloco = false } = {}) {
    console.warn('[Datalastic] Vessels in port endpoint not available. Returning empty array.');
    return [];
  }

  /**
   * Normalize port estimates response (not used for Datalastic)
   */
  normalizePortEstimates(response) {
    return [];
  }

  /**
   * Normalize port calls response (not used for Datalastic)
   */
  normalizePortCalls(response) {
    return [];
  }

  /**
   * Normalize vessels in port response (not used for Datalastic)
   */
  normalizeVesselsInPort(response) {
    return [];
  }
}

