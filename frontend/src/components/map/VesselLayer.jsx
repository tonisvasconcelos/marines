/**
 * VesselLayer Component
 * Renders vessels on MapLibre with clustering, rotation, and full-precision coordinates
 * MyShipTracking-style vessel rendering
 */

import { useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { normalizeVesselPosition } from '../../utils/coordinateUtils';

/**
 * Get vessel type color (MyShipTracking color scheme)
 */
function getVesselTypeColor(vesselType, status) {
  // Status-based colors (primary)
  if (status === 'IN_PORT') return '#10b981'; // Green
  if (status === 'INBOUND') return '#f59e0b'; // Amber
  if (status === 'AT_SEA') return '#3b82f6'; // Blue
  if (status === 'ANCHORED') return '#8b5cf6'; // Purple
  
  // Type-based colors
  const typeColors = {
    'CARGO': '#3b82f6',
    'TANKER': '#ef4444',
    'CONTAINER': '#8b5cf6',
    'PASSENGER': '#10b981',
    'FISHING': '#f59e0b',
    'TUG': '#f97316',
    'SUPPLY': '#06b6d4',
    'OFFSHORE': '#06b6d4',
  };
  
  const normalizedType = (vesselType || '').toUpperCase();
  return typeColors[normalizedType] || '#64748b';
}

/**
 * VesselLayer Component
 * Manages vessel rendering with clustering on MapLibre
 */
export function VesselLayer({ map, vessels, onVesselClick, onVesselHover }) {
  const markersRef = useRef({});
  const popupRef = useRef(null);

  // Prepare vessel GeoJSON data with full-precision coordinates
  const vesselGeoJSON = useMemo(() => {
    if (!vessels || !Array.isArray(vessels) || vessels.length === 0) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    const features = vessels
      .map((vessel) => {
        if (!vessel || !vessel.position) return null;

        // Normalize coordinates (preserves full precision)
        const normalizedPos = normalizeVesselPosition({
          ...vessel.position,
          vesselName: vessel.name,
        });

        if (!normalizedPos) return null;

        // CRITICAL: Use full-precision coordinates
        const lat = normalizedPos.lat;
        const lon = normalizedPos.lon;

        // Get vessel properties
        const cog = vessel.position?.cog ?? vessel.position?.course ?? 0;
        const heading = vessel.position?.heading ?? cog;
        const rotation = cog || heading || 0;
        const status = vessel.status || 'AT_SEA';
        const vesselType = vessel.type || vessel.ship_type || vessel.vessel_type || '';
        const color = getVesselTypeColor(vesselType, status);

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lon, lat], // MapLibre uses [lon, lat]
          },
          properties: {
            id: vessel.id,
            name: vessel.name,
            type: vesselType,
            status,
            color,
            rotation,
            cog,
            heading,
            sog: vessel.position?.sog || vessel.position?.speed || null,
            navStatus: vessel.position?.navStatus || vessel.position?.status || null,
            timestamp: vessel.position?.timestamp || null,
            imo: vessel.imo,
            mmsi: vessel.mmsi,
            portCallId: vessel.portCallId,
            // Store full vessel object for popup
            vesselData: vessel,
          },
        };
      })
      .filter((f) => f !== null);

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [vessels]);

  // Update vessel layer on MapLibre
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    const sourceId = 'vessels';
    const layerId = 'vessels-layer';
    const clusterLayerId = 'vessels-clusters';
    const clusterCountLayerId = 'vessels-cluster-count';

    // Remove existing layers and sources
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
    if (map.getLayer(clusterCountLayerId)) map.removeLayer(clusterCountLayerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);

    // Add vessel source
    map.addSource(sourceId, {
      type: 'geojson',
      data: vesselGeoJSON,
      cluster: true, // Enable clustering
      clusterMaxZoom: 14, // Max zoom to cluster points on
      clusterRadius: 50, // Radius of each cluster when clustering points
      clusterProperties: {
        // Keep separate counts for different vessel types
        sum: ['+', ['get', 'point_count']],
      },
    });

    // Add cluster circles
    map.addLayer({
      id: clusterLayerId,
      type: 'circle',
      source: sourceId,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#3b82f6',
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          20, // Default radius
          10, 30,  // 10+ vessels: 30px
          50, 40,  // 50+ vessels: 40px
          100, 50, // 100+ vessels: 50px
        ],
        'circle-opacity': 0.6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    // Add cluster count labels
    map.addLayer({
      id: clusterCountLayerId,
      type: 'symbol',
      source: sourceId,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{sum}',
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
      paint: {
        'text-color': '#fff',
      },
    });

    // Add individual vessel markers (non-clustered)
    // Use color-coded circles for now (can be enhanced with custom icons later)
    map.addLayer({
      id: layerId,
      type: 'circle',
      source: sourceId,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 8,
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
        'circle-opacity': 0.9,
      },
    });

    // Create a single vessel icon image (reusable for all vessels)
    // We'll use a generic icon and apply rotation via layout property
    const iconId = 'vessel-icon-generic';
    
    if (!map.hasImage(iconId)) {
      const size = 24;
      const arrowPath = `
        M ${size * 0.5} 0
        L ${size * 0.85} ${size * 0.5}
        L ${size * 0.75} ${size * 0.7}
        L ${size * 0.65} ${size * 0.85}
        L ${size * 0.35} ${size * 0.85}
        L ${size * 0.25} ${size * 0.7}
        L ${size * 0.15} ${size * 0.5}
        Z
      `;

      const svg = `
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="vessel-shadow">
              <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/>
            </filter>
          </defs>
          <path d="${arrowPath}" fill="#3b82f6" stroke="white" stroke-width="1.5" opacity="0.95" filter="url(#vessel-shadow)"/>
          <circle cx="${size * 0.5}" cy="${size * 0.3}" r="${size * 0.12}" fill="white" opacity="0.9"/>
        </svg>
      `;

      // Convert SVG to image and add to map
      const img = new Image();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        if (!map.hasImage(iconId)) {
          map.addImage(iconId, img);
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }

    // Handle clicks on clusters
    map.on('click', clusterLayerId, (e) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [clusterLayerId],
      });

      const clusterId = features[0].properties.cluster_id;
      const source = map.getSource(sourceId);

      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;

        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom: zoom,
        });
      });
    });

    // Handle clicks on individual vessels
    map.on('click', layerId, (e) => {
      const feature = e.features[0];
      if (feature && feature.properties.vesselData) {
        if (onVesselClick) {
          onVesselClick(feature.properties.vesselData);
        }
      }
    });

    // Handle hover on vessels
    map.on('mouseenter', layerId, () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', layerId, () => {
      map.getCanvas().style.cursor = '';
    });

    // Cleanup
    return () => {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
      if (map.getLayer(clusterCountLayerId)) map.removeLayer(clusterCountLayerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [map, vesselGeoJSON, onVesselClick, onVesselHover]);

  return null; // This component doesn't render anything directly
}

export default VesselLayer;

