/**
 * VesselLayer Component
 * Renders vessels on MapLibre with clustering, rotation, and full-precision coordinates
 * MyShipTracking-style vessel rendering
 */

import { useEffect, useRef, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
// Using direct coordinate extraction (same as MapView) instead of normalizeVesselPosition

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
 * @param {Object} props
 * @param {Object} props.map - MapLibre map instance
 * @param {Array} props.vessels - Array of vessels to render
 * @param {Array} props.tenantVessels - Array of tenant vessel IDs or MMSIs for highlighting
 * @param {Function} props.onVesselClick - Callback when vessel is clicked
 * @param {Function} props.onVesselHover - Callback when vessel is hovered
 */
export function VesselLayer({ map, vessels, tenantVessels = [], onVesselClick, onVesselHover }) {
  const markersRef = useRef({});
  const popupRef = useRef(null);

  // Create a Set of tenant vessel identifiers (MMSI or ID) for quick lookup
  const tenantVesselSet = useMemo(() => {
    if (!tenantVessels || !Array.isArray(tenantVessels)) return new Set();
    return new Set(
      tenantVessels.map(v => {
        // Handle both vessel objects and simple IDs/MMSIs
        if (typeof v === 'string') return v;
        return v.mmsi || v.id || v;
      }).filter(Boolean)
    );
  }, [tenantVessels]);

  // Prepare vessel GeoJSON data with full-precision coordinates
  const vesselGeoJSON = useMemo(() => {
    if (!vessels || !Array.isArray(vessels) || vessels.length === 0) {
      if (import.meta.env.DEV) {
        console.log('[VesselLayer] No vessels provided or empty array');
      }
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    // Always log in production to diagnose issues
    console.log('[VesselLayer] Processing vessels:', {
      totalVessels: vessels.length,
      vesselsWithPosition: vessels.filter(v => {
        const pos = v.position || v;
        return pos && (pos.lat != null || pos.latitude != null) && (pos.lon != null || pos.longitude != null || pos.lng != null);
      }).length,
      sampleVessel: vessels[0],
      samplePosition: vessels[0]?.position,
      allVessels: vessels.map(v => ({
        id: v.id,
        name: v.name,
        hasPosition: !!v.position,
        position: v.position,
      })),
    });

    const features = vessels
      .map((vessel) => {
        // Handle both vessel.position structure and direct lat/lon structure (from zone API)
        const positionData = vessel.position || vessel;
        
        // Debug logging for vessels without positions
        // Check for lat/lon in various formats
        const hasLat = positionData?.lat != null || positionData?.latitude != null || vessel.lat != null;
        const hasLon = positionData?.lon != null || positionData?.longitude != null || positionData?.lng != null || vessel.lon != null || vessel.lng != null;
        
        if (!positionData || (!hasLat || !hasLon)) {
          console.warn('[VesselLayer] Skipping vessel without position:', {
            vesselId: vessel.id,
            vesselName: vessel.name,
            hasPositionObject: !!vessel.position,
            positionData,
            hasLat,
            hasLon,
          });
          return null;
        }

        // Extract coordinates using the same method as MapView (vessel detail page)
        // This ensures consistency with the working vessel card implementation
        let lat = positionData.lat ?? positionData.latitude ?? positionData.Lat ?? positionData.Latitude ?? vessel.lat ?? null;
        let lon = positionData.lon ?? positionData.longitude ?? positionData.Lon ?? positionData.Longitude ?? positionData.lng ?? vessel.lon ?? vessel.lng ?? null;
        
        // Convert to numbers if strings (use parseFloat to preserve full decimal precision)
        // CRITICAL: Do NOT use parseInt, Math.round, toFixed, or any rounding here
        if (typeof lat === 'string') lat = parseFloat(lat);
        if (typeof lon === 'string') lon = parseFloat(lon);
        
        // Convert to numbers if not already (preserve full precision)
        if (lat !== null) lat = Number(lat);
        if (lon !== null) lon = Number(lon);
        
        // Validate coordinates are valid numbers and within valid ranges
        if (lat == null || lon == null || !isFinite(lat) || !isFinite(lon)) {
          console.warn('[VesselLayer] Invalid coordinates (not finite):', {
            vesselId: vessel.id,
            vesselName: vessel.name,
            lat,
            lon,
            positionData,
          });
          return null;
        }
        
        // Validate latitude is between -90 and 90
        if (lat < -90 || lat > 90) {
          console.warn('[VesselLayer] Invalid latitude range:', {
            vesselId: vessel.id,
            vesselName: vessel.name,
            lat,
            lon,
          });
          return null;
        }
        
        // Validate longitude is between -180 and 180
        if (lon < -180 || lon > 180) {
          console.warn('[VesselLayer] Invalid longitude range:', {
            vesselId: vessel.id,
            vesselName: vessel.name,
            lat,
            lon,
          });
          return null;
        }
        
        // CRITICAL: Use full-precision coordinates (same as MapView)
        // MapLibre uses [lon, lat] format for coordinates
        console.log('[VesselLayer] ✅ Valid coordinates extracted:', {
          vesselId: vessel.id,
          vesselName: vessel.name,
          lat,
          lon,
          mapLibreFormat: [lon, lat],
        });

        // Get vessel properties (handle both position object and direct properties)
        const cog = positionData.cog ?? positionData.course ?? vessel.course ?? 0;
        const heading = positionData.heading ?? vessel.heading ?? cog;
        const rotation = cog || heading || 0;
        const status = vessel.status || positionData.navStatus || positionData.nav_status || 'AT_SEA';
        const vesselType = vessel.type || vessel.ship_type || vessel.vessel_type || '';
        
        // Check if this is a tenant vessel (match by MMSI or ID)
        const vesselMmsi = vessel.mmsi || positionData.mmsi;
        const vesselId = vessel.id;
        const isTenantVessel = (vesselMmsi && tenantVesselSet.has(String(vesselMmsi))) ||
                               (vesselId && tenantVesselSet.has(String(vesselId)));
        
        // Tenant vessels get colored markers, others get grey
        const color = isTenantVessel 
          ? getVesselTypeColor(vesselType, status)
          : '#94a3b8'; // Grey for non-tenant vessels

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
            sog: positionData.sog || positionData.speed || vessel.speed || null,
            navStatus: positionData.navStatus || positionData.nav_status || vessel.nav_status || null,
            timestamp: positionData.timestamp || vessel.timestamp || null,
            imo: vessel.imo || positionData.imo,
            mmsi: vesselMmsi,
            portCallId: vessel.portCallId,
            isTenantVessel, // Flag for tenant vessel
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
  }, [vessels, tenantVesselSet]);

  // Update vessel layer on MapLibre
  useEffect(() => {
    if (!map || !map.isStyleLoaded || typeof map.isStyleLoaded !== 'function' || !map.isStyleLoaded()) return;
    if (typeof map.getLayer !== 'function' || typeof map.addSource !== 'function') return;

    const sourceId = 'vessels';
    const layerId = 'vessels-layer';
    const clusterLayerId = 'vessels-clusters';
    const clusterCountLayerId = 'vessels-cluster-count';

    // Remove existing layers and sources (with safety checks)
    try {
      if (map.getLayer && map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getLayer && map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
      if (map.getLayer && map.getLayer(clusterCountLayerId)) map.removeLayer(clusterCountLayerId);
      if (map.getSource && map.getSource(sourceId)) map.removeSource(sourceId);
    } catch (error) {
      console.warn('[VesselLayer] Error removing existing layers:', error);
      // Continue anyway - layers might not exist yet
    }

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
      // CRITICAL: Check if map exists and is still valid before cleanup
      if (!map) {
        return;
      }
      
      // Check if map methods are available (map might be destroyed or in invalid state)
      if (typeof map.getLayer !== 'function' || typeof map.removeLayer !== 'function') {
        return;
      }
      
      try {
        // Check each layer exists before trying to remove it
        if (map.getLayer && map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getLayer && map.getLayer(clusterLayerId)) {
          map.removeLayer(clusterLayerId);
        }
        if (map.getLayer && map.getLayer(clusterCountLayerId)) {
          map.removeLayer(clusterCountLayerId);
        }
        if (map.getSource && map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (error) {
        // Map might be destroyed, ignore cleanup errors
        console.warn('[VesselLayer] Cleanup error (map may be destroyed):', error);
      }
    };
  }, [map, vesselGeoJSON, onVesselClick, onVesselHover]);

  return null; // This component doesn't render anything directly
}

export default VesselLayer;

