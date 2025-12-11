/**
 * Re-export cache functions from services/cache.js
 * This allows providers to import from ais/cache.js
 */

export {
  getCached,
  setCached,
  deleteCached,
  clearCache,
  getCacheStats,
  getPositionCacheKey,
  getZoneCacheKey,
  getTrackCacheKey,
  CACHE_TTL,
} from '../cache.js';

