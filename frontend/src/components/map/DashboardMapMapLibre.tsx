/**
 * DashboardMapMapLibre Component
 * Refactored DashboardMap using MapLibre GL JS
 * MyShipTracking-style professional AIS map
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapEngine } from './MapEngine';
import { VesselLayer } from './VesselLayer';
import { OverlayControls } from './OverlayControls';
import { CoordinateReadout, MapControlButtons, ScaleBar } from './MapLibreControls';
import { MeasurementTool } from './MeasurementTool';
import { MiniPopup } from './MiniPopup';
import { VesselSearch } from './VesselSearch';
import MapViewSettings from './MapViewSettings';
import { normalizeVesselPosition } from '../../utils/coordinateUtils';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - CSS module exists but TypeScript doesn't have type declarations
import styles from './DashboardMap.module.css';

function DashboardMapMapLibre({ vessels, geofences, opsSites, onVesselClick, tenantVessels, showControls = true, isDashboardWidget = false }) {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [selectedLayers, setSelectedLayers] = useState(['standard']); // Multi-selection support
  const [overlays, setOverlays] = useState({});
  const [measurementEnabled, setMeasurementEnabled] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);
  const [isStyleReady, setIsStyleReady] = useState(false); // Track when map style is loaded
  const hasUserInteractedRef = useRef(false);
  const initialBoundsSetRef = useRef(false);

  // DISABLED: Automatic zone API calls to save credits
  // Zone API is now only called manually via user action
  // Users can refresh vessel positions individually from the vessel detail page
  const enrichedVessels = useMemo(() => {
    // Simply return database vessels with their stored positions
    // No automatic API calls to save credits
    const vesselList = vessels || [];
    
    // Always log to diagnose issues
    console.log('[DashboardMapMapLibre] enrichedVessels memo:', {
      inputVessels: vessels,
      inputVesselsLength: vessels?.length,
      vesselListLength: vesselList.length,
      vessels: vesselList.map(v => ({
        id: v.id,
        name: v.name,
        hasPosition: !!v.position,
        position: v.position,
        positionLat: v.position?.lat,
        positionLon: v.position?.lon,
      })),
    });
    
    return vesselList;
  }, [vessels]);
  
  // Log when enrichedVessels changes
  useEffect(() => {
    console.log('[DashboardMapMapLibre] enrichedVessels changed:', {
      count: enrichedVessels.length,
      vessels: enrichedVessels,
    });
  }, [enrichedVessels]);

  // Handle map ready callback
  const handleMapReady = useCallback((map) => {
    mapRef.current = map;
    console.log('[DashboardMapMapLibre] MapLibre map ready');

    // For custom styles (like the OSM raster style), the 'load' event is more reliable
    // The MapEngine already fires 'load' when the map is ready, so we can use that
    const setStyleReady = () => {
      console.log('[DashboardMapMapLibre] ✅ Setting style ready');
      setIsStyleReady(true);
    };

    // Check if style is already loaded
    if (map.isStyleLoaded && map.isStyleLoaded()) {
      console.log('[DashboardMapMapLibre] Style already loaded');
      setStyleReady();
      return;
    }

    // Listen for 'load' event (fires when map is fully loaded, including custom styles)
    // This is more reliable for custom raster styles
    map.once('load', () => {
      console.log('[DashboardMapMapLibre] Map load event fired - setting style ready');
      setStyleReady();
    });

    // Also listen for 'style.load' event (for standard MapLibre vector styles)
    map.once('style.load', () => {
      console.log('[DashboardMapMapLibre] Map style.load event fired - setting style ready');
      setStyleReady();
    });

    // Fallback: Force ready state after a delay if map is functional
    // This ensures VesselLayer renders even if style events don't fire
    setTimeout(() => {
      if (map && typeof map.getSource === 'function' && typeof map.addSource === 'function') {
        console.log('[DashboardMapMapLibre] Fallback: Map is functional, forcing style ready');
        setStyleReady();
      }
    }, 500);

    // Also listen for style data loading (handles style changes)
    map.on('styledata', () => {
      if (map.isStyleLoaded && map.isStyleLoaded()) {
        setStyleReady();
      }
    });

    // Resize map to ensure proper rendering (especially in modals)
    setTimeout(() => {
      if (map && typeof map.resize === 'function') {
        map.resize();
      }
    }, 100);

    // Track user interactions
    map.on('zoomstart', () => {
      hasUserInteractedRef.current = true;
    });

    map.on('dragstart', () => {
      hasUserInteractedRef.current = true;
    });

    // Update map bounds when map moves/zooms
    const updateBounds = () => {
      const bounds = map.getBounds();
      setMapBounds({
        minlon: bounds.getWest(),
        maxlon: bounds.getEast(),
        minlat: bounds.getSouth(),
        maxlat: bounds.getNorth(),
      });
    };

    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);
    updateBounds(); // Initial bounds

    // Auto-fit bounds on initial load
    if (vessels && vessels.length > 0 && !hasUserInteractedRef.current && !initialBoundsSetRef.current) {
      const bounds: [number, number][] = [];
      vessels.forEach((vessel) => {
        if (vessel.position) {
          const normalizedPos = normalizeVesselPosition({
            ...vessel.position,
            vesselName: vessel.name,
          });
          if (normalizedPos) {
            bounds.push([normalizedPos.lon, normalizedPos.lat]); // [lon, lat] for MapLibre
          }
        }
      });

      if (bounds.length > 0) {
        const lons = bounds.map(b => b[0]);
        const lats = bounds.map(b => b[1]);
        const bbox = [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ];
        
        map.fitBounds(bbox, { padding: 50 });
        initialBoundsSetRef.current = true;
      }
    }
  }, [vessels]);

  // Auto-fit bounds when vessels are loaded (after initial map load)
  useEffect(() => {
    if (!mapRef.current || !enrichedVessels || enrichedVessels.length === 0) {
      return;
    }

    // Only auto-fit if user hasn't interacted with the map
    if (hasUserInteractedRef.current || initialBoundsSetRef.current) {
      return;
    }

    // Wait for map to be ready
    if (!mapRef.current.isStyleLoaded || !mapRef.current.isStyleLoaded()) {
      console.log('[DashboardMapMapLibre] Map style not ready yet, waiting to fit bounds');
      const checkAndFit = () => {
        if (mapRef.current && mapRef.current.isStyleLoaded && mapRef.current.isStyleLoaded()) {
          fitBoundsToVessels();
        }
      };
      mapRef.current.once('style.load', checkAndFit);
      mapRef.current.once('load', checkAndFit);
      return;
    }

    fitBoundsToVessels();
  }, [enrichedVessels]);

  // Helper function to fit bounds to vessels
  const fitBoundsToVessels = useCallback(() => {
    if (!mapRef.current || !enrichedVessels || enrichedVessels.length === 0) {
      return;
    }

    const bounds: [number, number][] = [];
    enrichedVessels.forEach((vessel) => {
      if (vessel.position) {
        const normalizedPos = normalizeVesselPosition({
          ...vessel.position,
          vesselName: vessel.name,
        });
        if (normalizedPos) {
          bounds.push([normalizedPos.lon, normalizedPos.lat]); // [lon, lat] for MapLibre
        }
      }
    });

    if (bounds.length > 0) {
      const lons = bounds.map(b => b[0]);
      const lats = bounds.map(b => b[1]);
      const bbox = [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ];
      
      console.log('[DashboardMapMapLibre] Fitting bounds to vessels:', {
        vesselCount: enrichedVessels.length,
        bounds: bbox,
        minLon: Math.min(...lons),
        maxLon: Math.max(...lons),
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
      });
      
      mapRef.current.fitBounds(bbox, { 
        padding: 50,
        duration: 1000, // Smooth animation
      });
      initialBoundsSetRef.current = true;
    }
  }, [enrichedVessels]);

  // Handle layers change (multi-selection)
  const handleLayersChange = useCallback((newSelectedLayers) => {
    setSelectedLayers(newSelectedLayers);
  }, []);

  // Legacy handler for single layer change (for backward compatibility with MapEngine)
  const handleBaseLayerChange = useCallback((layerId) => {
    // Update selected layers to include this layer
    setSelectedLayers(prev => {
      if (prev.includes(layerId)) return prev;
      // If switching base layers (standard/dark), replace them
      if (layerId === 'standard' || layerId === 'dark') {
        return [layerId, ...prev.filter(l => l !== 'standard' && l !== 'dark')];
      }
      // Otherwise add to selection
      return [...prev, layerId];
    });
  }, []);

  // Handle overlay toggle
  const handleOverlayToggle = useCallback((overlayId, enabled) => {
    setOverlays((prev) => ({
      ...prev,
      [overlayId]: enabled,
    }));
  }, []);

  // Handle vessel click
  const handleVesselClick = useCallback((vessel) => {
    setSelectedVessel(vessel);
    if (onVesselClick) {
      onVesselClick(vessel);
    }
  }, [onVesselClick]);

  // Handle popup close
  const handleClosePopup = useCallback(() => {
    setSelectedVessel(null);
  }, []);

  // Render geofences
  useEffect(() => {
    if (!mapRef.current || !geofences) return;

    const map = mapRef.current;
    const sourceId = 'geofences';
    const layerId = 'geofences-layer';

    // Wait for map style to load
    if (!map.isStyleLoaded()) {
      const handleStyleLoad = () => {
        renderGeofences();
      };
      map.once('style.load', handleStyleLoad);
      return () => {
        map.off('style.load', handleStyleLoad);
      };
    }

    function renderGeofences() {
      // Remove existing geofences (with safety checks)
      try {
        if (map && typeof map.getLayer === 'function' && map.getLayer(layerId)) map.removeLayer(layerId);
        if (map && typeof map.getSource === 'function' && map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (error) {
        console.warn('[DashboardMapMapLibre] Error removing geofences:', error);
      }

      if (!geofences || geofences.length === 0) return;

      const features = geofences.map((geofence) => {
        if (geofence.polygon && geofence.polygon.length > 0) {
          return {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [geofence.polygon.map(p => [p.lon, p.lat])], // [lon, lat]
            },
            properties: {
              id: geofence.id,
              name: geofence.name,
              type: geofence.type,
            },
          };
        } else if (geofence.center && geofence.radius) {
          // Create circle polygon (approximation)
          const center = [geofence.center.lon, geofence.center.lat];
          const radiusKm = geofence.radius;
          const points = 64;
          const coordinates: [number, number][] = [];
          
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            const lat = center[1] + (radiusKm / 111.32) * Math.cos(angle);
            const lon = center[0] + (radiusKm / (111.32 * Math.cos(center[1] * Math.PI / 180))) * Math.sin(angle);
            coordinates.push([lon, lat]);
          }
          
          return {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [coordinates],
            },
            properties: {
              id: geofence.id,
              name: geofence.name,
              type: geofence.type,
            },
          };
        }
        return null;
      }).filter(f => f !== null);

      if (features.length === 0) return;

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features,
        },
      });

      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': [
            'case',
            ['==', ['get', 'type'], 'PORT'], '#10b981',
            ['==', ['get', 'type'], 'TERMINAL'], '#3b82f6',
            ['==', ['get', 'type'], 'BERTH'], '#f59e0b',
            '#8b5cf6',
          ],
          'fill-opacity': 0.1,
        },
      });

      map.addLayer({
        id: `${layerId}-outline`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': [
            'case',
            ['==', ['get', 'type'], 'PORT'], '#10b981',
            ['==', ['get', 'type'], 'TERMINAL'], '#3b82f6',
            ['==', ['get', 'type'], 'BERTH'], '#f59e0b',
            '#8b5cf6',
          ],
          'line-width': 2,
          'line-opacity': 0.6,
        },
      });
    }

    renderGeofences();

    return () => {
      // CRITICAL: Check if map exists and is still valid before cleanup
      if (!map || !map.isStyleLoaded || typeof map.getLayer !== 'function') {
        return;
      }
      
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getLayer(`${layerId}-outline`)) map.removeLayer(`${layerId}-outline`);
        if (map.getSource && map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (error) {
        // Map might be destroyed, ignore cleanup errors
        console.warn('[DashboardMapMapLibre] Geofences cleanup error (map may be destroyed):', error);
      }
    };
  }, [mapRef.current, geofences]);

  // Render ops sites
  useEffect(() => {
    if (!mapRef.current || !opsSites) return;

    const map = mapRef.current;
    const sourceId = 'ops-sites';
    const layerId = 'ops-sites-layer';

    // Wait for map style to load
    if (!map.isStyleLoaded()) {
      const handleStyleLoad = () => {
        renderOpsSites();
      };
      map.once('style.load', handleStyleLoad);
      return () => {
        map.off('style.load', handleStyleLoad);
      };
    }

    function renderOpsSites() {
      // Remove existing ops sites (with safety checks)
      try {
        if (map && typeof map.getLayer === 'function' && map.getLayer(layerId)) map.removeLayer(layerId);
        if (map && typeof map.getSource === 'function' && map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (error) {
        console.warn('[DashboardMapMapLibre] Error removing ops sites:', error);
      }

      if (!opsSites || opsSites.length === 0) return;

      const features = opsSites
        .map((site) => {
          if (site.location && site.location.lat && site.location.lon) {
            return {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [site.location.lon, site.location.lat],
              },
              properties: {
                id: site.id,
                name: site.name,
                type: site.type || 'TERMINAL',
              },
            };
          }
          return null;
        })
        .filter((f) => f !== null);

      if (features.length === 0) return;

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features,
        },
      });

      map.addLayer({
        id: layerId,
        type: 'circle',
        source: sourceId,
        paint: {
          'circle-radius': 10,
          'circle-color': '#f59e0b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.9,
        },
      });
    }

    renderOpsSites();

    return () => {
      // CRITICAL: Check if map exists and is still valid before cleanup
      if (!map || !map.isStyleLoaded || typeof map.getLayer !== 'function') {
        return;
      }
      
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource && map.getSource(sourceId)) map.removeSource(sourceId);
      } catch (error) {
        // Map might be destroyed, ignore cleanup errors
        console.warn('[DashboardMapMapLibre] Cleanup error (map may be destroyed):', error);
      }
    };
  }, [mapRef.current, opsSites]);

  return (
    <div className={styles.dashboardMap}>
      <div ref={mapContainerRef} className={styles.map} />
      
      {/* Map Engine - handles MapLibre initialization */}
      <MapEngine
        mapContainerRef={mapContainerRef}
        onMapReady={handleMapReady}
        initialCenter={[-46.6333, -23.5505]} // São Paulo as initial center
        initialZoom={3} // Adjusted zoom to see multiple continents
        baseLayer={selectedLayers.length > 0 ? selectedLayers[0] : 'standard'}
        selectedLayers={selectedLayers}
        onBaseLayerChange={handleBaseLayerChange}
        hideBuiltInControls={isDashboardWidget}
      />
      
      {/* Vessel Layer - renders vessels with clustering */}
      {/* Only shows database vessels with stored positions - no automatic API calls */}
      {/* VesselLayer handles style loading internally, so render when map is ready */}
      {mapRef.current && (
        <>
          {console.log('[DashboardMapMapLibre] Rendering VesselLayer:', {
            isStyleReady,
            hasMap: !!mapRef.current,
            vesselCount: enrichedVessels.length,
            vessels: enrichedVessels,
            vesselDetails: enrichedVessels.map(v => ({
              id: v.id,
              name: v.name,
              hasPosition: !!v.position,
              position: v.position,
            })),
          })}
          <VesselLayer
            map={mapRef.current}
            vessels={enrichedVessels} // Database vessels with stored positions only
            tenantVessels={tenantVessels} // Pass tenant vessels for highlighting
            onVesselClick={handleVesselClick}
            onVesselHover={() => {}} // Empty handler - not used in dashboard
          />
        </>
      )}
      {!mapRef.current && console.log('[DashboardMapMapLibre] ⚠️ Map not ready, VesselLayer not rendering')}
      
      {/* Vessel Search - Hidden in dashboard widget, only show in fullscreen mode */}
      {showControls && !isDashboardWidget && (
        <div className={styles.vesselSearchContainer}>
          <VesselSearch
            onSelectVessel={(vessel) => {
              // Center map on selected vessel
              if (mapRef.current && vessel.mmsi) {
                // Fetch vessel position and center map
                // For now, just trigger a search
                console.log('Vessel selected:', vessel);
              }
            }}
          />
        </div>
      )}
      
      {/* Additional Map Controls - Hidden in dashboard widget, only show in fullscreen mode */}
      {showControls && !isDashboardWidget && mapRef.current && (
        <>
          <CoordinateReadout map={mapRef.current} />
          <ScaleBar map={mapRef.current} />
        </>
      )}
      
      {/* Overlay Controls - Hidden in dashboard widget, only show in fullscreen mode */}
      {showControls && !isDashboardWidget && (
        <OverlayControls
          baseLayer={selectedLayers.length > 0 ? selectedLayers[0] : 'standard'}
          onBaseLayerChange={handleBaseLayerChange}
          overlays={overlays}
          onOverlayToggle={handleOverlayToggle}
        />
      )}
      
      {/* Measurement Tool - Hidden in dashboard widget, only show in fullscreen mode */}
      {showControls && !isDashboardWidget && mapRef.current && (
        <MeasurementTool
          map={mapRef.current}
          enabled={measurementEnabled}
          onToggle={setMeasurementEnabled}
        />
      )}
      
      {/* Mini Popup - MyShipTracking style */}
      {selectedVessel && (
        <div className={styles.popupContainer}>
          <MiniPopup
            vessel={selectedVessel}
            position={selectedVessel.position}
            onClose={handleClosePopup}
            apiKey={undefined} // Will be handled by backend proxy
          />
        </div>
      )}

      {/* Unified MapViewSettings Widget - Only show if controls are enabled */}
      {showControls && mapRef.current && (
        <MapViewSettings
          map={mapRef.current}
          selectedLayers={selectedLayers}
          onLayersChange={handleLayersChange}
        />
      )}
    </div>
  );
}

export default DashboardMapMapLibre;

