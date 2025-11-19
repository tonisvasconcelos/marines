/**
 * DashboardMapMapLibre Component
 * Refactored DashboardMap using MapLibre GL JS
 * MyShipTracking-style professional AIS map
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapEngine } from './MapEngine';
import { VesselLayer } from './VesselLayer';
import { OverlayControls } from './OverlayControls';
import { CoordinateReadout, MapControlButtons, ScaleBar } from './MapLibreControls';
import { MeasurementTool } from './MeasurementTool';
import { MiniPopup } from './MiniPopup';
import { VesselSearch } from './VesselSearch';
import { normalizeVesselPosition } from '../../utils/coordinateUtils';
import { getVesselsInZone } from '../../api/myshiptracking';
import { useQuery } from '@tanstack/react-query';
import styles from './DashboardMap.module.css';

function DashboardMapMapLibre({ vessels, geofences, opsSites, onVesselClick }) {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [baseLayer, setBaseLayer] = useState('standard');
  const [overlays, setOverlays] = useState({});
  const [measurementEnabled, setMeasurementEnabled] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);
  const hasUserInteractedRef = useRef(false);
  const initialBoundsSetRef = useRef(false);

  // Fetch vessels in current map view using MyShipTracking API
  const { data: zoneVessels } = useQuery({
    queryKey: ['vessels-in-zone', mapBounds],
    queryFn: () => {
      if (!mapBounds) return [];
      return getVesselsInZone(mapBounds, undefined, false); // Use simple response to save credits
    },
    enabled: !!mapBounds,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Handle map ready callback
  const handleMapReady = useCallback((map) => {
    mapRef.current = map;
    console.log('[DashboardMapMapLibre] MapLibre map ready');

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
      const bounds = [];
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

  // Handle base layer change
  const handleBaseLayerChange = useCallback((layerId) => {
    setBaseLayer(layerId);
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
          const coordinates = [];
          
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
        initialCenter={[-43.1729, -22.9068]} // [lon, lat]
        initialZoom={8}
        baseLayer={baseLayer}
        onBaseLayerChange={handleBaseLayerChange}
      />
      
      {/* Vessel Layer - renders vessels with clustering */}
      {mapRef.current && mapRef.current.isStyleLoaded() && (
        <VesselLayer
          map={mapRef.current}
          vessels={zoneVessels || vessels} // Use zone vessels if available, fallback to props
          onVesselClick={handleVesselClick}
        />
      )}
      
      {/* Vessel Search */}
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
      
      {/* Map Controls */}
      {mapRef.current && (
        <>
          <MapControlButtons map={mapRef.current} vessels={vessels} />
          <CoordinateReadout map={mapRef.current} />
          <ScaleBar map={mapRef.current} />
        </>
      )}
      
      {/* Overlay Controls */}
      <OverlayControls
        baseLayer={baseLayer}
        onBaseLayerChange={handleBaseLayerChange}
        overlays={overlays}
        onOverlayToggle={handleOverlayToggle}
      />
      
      {/* Measurement Tool */}
      {mapRef.current && (
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

      {/* Map Mode Selector - Simple Padrão/Carta Náutica buttons */}
      <div className={styles.mapModeSelector}>
        <div className={styles.mapModeHeader}>MAPA</div>
        <div className={styles.mapModeButtons}>
          <button
            className={`${styles.mapModeButton} ${baseLayer === 'standard' ? styles.active : ''}`}
            onClick={() => handleBaseLayerChange('standard')}
          >
            Padrão
          </button>
          <button
            className={`${styles.mapModeButton} ${baseLayer === 'nautical' ? styles.active : ''}`}
            onClick={() => handleBaseLayerChange('nautical')}
          >
            Carta Náutica
          </button>
        </div>
      </div>
    </div>
  );
}

export default DashboardMapMapLibre;

