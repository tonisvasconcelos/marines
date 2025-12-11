/**
 * Caching service for external API responses
 * Uses node-cache for in-memory caching
 * 
 * Cache TTLs:
 * - Vessel positions: 60 seconds (positions change frequently)
 * - Vessels in zone: 5 minutes (zone queries are expensive)
 * - Vessel tracks: 15 minutes (historical data)
 * - Port details: 1 hour (rarely changes)
 * - Fleet status: 30 seconds
 */

import NodeCache from 'node-cache';

// Create cache instance with default TTL of 5 minutes
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes default
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Better performance, but be careful with mutations
});

/**
 * Get cached value by key
 * @param {string} key - Cache key
 * @returns {*} Cached value or undefined if not found
 */
export function getCached(key) {
  const value = cache.get(key);
  if (value !== undefined) {
    console.log(`[Cache] HIT: ${key}`);
  } else {
    console.log(`[Cache] MISS: ${key}`);
  }
  return value;
}

/**
 * Set cached value with TTL
 * @param {string} key - Cache key
 * @param {*} value - Value to cache
 * @param {number} ttl - Time to live in seconds (default: 300)
 * @returns {boolean} Success status
 */
export function setCached(key, value, ttl = 300) {
  const success = cache.set(key, value, ttl);
  if (success) {
    console.log(`[Cache] SET: ${key} (TTL: ${ttl}s)`);
  }
  return success;
}

/**
 * Delete cached value
 * @param {string} key - Cache key
 * @returns {number} Number of deleted keys
 */
export function deleteCached(key) {
  const deleted = cache.del(key);
  if (deleted > 0) {
    console.log(`[Cache] DELETE: ${key}`);
  }
  return deleted;
}

/**
 * Clear all cached values
 */
export function clearCache() {
  cache.flushAll();
  console.log('[Cache] CLEARED: All cache entries cleared');
}

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export function getCacheStats() {
  const stats = cache.getStats();
  return {
    keys: stats.keys,
    hits: stats.hits,
    misses: stats.misses,
    ksize: stats.ksize,
    vsize: stats.vsize,
  };
}

/**
 * Generate cache key for vessel position
 * @param {string} identifier - MMSI or IMO
 * @param {string} type - 'mmsi' or 'imo'
 * @returns {string} Cache key
 */
export function getPositionCacheKey(identifier, type) {
  return `position:${type}:${identifier}`;
}

/**
 * Generate cache key for vessels in zone
 * @param {Object} bounds - Zone bounds { minlat, maxlat, minlon, maxlon }
 * @returns {string} Cache key
 */
export function getZoneCacheKey(bounds) {
  const { minlat, maxlat, minlon, maxlon } = bounds;
  // Round to 4 decimal places to create consistent keys for similar zones
  return `zone:${minlat.toFixed(4)}:${maxlat.toFixed(4)}:${minlon.toFixed(4)}:${maxlon.toFixed(4)}`;
}

/**
 * Generate cache key for vessel track
 * @param {string} identifier - MMSI or IMO
 * @param {string} type - 'mmsi' or 'imo'
 * @param {number} hours - Hours of history
 * @returns {string} Cache key
 */
export function getTrackCacheKey(identifier, type, hours = 24) {
  return `track:${type}:${identifier}:${hours}h`;
}

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  POSITION: 60,        // 1 minute - positions change frequently
  ZONE: 300,          // 5 minutes - zone queries are expensive
  TRACK: 900,         // 15 minutes - historical data
  PORT: 3600,         // 1 hour - port details rarely change
  FLEET_STATUS: 30,   // 30 seconds - fleet status changes moderately
};

