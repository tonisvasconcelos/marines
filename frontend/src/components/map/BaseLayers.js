/**
 * BaseLayers Configuration
 * Defines map base layers and nautical chart overlays
 * Similar to MarineTraffic layer system
 */

/**
 * Base Layer Definitions
 */
export const BASE_LAYERS = {
  standard: {
    id: 'standard',
    name: 'Standard Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    minZoom: 0,
    maxZoom: 19,
    subdomains: 'abc',
  },
  nautical: {
    id: 'nautical',
    name: 'Nautical Chart',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', // Base layer
    attribution: '© OpenStreetMap contributors',
    minZoom: 0,
    maxZoom: 19,
    subdomains: 'abc',
    // Nautical overlay will be added separately
  },
  hybrid: {
    id: 'hybrid',
    name: 'Hybrid (Standard + Nautical)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    minZoom: 0,
    maxZoom: 19,
    subdomains: 'abc',
  },
};

/**
 * Nautical Chart Overlay (OpenSeaMap)
 * Maritime navigation marks, buoys, etc.
 */
export const NAUTICAL_OVERLAY = {
  id: 'nautical-overlay',
  name: 'Nautical Marks',
  url: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
  attribution: '© OpenSeaMap contributors',
  minZoom: 0,
  maxZoom: 18,
  opacity: 0.8,
};

/**
 * Google Maps Layer (if API key available)
 */
export function createGoogleMapsLayer() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  
  return {
    id: 'google-maps',
    name: 'Google Maps',
    type: 'google',
    apiKey,
  };
}

/**
 * Get base layer configuration
 */
export function getBaseLayerConfig(layerId) {
  return BASE_LAYERS[layerId] || BASE_LAYERS.standard;
}

/**
 * Default base layer
 */
export const DEFAULT_BASELAYER = 'standard';

