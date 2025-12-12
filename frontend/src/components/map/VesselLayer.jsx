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
        // Since all vessels passed to dashboard are already tenant-filtered, default to true
        const vesselMmsi = vessel.mmsi || positionData.mmsi;
        const vesselId = vessel.id;
        const isTenantVessel = tenantVesselSet.size === 0 || // If no tenant vessels specified, assume all are tenant
                               (vesselMmsi && tenantVesselSet.has(String(vesselMmsi))) ||
                               (vesselId && tenantVesselSet.has(String(vesselId)));
        
        // Tenant vessels get colored markers, others get grey
        const color = isTenantVessel 
          ? getVesselTypeColor(vesselType, status)
          : '#94a3b8'; // Grey for non-tenant vessels
        
        console.log('[VesselLayer] Creating feature for vessel:', {
          vesselId,
          vesselName: vessel.name,
          isTenantVessel,
          color,
          coordinates: [lon, lat],
        });

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

    console.log('[VesselLayer] GeoJSON created:', {
      totalFeatures: features.length,
      features: features.map(f => ({
        id: f.properties.id,
        name: f.properties.name,
        coordinates: f.geometry.coordinates,
      })),
    });

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [vessels, tenantVesselSet]);

  // Store event handlers in refs to prevent duplicates and enable cleanup
  const eventHandlersRef = useRef({
    clusterClick: null,
    vesselClick: null,
    vesselMouseEnter: null,
    vesselMouseLeave: null,
    styleLoad: null,
  });

  // Update vessel layer on MapLibre
  useEffect(() => {
    if (!map || typeof map.getLayer !== 'function' || typeof map.addSource !== 'function') {
      console.warn('[VesselLayer] Map not ready or missing required methods');
      return;
    }

    const sourceId = 'vessels';
    const layerId = 'vessels-layer';
    const clusterLayerId = 'vessels-clusters';
    const clusterCountLayerId = 'vessels-cluster-count';

    // Function to initialize vessel layers (called when style is ready)
    const initializeVesselLayers = () => {
      if (!map.isStyleLoaded()) {
        console.warn('[VesselLayer] Style not loaded yet, cannot initialize layers');
        return;
      }

      // Remove existing layers first (with safety checks)
      try {
        if (map.getLayer && map.getLayer(layerId)) {
          map.removeLayer(layerId);
          console.log('[VesselLayer] Removed existing layer:', layerId);
        }
        if (map.getLayer && map.getLayer(clusterLayerId)) {
          map.removeLayer(clusterLayerId);
          console.log('[VesselLayer] Removed existing layer:', clusterLayerId);
        }
        if (map.getLayer && map.getLayer(clusterCountLayerId)) {
          map.removeLayer(clusterCountLayerId);
          console.log('[VesselLayer] Removed existing layer:', clusterCountLayerId);
        }
      } catch (error) {
        console.warn('[VesselLayer] Error removing existing layers:', error);
        // Continue anyway - layers might not exist yet
      }

    // Log vessel data for debugging
    console.log('[VesselLayer] Initializing with vessel data:', {
      totalFeatures: vesselGeoJSON.features.length,
      hasFeatures: vesselGeoJSON.features.length > 0,
      sampleFeature: vesselGeoJSON.features[0],
    });

    // Add or update vessel source
    const existingSource = map.getSource(sourceId);
    if (existingSource) {
      // Update existing source
      console.log('[VesselLayer] Updating existing source with', vesselGeoJSON.features.length, 'features');
      try {
        existingSource.setData(vesselGeoJSON);
        console.log('[VesselLayer] ✅ Source data updated successfully');
      } catch (error) {
        console.error('[VesselLayer] ❌ Error updating source data:', error);
        // If update fails, remove and recreate
        try {
          // Remove layers first
          if (map.getLayer && map.getLayer(layerId)) map.removeLayer(layerId);
          if (map.getLayer && map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
          if (map.getLayer && map.getLayer(clusterCountLayerId)) map.removeLayer(clusterCountLayerId);
          map.removeSource(sourceId);
          console.log('[VesselLayer] Removed source and layers to recreate');
        } catch (removeError) {
          console.warn('[VesselLayer] Error removing source:', removeError);
        }
        existingSource = null; // Will be recreated below
      }
    }
    
    // Add new source if it doesn't exist or was removed
    if (!existingSource || !map.getSource(sourceId)) {
      try {
        console.log('[VesselLayer] Adding new source with', vesselGeoJSON.features.length, 'features');
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
        console.log('[VesselLayer] ✅ Source added successfully');
      } catch (error) {
        console.error('[VesselLayer] ❌ Error adding source:', error);
        console.error('[VesselLayer] Error details:', {
          message: error.message,
          stack: error.stack,
          vesselGeoJSON: vesselGeoJSON,
        });
        return; // Can't continue without source
      }
    }

    // Always re-add layers (they were removed above)
    // Add cluster circles
    try {
      if (!map.getLayer(clusterLayerId)) {
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
        console.log('[VesselLayer] ✅ Cluster layer added');
      }
    } catch (error) {
      console.error('[VesselLayer] ❌ Error adding cluster layer:', error);
    }

    // Add cluster count labels
    try {
      if (!map.getLayer(clusterCountLayerId)) {
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
        console.log('[VesselLayer] ✅ Cluster count layer added');
      }
    } catch (error) {
      console.error('[VesselLayer] ❌ Error adding cluster count layer:', error);
    }

    // Function to add vessel layer (always adds circle layer first, upgrades to symbol if icon available)
    const addVesselLayer = () => {
      // Check if source exists
      if (!map.getSource(sourceId)) {
        console.warn('[VesselLayer] Source does not exist, cannot add layer');
        return;
      }

      try {
        // Always add circle layer first (works without icons, ensures vessels are visible)
        if (!map.getLayer(layerId)) {
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
          console.log('[VesselLayer] ✅ Circle layer added (vessels will be visible)');
        }
        
        // Try to upgrade to symbol layer if icon is available
        const iconExists = map.hasImage(iconId);
        if (iconExists) {
          try {
            // Remove circle layer and replace with symbol layer
            if (map.getLayer(layerId)) {
              map.removeLayer(layerId);
            }
            
            map.addLayer({
              id: layerId,
              type: 'symbol',
              source: sourceId,
              filter: ['!', ['has', 'point_count']], // Only non-clustered points
              layout: {
                'icon-image': iconId,
                'icon-size': 0.8, // Scale factor
                'icon-rotate': ['get', 'rotation'], // Rotate based on COG/heading
                'icon-rotation-alignment': 'map', // Rotate with map (not viewport)
                'icon-allow-overlap': true, // Always show vessels (don't hide on overlap)
                'icon-ignore-placement': true, // Don't prevent other symbols from showing
              },
              paint: {
                'icon-color': ['get', 'color'], // Data-driven color from vessel properties
                'icon-opacity': 0.95,
                'icon-halo-color': '#ffffff', // White halo for contrast
                'icon-halo-width': 1.5,
                'icon-halo-blur': 1,
              },
            });
            console.log('[VesselLayer] ✅ Upgraded to symbol layer (MarineTraffic-style with icon)');
          } catch (symbolError) {
            console.warn('[VesselLayer] ⚠️ Could not upgrade to symbol layer, keeping circle layer:', symbolError);
            // Circle layer is already added, so vessels are still visible
          }
        } else {
          console.log('[VesselLayer] Icon not ready yet, using circle layer (will upgrade when icon loads)');
        }
      } catch (error) {
        console.error('[VesselLayer] ❌ Error adding vessel layer:', error);
        console.error('[VesselLayer] Error details:', {
          message: error.message,
          stack: error.stack,
          layerId,
          sourceId,
          hasSource: !!map.getSource(sourceId),
        });
      }
    };

    // Create MarineTraffic-style vessel icon (SDF format for data-driven colors)
    // SDF (Signed Distance Field) allows us to change icon color dynamically
    const iconId = 'vessel-icon-sdf';
    
    // Helper to ensure icon exists and then add/upgrade vessel layer
    const ensureIconAndAddLayer = () => {
      // Always add circle layer first (ensures vessels are visible immediately)
      addVesselLayer();
      
      // If icon already exists, upgrade to symbol layer
      if (map.hasImage(iconId)) {
        console.log('[VesselLayer] Icon already exists, upgrading to symbol layer');
        addVesselLayer(); // This will upgrade from circle to symbol
        return;
      }

      // Icon doesn't exist, create it
      const size = 32; // Icon size in pixels
      const padding = 2; // Padding for SDF
      const canvas = document.createElement('canvas');
      canvas.width = size + padding * 2;
      canvas.height = size + padding * 2;
      const ctx = canvas.getContext('2d');
      
      // Draw ship shape (triangle pointing up, like MarineTraffic)
      // Center the drawing in the canvas
      const centerX = (size + padding * 2) / 2;
      const centerY = (size + padding * 2) / 2;
      
      ctx.fillStyle = '#ffffff'; // White for SDF (will be colored via icon-color)
      ctx.strokeStyle = '#000000'; // Black outline for contrast
      ctx.lineWidth = 1.5;
      
      // Draw ship triangle (pointing up = heading 0°)
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - size * 0.4); // Top point (bow)
      ctx.lineTo(centerX + size * 0.3, centerY + size * 0.3); // Bottom right (stern)
      ctx.lineTo(centerX - size * 0.3, centerY + size * 0.3); // Bottom left (stern)
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Add small circle at center (like MarineTraffic)
      ctx.beginPath();
      ctx.arc(centerX, centerY - size * 0.1, size * 0.08, 0, 2 * Math.PI);
      ctx.fillStyle = '#000000'; // Black center dot
      ctx.fill();
      
      // Convert canvas to image and add to map as SDF
      const img = new Image();
      img.onload = () => {
        // Check if map still exists and is valid
        if (!map || !map.isStyleLoaded || typeof map.addImage !== 'function') {
          console.warn('[VesselLayer] Map not available when icon loaded, using fallback');
          // Use fallback circle layer
          addVesselSymbolLayer();
          return;
        }
        
        try {
          // Add as SDF image to enable data-driven coloring
          if (!map.hasImage(iconId)) {
            map.addImage(iconId, img, { sdf: true });
            console.log('[VesselLayer] ✅ Vessel icon (SDF) added to map');
          }
          
          // After icon is added, upgrade to symbol layer
          // Use setTimeout to ensure icon is fully registered
          setTimeout(() => {
            addVesselLayer(); // This will upgrade from circle to symbol
          }, 50);
        } catch (error) {
          console.error('[VesselLayer] ❌ Error adding icon to map:', error);
          // Circle layer is already added, so vessels are still visible
        }
      };
      img.onerror = (error) => {
        console.error('[VesselLayer] ❌ Error loading vessel icon image:', error);
        // Circle layer is already added, so vessels are still visible
      };
      img.src = canvas.toDataURL();
    };

    // Ensure icon exists and add symbol layer
    ensureIconAndAddLayer();

      // Remove existing event handlers to prevent duplicates
      if (eventHandlersRef.current.clusterClick) {
        map.off('click', clusterLayerId, eventHandlersRef.current.clusterClick);
      }
      if (eventHandlersRef.current.vesselClick) {
        map.off('click', layerId, eventHandlersRef.current.vesselClick);
      }
      if (eventHandlersRef.current.vesselMouseEnter) {
        map.off('mouseenter', layerId, eventHandlersRef.current.vesselMouseEnter);
      }
      if (eventHandlersRef.current.vesselMouseLeave) {
        map.off('mouseleave', layerId, eventHandlersRef.current.vesselMouseLeave);
      }

      // Handle clicks on clusters
      const clusterClickHandler = (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: [clusterLayerId],
        });

        if (features.length === 0) return;

        const clusterId = features[0].properties.cluster_id;
        const source = map.getSource(sourceId);

        if (!source || typeof source.getClusterExpansionZoom !== 'function') return;

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;

          map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom,
          });
        });
      };
      map.on('click', clusterLayerId, clusterClickHandler);
      eventHandlersRef.current.clusterClick = clusterClickHandler;

      // Handle clicks on individual vessels
      const vesselClickHandler = (e) => {
        const feature = e.features[0];
        if (feature && feature.properties.vesselData) {
          if (onVesselClick) {
            onVesselClick(feature.properties.vesselData);
          }
        }
      };
      map.on('click', layerId, vesselClickHandler);
      eventHandlersRef.current.vesselClick = vesselClickHandler;

      // Handle hover on vessels
      const vesselMouseEnterHandler = () => {
        map.getCanvas().style.cursor = 'pointer';
      };
      map.on('mouseenter', layerId, vesselMouseEnterHandler);
      eventHandlersRef.current.vesselMouseEnter = vesselMouseEnterHandler;

      const vesselMouseLeaveHandler = () => {
        map.getCanvas().style.cursor = '';
      };
      map.on('mouseleave', layerId, vesselMouseLeaveHandler);
      eventHandlersRef.current.vesselMouseLeave = vesselMouseLeaveHandler;
    };

    // Check if style is loaded, if not wait for it
    if (!map.isStyleLoaded || !map.isStyleLoaded()) {
      console.log('[VesselLayer] Style not loaded yet, waiting for style.load event');
      
      // Remove any existing style load handler
      if (eventHandlersRef.current.styleLoad) {
        map.off('style.load', eventHandlersRef.current.styleLoad);
      }

      // Register one-time handler for style load
      const styleLoadHandler = () => {
        console.log('[VesselLayer] Style loaded, initializing vessel layers');
        eventHandlersRef.current.styleLoad = null; // Clear ref after use
        initializeVesselLayers();
      };
      map.once('style.load', styleLoadHandler);
      eventHandlersRef.current.styleLoad = styleLoadHandler;

      // Cleanup function for style load handler
      return () => {
        if (eventHandlersRef.current.styleLoad && map && typeof map.off === 'function') {
          map.off('style.load', eventHandlersRef.current.styleLoad);
          eventHandlersRef.current.styleLoad = null;
        }
      };
    }

    // Style is already loaded, initialize immediately
    initializeVesselLayers();

    // Cleanup function
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
        // Remove event handlers
        if (eventHandlersRef.current.clusterClick) {
          map.off('click', clusterLayerId, eventHandlersRef.current.clusterClick);
          eventHandlersRef.current.clusterClick = null;
        }
        if (eventHandlersRef.current.vesselClick) {
          map.off('click', layerId, eventHandlersRef.current.vesselClick);
          eventHandlersRef.current.vesselClick = null;
        }
        if (eventHandlersRef.current.vesselMouseEnter) {
          map.off('mouseenter', layerId, eventHandlersRef.current.vesselMouseEnter);
          eventHandlersRef.current.vesselMouseEnter = null;
        }
        if (eventHandlersRef.current.vesselMouseLeave) {
          map.off('mouseleave', layerId, eventHandlersRef.current.vesselMouseLeave);
          eventHandlersRef.current.vesselMouseLeave = null;
        }
        if (eventHandlersRef.current.styleLoad) {
          map.off('style.load', eventHandlersRef.current.styleLoad);
          eventHandlersRef.current.styleLoad = null;
        }

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

