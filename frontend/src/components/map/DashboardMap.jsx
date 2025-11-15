/**
 * DashboardMap Component
 * Professional AIS map similar to MarineTraffic/VesselFinder
 * Modular architecture with full-precision coordinate plotting
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VesselMarker, createVesselMarkerIcon } from './VesselMarker';
import VesselPopup from './VesselPopup';
import { CoordinateReadout, MapControlButtons, ScaleBar } from './MapControls';
import { BASE_LAYERS, NAUTICAL_OVERLAY, DEFAULT_BASELAYER } from './BaseLayers';
import { normalizeVesselPosition } from '../../utils/coordinateUtils';
import styles from './DashboardMap.module.css';

// Fix for default marker icons in Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function DashboardMap({ vessels, geofences, opsSites, onVesselClick }) {
  const navigate = useNavigate();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [hoveredVessel, setHoveredVessel] = useState(null);
  const [baseLayer, setBaseLayer] = useState(DEFAULT_BASELAYER);
  const [showNauticalOverlay, setShowNauticalOverlay] = useState(false);
  const baseTileLayerRef = useRef(null);
  const nauticalOverlayRef = useRef(null);
  const googleLayerRef = useRef(null);
  const hasUserInteractedRef = useRef(false);
  const initialBoundsSetRef = useRef(false);

  // Load base layer
  const loadBaseLayer = useCallback((layerId) => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Remove existing base layer
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }

    // Remove Google Maps layer if present
    if (googleLayerRef.current) {
      map.removeLayer(googleLayerRef.current);
      googleLayerRef.current = null;
    }

    const layerConfig = BASE_LAYERS[layerId] || BASE_LAYERS.standard;

    // Load base layer (OpenStreetMap for now, Google Maps can be added later)
    const loadOpenStreetMap = () => {
      const tileLayer = L.tileLayer(layerConfig.url, {
        attribution: layerConfig.attribution,
        minZoom: layerConfig.minZoom,
        maxZoom: layerConfig.maxZoom,
        subdomains: layerConfig.subdomains || 'abc',
      });
      tileLayer.addTo(map);
      baseTileLayerRef.current = tileLayer;
    };

    // Try Google Maps first if API key available
    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (googleMapsApiKey && typeof window !== 'undefined') {
      const loadGoogleMaps = async () => {
        try {
          await import('leaflet.gridlayer.googlemutant');
          
          if (window.google && window.google.maps) {
            if (L.gridLayer && L.gridLayer.googleMutant) {
              const googleLayer = L.gridLayer.googleMutant({
                type: 'roadmap',
                maxZoom: 19,
              });
              googleLayer.addTo(map);
              googleLayerRef.current = googleLayer;
              return;
            }
          } else {
            // Load Google Maps API script
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}`;
            script.async = true;
            script.defer = true;
            script.onload = async () => {
              setTimeout(async () => {
                try {
                  if (mapInstanceRef.current && L.gridLayer && L.gridLayer.googleMutant) {
                    const googleLayer = L.gridLayer.googleMutant({
                      type: 'roadmap',
                      maxZoom: 19,
                    });
                    googleLayer.addTo(mapInstanceRef.current);
                    googleLayerRef.current = googleLayer;
                  } else {
                    loadOpenStreetMap();
                  }
                } catch (error) {
                  console.warn('Failed to load Google Maps, falling back to OpenStreetMap:', error);
                  loadOpenStreetMap();
                }
              }, 100);
            };
            script.onerror = () => {
              console.warn('Failed to load Google Maps API, falling back to OpenStreetMap');
              loadOpenStreetMap();
            };
            document.head.appendChild(script);
            return;
          }
        } catch (error) {
          console.warn('Failed to load Google Maps plugin, falling back to OpenStreetMap:', error);
          loadOpenStreetMap();
        }
      };

      loadGoogleMaps();
    } else {
      loadOpenStreetMap();
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: false, // We'll add custom controls
        attributionControl: true,
        preferCanvas: true, // Better performance for many markers
      }).setView([-22.9068, -43.1729], 8);

      // Add zoom control (top-left, MarineTraffic style)
      L.control.zoom({
        position: 'topleft',
      }).addTo(mapInstanceRef.current);

      // Load initial base layer
      loadBaseLayer(DEFAULT_BASELAYER);
    }

    const map = mapInstanceRef.current;

    // Track user interactions
    map.on('zoomstart', () => {
      hasUserInteractedRef.current = true;
    });

    map.on('dragstart', () => {
      hasUserInteractedRef.current = true;
    });

    return () => {
      // Cleanup handled by component unmount
    };
  }, [loadBaseLayer]);

  // Load/remove nautical overlay
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    if (showNauticalOverlay && baseLayer === 'nautical') {
      // Add nautical overlay
      if (!nauticalOverlayRef.current) {
        const nauticalLayer = L.tileLayer(NAUTICAL_OVERLAY.url, {
          attribution: NAUTICAL_OVERLAY.attribution,
          minZoom: NAUTICAL_OVERLAY.minZoom,
          maxZoom: NAUTICAL_OVERLAY.maxZoom,
          opacity: NAUTICAL_OVERLAY.opacity,
        });
        nauticalLayer.addTo(map);
        nauticalOverlayRef.current = nauticalLayer;
      }
    } else {
      // Remove nautical overlay
      if (nauticalOverlayRef.current) {
        map.removeLayer(nauticalOverlayRef.current);
        nauticalOverlayRef.current = null;
      }
    }
  }, [showNauticalOverlay, baseLayer]);

  // Update vessel markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[DashboardMap] Vessels data:', {
        vessels,
        vesselsLength: vessels?.length,
        vesselsType: Array.isArray(vessels) ? 'array' : typeof vessels,
        firstVessel: vessels?.[0],
      });
    }

    if (!vessels || !Array.isArray(vessels) || vessels.length === 0) {
      if (import.meta.env.DEV) {
        console.warn('[DashboardMap] No vessels to plot:', { vessels });
      }
      return;
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => {
      map.removeLayer(marker);
    });
    markersRef.current = {};

    // Add vessel markers with full-precision coordinates
    const bounds = [];
    const zoom = map.getZoom();
    let plottedCount = 0;
    let skippedCount = 0;

    vessels.forEach((vessel) => {
      if (!vessel) {
        skippedCount++;
        return;
      }

      if (!vessel.position) {
        if (import.meta.env.DEV) {
          console.warn('[DashboardMap] Vessel missing position:', {
            vesselId: vessel.id,
            vesselName: vessel.name,
            vessel,
          });
        }
        skippedCount++;
        return;
      }

      // Normalize coordinates (preserves full precision)
      const normalizedPos = normalizeVesselPosition({
        ...vessel.position,
        vesselName: vessel.name,
      });

      if (!normalizedPos) {
        if (import.meta.env.DEV) {
          console.warn('[DashboardMap] Failed to normalize position:', {
            vesselId: vessel.id,
            vesselName: vessel.name,
            position: vessel.position,
          });
        }
        skippedCount++;
        return;
      }

      // CRITICAL: Use full-precision coordinates for marker
      const lat = normalizedPos.lat;
      const lon = normalizedPos.lon;

      // Create professional arrow-shaped marker
      const icon = createVesselMarkerIcon(vessel, zoom);
      const marker = L.marker([lat, lon], { icon });

      // Add hover tooltip
      const tooltipContent = `
        <div style="
          min-width: 200px;
          padding: 6px 8px;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 4px;
          color: #f1f5f9;
          font-size: 12px;
        ">
          <div style="font-weight: 600; color: #60a5fa; margin-bottom: 4px;">
            ${vessel.name}
          </div>
          <div style="font-size: 11px; color: #94a3b8;">
            ${vessel.type || 'Vessel'} • ${vessel.status || 'AT_SEA'}
          </div>
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        permanent: false,
        direction: 'top',
        offset: [0, -10],
        className: 'vessel-tooltip',
      });

      // Add click handler
      marker.on('click', (e) => {
        // Stop event propagation to prevent map click from firing
        L.DomEvent.stopPropagation(e.originalEvent || e);
        
        setSelectedVessel(vessel);
        if (onVesselClick) onVesselClick(vessel);
      });

      // Update icon on zoom change
      const updateIcon = () => {
        const newZoom = map.getZoom();
        const newIcon = createVesselMarkerIcon(vessel, newZoom);
        marker.setIcon(newIcon);
      };
      map.on('zoomend', updateIcon);

      marker.addTo(map);
      markersRef.current[vessel.id] = marker;
      bounds.push([lat, lon]);
      plottedCount++;
    });

    // Debug logging
    if (import.meta.env.DEV) {
      console.log('[DashboardMap] Vessel markers plotted:', {
        total: vessels.length,
        plotted: plottedCount,
        skipped: skippedCount,
        bounds: bounds.length,
      });
    }

    // Auto-fit bounds on initial load
    if (bounds.length > 0 && !hasUserInteractedRef.current && !initialBoundsSetRef.current) {
      initialBoundsSetRef.current = true;
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [vessels, onVesselClick]);

  // Handle layer switch
  const handleLayerSwitch = useCallback((layerId) => {
    setBaseLayer(layerId);
    loadBaseLayer(layerId);
    
    // Show nautical overlay for nautical layer
    if (layerId === 'nautical') {
      setShowNauticalOverlay(true);
    } else {
      setShowNauticalOverlay(false);
    }
  }, [loadBaseLayer]);

  // Handle vessel popup close
  const handleClosePopup = useCallback(() => {
    setSelectedVessel(null);
  }, []);

  // Close popup when clicking on map (outside markers)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    
    const handleMapClick = () => {
      // Close popup if clicking on map background
      if (selectedVessel) {
        setSelectedVessel(null);
      }
    };
    
    map.on('click', handleMapClick);
    
    return () => {
      map.off('click', handleMapClick);
    };
  }, [selectedVessel]);

  return (
    <div className={styles.dashboardMap}>
      <div ref={mapRef} className={styles.map} />
      
      {/* Map Controls */}
      <MapControlButtons map={mapInstanceRef.current} vessels={vessels} />
      <CoordinateReadout map={mapInstanceRef.current} />
      <ScaleBar map={mapInstanceRef.current} />
      
      {/* Layer Switcher */}
      <div className={styles.layerSwitcher}>
        <div className={styles.layerSwitcherHeader}>
          <span>Map Layers</span>
        </div>
        <div className={styles.layerButtons}>
          <button
            className={`${styles.layerButton} ${baseLayer === 'standard' ? styles.active : ''}`}
            onClick={() => handleLayerSwitch('standard')}
          >
            Standard
          </button>
          <button
            className={`${styles.layerButton} ${baseLayer === 'nautical' ? styles.active : ''}`}
            onClick={() => handleLayerSwitch('nautical')}
          >
            Nautical
          </button>
        </div>
      </div>
      
      {/* Vessel Popup - Floating overlay with backdrop */}
      {selectedVessel && (
        <>
          <div className={styles.popupBackdrop} onClick={handleClosePopup} />
          <div className={styles.popupContainer}>
            <VesselPopup vessel={selectedVessel} onClose={handleClosePopup} />
          </div>
        </>
      )}
    </div>
  );
}

export default DashboardMap;

