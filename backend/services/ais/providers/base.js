/**
 * Base AIS Provider Interface
 * All AIS providers must implement this interface
 */

/**
 * Base AIS Provider class
 * Provides common functionality and defines the interface that all providers must implement
 */
export class BaseAisProvider {
  constructor(config) {
    this.config = config;
    this.providerName = this.constructor.name;
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getName() {
    return this.providerName;
  }

  /**
   * Fetch latest vessel position by MMSI or IMO
   * @param {string} identifier - MMSI or IMO number
   * @param {object} options - Options object
   * @param {string} options.type - 'mmsi' or 'imo'
   * @returns {Promise<object|null>} Normalized position data or null if not found
   * @abstract
   */
  async fetchLatestPosition(identifier, { type = 'mmsi' } = {}) {
    throw new Error('fetchLatestPosition must be implemented by provider');
  }

  /**
   * Fetch vessel historical track
   * @param {string} identifier - MMSI or IMO number
   * @param {object} options - Options object
   * @param {string} options.type - 'mmsi' or 'imo'
   * @param {number} options.hours - Number of hours of history (default: 24)
   * @returns {Promise<Array>} Array of position points
   * @abstract
   */
  async fetchTrack(identifier, { type = 'mmsi', hours = 24 } = {}) {
    throw new Error('fetchTrack must be implemented by provider');
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
   * @abstract
   */
  async fetchVesselsInZone(bounds, { max = 150 } = {}) {
    throw new Error('fetchVesselsInZone must be implemented by provider');
  }

  /**
   * Fetch port estimates (expected arrivals) for a specific port
   * @param {string|number} portId - Port ID or UN/LOCODE
   * @param {object} options - Options object
   * @param {boolean} options.useUnloco - If true, use unloco parameter instead of port_id
   * @returns {Promise<Array>} Array of port estimate objects
   * @abstract
   */
  async fetchPortEstimates(portId, { useUnloco = false } = {}) {
    throw new Error('fetchPortEstimates must be implemented by provider');
  }

  /**
   * Fetch port calls for a specific port or vessel
   * @param {object} params - Query parameters
   * @returns {Promise<Array>} Array of port call objects
   * @abstract
   */
  async fetchPortCalls(params) {
    throw new Error('fetchPortCalls must be implemented by provider');
  }

  /**
   * Fetch vessels currently in port
   * @param {string|number} portId - Port ID or UN/LOCODE
   * @param {object} options - Options object
   * @param {boolean} options.useUnloco - If true, use unloco parameter instead of port_id
   * @returns {Promise<Array>} Array of vessel objects
   * @abstract
   */
  async fetchVesselsInPort(portId, { useUnloco = false } = {}) {
    throw new Error('fetchVesselsInPort must be implemented by provider');
  }

  /**
   * Normalize position response to app format
   * @param {object} response - Raw API response
   * @returns {object|null} Normalized position data
   * @abstract
   */
  normalizePosition(response) {
    throw new Error('normalizePosition must be implemented by provider');
  }

  /**
   * Normalize track response to app format
   * @param {object} response - Raw API response
   * @returns {Array} Array of normalized track points
   * @abstract
   */
  normalizeTrack(response) {
    throw new Error('normalizeTrack must be implemented by provider');
  }

  /**
   * Normalize zone vessels response to app format
   * @param {object} response - Raw API response
   * @returns {Array} Array of normalized vessel positions
   * @abstract
   */
  normalizeZoneVessels(response) {
    throw new Error('normalizeZoneVessels must be implemented by provider');
  }

  /**
   * Check if provider is properly configured
   * @returns {boolean} True if provider is configured
   * @abstract
   */
  isConfigured() {
    throw new Error('isConfigured must be implemented by provider');
  }
}

