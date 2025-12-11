/**
 * AIS Service Public API
 * Provides a unified interface for AIS data fetching regardless of provider
 * 
 * This module exports the same functions as the original myshiptracking.js
 * to maintain backward compatibility while supporting multiple providers
 */

import { getProvider } from './providerFactory.js';

/**
 * Fetch latest vessel position by MMSI or IMO
 * @param {string} identifier - MMSI or IMO number
 * @param {object} options - Options object
 * @param {string} options.type - 'mmsi' or 'imo'
 * @returns {Promise<object|null>} Normalized position data or null if not found
 */
export async function fetchLatestPosition(identifier, { type = 'mmsi' } = {}) {
  const provider = getProvider();
  return provider.fetchLatestPosition(identifier, { type });
}

/**
 * Fetch latest vessel position by MMSI (backward compatibility)
 * @param {string} mmsi - MMSI number
 * @returns {Promise<object|null>} Normalized position data or null if not found
 */
export async function fetchLatestPositionByMmsi(mmsi) {
  return fetchLatestPosition(mmsi, { type: 'mmsi' });
}

/**
 * Fetch latest vessel position by IMO
 * @param {string} imo - IMO number
 * @returns {Promise<object|null>} Normalized position data or null if not found
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
  const provider = getProvider();
  return provider.fetchTrack(identifier, { type, hours });
}

/**
 * Fetch vessel track by MMSI (backward compatibility)
 * @param {string} mmsi - MMSI number
 * @param {object} options - Options object
 * @param {number} options.hours - Number of hours of history (default: 24)
 * @returns {Promise<Array>} Array of position points
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
  const provider = getProvider();
  return provider.fetchVesselsInZone(bounds, { max });
}

/**
 * Fetch port estimates (expected arrivals) for a specific port
 * @param {string|number} portId - Port ID or UN/LOCODE
 * @param {object} options - Options object
 * @param {boolean} options.useUnloco - If true, use unloco parameter instead of port_id
 * @returns {Promise<Array>} Array of port estimate objects
 */
export async function fetchPortEstimates(portId, { useUnloco = false } = {}) {
  const provider = getProvider();
  return provider.fetchPortEstimates(portId, { useUnloco });
}

/**
 * Fetch port calls for a specific port or vessel
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
  const provider = getProvider();
  return provider.fetchPortCalls(params);
}

/**
 * Fetch vessels currently in port
 * @param {string|number} portId - Port ID or UN/LOCODE
 * @param {object} options - Options object
 * @param {boolean} options.useUnloco - If true, use unloco parameter instead of port_id
 * @returns {Promise<Array>} Array of vessel objects
 */
export async function fetchVesselsInPort(portId, { useUnloco = false } = {}) {
  const provider = getProvider();
  return provider.fetchVesselsInPort(portId, { useUnloco });
}

// Re-export provider factory functions for advanced usage
export { getProvider, getProviderName } from './providerFactory.js';

