/**
 * Coordinate Utilities
 * Centralized functions for coordinate normalization and validation
 * CRITICAL: Preserves full decimal precision for accurate map plotting
 */

/**
 * Normalize and validate vessel position coordinates
 * CRITICAL: Ensures AIS coordinates are plotted correctly on Leaflet maps
 * 
 * Leaflet requires: L.marker([latitude, longitude])
 * AIS coordinates: latitude (-90 to 90), longitude (-180 to 180)
 * 
 * This function handles:
 * - Various field name formats (lat/lon, latitude/longitude, Lat/Lon, etc.)
 * - String to number conversion
 * - Coordinate validation
 * - Coordinate swapping detection (only if lat is clearly out of range)
 */
export function normalizeVesselPosition(position) {
  if (!position) {
    if (import.meta.env.DEV) {
      console.warn('[normalizeVesselPosition] Position is null/undefined');
    }
    return null;
  }
  
  // Extract coordinates from various field name formats (case-insensitive)
  // Priority: lat/lon > latitude/longitude > Lat/Lon > Latitude/Longitude
  const rawLat = position.lat ?? position.latitude ?? position.Lat ?? position.Latitude ?? null;
  const rawLon = position.lon ?? position.longitude ?? position.Lon ?? position.Longitude ?? null;
  
  // Debug logging in development mode
  if (import.meta.env.DEV) {
    console.log('[normalizeVesselPosition] Raw coordinates extracted:', {
      rawLat,
      rawLon,
      rawLatType: typeof rawLat,
      rawLonType: typeof rawLon,
      positionKeys: Object.keys(position),
      vesselName: position.vesselName || 'Unknown',
    });
  }
  
  if (rawLat === null || rawLon === null || rawLat === undefined || rawLon === undefined) {
    if (import.meta.env.DEV) {
      console.warn('[normalizeVesselPosition] Missing coordinates:', {
        hasLat: rawLat !== null && rawLat !== undefined,
        hasLon: rawLon !== null && rawLon !== undefined,
        position,
      });
    }
    return null;
  }
  
  // Convert to numbers if they're strings
  // Use parseFloat to preserve decimal precision (not parseInt!)
  let normalizedLat = typeof rawLat === 'string' ? parseFloat(rawLat) : Number(rawLat);
  let normalizedLon = typeof rawLon === 'string' ? parseFloat(rawLon) : Number(rawLon);
  
  // Validate coordinates are valid numbers (not NaN, not Infinity)
  if (!isFinite(normalizedLat) || !isFinite(normalizedLon)) {
    if (import.meta.env.DEV) {
      console.error('[normalizeVesselPosition] Invalid number conversion:', {
        rawLat,
        rawLon,
        normalizedLat,
        normalizedLon,
        position,
      });
    }
    return null;
  }
  
  // CRITICAL: Check if coordinates might be swapped
  // Only swap if lat is clearly out of valid range (-90 to 90) AND lon is within lat range
  // This prevents false positives for valid coordinates near poles
  const latOutOfRange = normalizedLat > 90 || normalizedLat < -90;
  const lonInLatRange = normalizedLon >= -90 && normalizedLon <= 90;
  
  if (latOutOfRange && lonInLatRange) {
    // Coordinates appear to be swapped - swap them back
    if (import.meta.env.DEV) {
      console.warn('[normalizeVesselPosition] Coordinates appear to be swapped, correcting:', { 
        original: { lat: normalizedLat, lon: normalizedLon },
        corrected: { lat: normalizedLon, lon: normalizedLat },
        vesselName: position.vesselName || 'Unknown',
      });
    }
    [normalizedLat, normalizedLon] = [normalizedLon, normalizedLat];
  }
  
  // Final validation - ensure coordinates are within valid ranges
  // Latitude: -90 to 90 (South to North)
  // Longitude: -180 to 180 (West to East)
  if (normalizedLat < -90 || normalizedLat > 90 || normalizedLon < -180 || normalizedLon > 180) {
    if (import.meta.env.DEV) {
      console.error('[normalizeVesselPosition] Invalid coordinate ranges:', { 
        lat: normalizedLat, 
        lon: normalizedLon,
        latRange: normalizedLat < -90 || normalizedLat > 90,
        lonRange: normalizedLon < -180 || normalizedLon > 180,
        vesselName: position.vesselName || 'Unknown',
        position,
      });
    }
    return null;
  }
  
  // Return normalized coordinates
  const result = {
    lat: normalizedLat,
    lon: normalizedLon,
  };
  
  if (import.meta.env.DEV) {
    console.log('[normalizeVesselPosition] Final normalized coordinates:', {
      ...result,
      vesselName: position.vesselName || 'Unknown',
      willPlotAt: `[${result.lat}, ${result.lon}]`, // Leaflet format
    });
  }
  
  return result;
}

