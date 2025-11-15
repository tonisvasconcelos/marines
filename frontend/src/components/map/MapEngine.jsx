/**
 * MapEngine Component
 * MapLibre GL JS initialization and base layer management
 * Provides MyShipTracking-style vector tile rendering
 */

import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { normalizeVesselPosition } from '../../utils/coordinateUtils';

/**
 * MapLibre Style Definitions
 * Vector tile sources similar to MyShipTracking
 */
export const MAP_STYLES = {
  standard: {
    id: 'standard',
    name: 'Standard',
    url: 'https://demotiles.maplibre.org/style.json', // Free MapLibre style
    // Alternative: OpenStreetMap-based style
    // url: 'https://tiles.openstreetmap.org/{z}/{x}/{y}.png' (raster fallback)
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    url: 'https://demotiles.maplibre.org/style.json', // Will use dark variant
    // For production, use a proper dark style URL
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite',
    // Use raster tiles for satellite (MapLibre can overlay raster)
    rasterUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
  nautical: {
    id: 'nautical',
    name: 'Nautical',
    url: 'https://demotiles.maplibre.org/style.json',
    // Overlay with OpenSeaMap seamarks
    overlayUrl: 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png',
  },
};

/**
 * MapEngine Component
 * Handles MapLibre map initialization, base layers, and core map functionality
 */
export function MapEngine({ 
  mapContainerRef, 
  onMapReady, 
  initialCenter = [-43.1729, -22.9068], // [lon, lat] for MapLibre
  initialZoom = 8,
  baseLayer = 'standard',
  onBaseLayerChange,
}) {
  const mapRef = useRef(null);
  const baseLayerRef = useRef(null);
  const overlayLayersRef = useRef([]);

  // Initialize MapLibre map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Use a simple OpenStreetMap-based style for now
    // In production, you'd use a proper MapLibre style URL
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-layer',
            type: 'raster',
            source: 'osm-tiles',
          },
        ],
      },
      center: initialCenter, // [longitude, latitude]
      zoom: initialZoom,
      attributionControl: true,
      // Performance optimizations
      antialias: true,
      preserveDrawingBuffer: true,
    });

    // Add navigation controls (zoom buttons)
    map.addControl(new maplibregl.NavigationControl(), 'top-left');

    // Add fullscreen control
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');

    // Wait for map to load
    map.on('load', () => {
      console.log('[MapEngine] MapLibre map loaded');
      mapRef.current = map;
      
      // Load base layer
      loadBaseLayer(baseLayer);
      
      if (onMapReady) {
        onMapReady(map);
      }
    });

    // Handle map errors
    map.on('error', (e) => {
      console.error('[MapEngine] Map error:', e);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Load base layer
  const loadBaseLayer = useCallback((layerId) => {
    if (!mapRef.current || !mapRef.current.isStyleLoaded()) return;

    const map = mapRef.current;
    const styleConfig = MAP_STYLES[layerId] || MAP_STYLES.standard;

    // Remove existing overlay layers
    overlayLayersRef.current.forEach((overlayLayerId) => {
      if (map.getLayer(overlayLayerId)) {
        map.removeLayer(overlayLayerId);
      }
      if (map.getSource(overlayLayerId)) {
        map.removeSource(overlayLayerId);
      }
    });
    overlayLayersRef.current = [];

    // For raster layers (satellite), add as raster source
    if (styleConfig.rasterUrl) {
      // Remove existing base source
      if (map.getSource('base-tiles')) {
        if (map.getLayer('base-layer')) {
          map.removeLayer('base-layer');
        }
        map.removeSource('base-tiles');
      }

      map.addSource('base-tiles', {
        type: 'raster',
        tiles: [styleConfig.rasterUrl],
        tileSize: 256,
      });

      map.addLayer({
        id: 'base-layer',
        type: 'raster',
        source: 'base-tiles',
      });
    } else {
      // For standard/nautical, use OSM tiles
      if (!map.getSource('base-tiles')) {
        map.addSource('base-tiles', {
          type: 'raster',
          tiles: ['https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'],
          tileSize: 256,
          attribution: '© OpenStreetMap contributors',
        });

        if (!map.getLayer('base-layer')) {
          map.addLayer({
            id: 'base-layer',
            type: 'raster',
            source: 'base-tiles',
          });
        }
      }
    }

    // Add nautical overlay if needed
    if (layerId === 'nautical' && styleConfig.overlayUrl) {
      if (map.getSource('nautical-overlay')) {
        if (map.getLayer('nautical-overlay-layer')) {
          map.removeLayer('nautical-overlay-layer');
        }
        map.removeSource('nautical-overlay');
      }

      map.addSource('nautical-overlay', {
        type: 'raster',
        tiles: [styleConfig.overlayUrl],
        tileSize: 256,
      });

      map.addLayer({
        id: 'nautical-overlay-layer',
        type: 'raster',
        source: 'nautical-overlay',
        paint: {
          'raster-opacity': 0.8,
        },
      });

      overlayLayersRef.current.push('nautical-overlay-layer');
    }

    baseLayerRef.current = layerId;
  }, []);

  // Update base layer when prop changes
  useEffect(() => {
    if (mapRef.current && baseLayer !== baseLayerRef.current) {
      loadBaseLayer(baseLayer);
    }
  }, [baseLayer, loadBaseLayer]);

  // Expose map instance via ref
  useEffect(() => {
    if (mapRef.current && onMapReady) {
      // Map is already ready, just expose it
    }
  }, [onMapReady]);

  return null; // This component doesn't render anything directly
}

export default MapEngine;

