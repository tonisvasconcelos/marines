/**
 * Map Base Layer Configuration
 * 
 * This file defines the available base map layers for the maritime operations dashboard.
 * Supports switching between Standard (OpenStreetMap) and Nautical Chart (OpenSeaMap) layers.
 * 
 * Environment Variables (configure in Vercel):
 * - VITE_NAUTICAL_TILES_URL: Optional custom nautical chart tile URL
 * - VITE_GOOGLE_MAPS_API_KEY: Optional Google Maps API key (already in use)
 */

/**
 * Base layer types
 * @typedef {'standard' | 'nautical'} BaseLayerType
 */

/**
 * Base layer configuration
 * @typedef {Object} BaseLayerConfig
 * @property {string} id - Unique identifier for the layer
 * @property {string} name - Display name for the layer
 * @property {string} url - Tile layer URL template
 * @property {string} attribution - Attribution text for the layer
 * @property {number} minZoom - Minimum zoom level
 * @property {number} maxZoom - Maximum zoom level
 * @property {string} [subdomains] - Subdomain letters for tile servers (e.g., 'abc')
 */

/**
 * Available base map layers
 * @type {Record<BaseLayerType, BaseLayerConfig>}
 */
export const MAP_BASELAYERS = {
  standard: {
    id: 'standard',
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 3,
    maxZoom: 19,
    subdomains: 'abc',
  },
  nautical: {
    id: 'nautical',
    name: 'Nautical Chart',
    // OpenSeaMap seamark overlay URL (shows buoys, lighthouses, navigation aids)
    // This is used as an overlay on top of OpenStreetMap base layer
    // Custom URL can be set via VITE_NAUTICAL_TILES_URL for other services
    url: import.meta.env.VITE_NAUTICAL_TILES_URL || 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openseamap.org">OpenSeaMap</a> contributors | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 3,
    maxZoom: 18,
    subdomains: 'abc',
    // Note: The nautical layer uses OpenStreetMap as base + OpenSeaMap seamark overlay
    // For production with full nautical charts, consider:
    // - NOAA RNC tiles (region-specific, requires chart ID): https://tileservice.charts.noaa.gov/tiles/{chartId}/{z}/{x}/{y}.png
    // - Chartbundle (requires API key)
    // - Custom WMS nautical chart service
    // Set VITE_NAUTICAL_TILES_URL to override the overlay, or modify loadBaseLayer() to use a full nautical base
  },
};

/**
 * Default base layer
 * @type {BaseLayerType}
 */
export const DEFAULT_BASELAYER = 'standard';

/**
 * Get base layer configuration by ID
 * @param {BaseLayerType} layerId - Layer identifier
 * @returns {BaseLayerConfig | null} Layer configuration or null if not found
 */
export function getBaseLayerConfig(layerId) {
  return MAP_BASELAYERS[layerId] || null;
}

/**
 * Check if a layer ID is valid
 * @param {string} layerId - Layer identifier to validate
 * @returns {boolean} True if valid
 */
export function isValidBaseLayer(layerId) {
  return layerId in MAP_BASELAYERS;
}

