import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// Note: leaflet.gridlayer.googlemutant is loaded dynamically to avoid build issues
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../utils/useI18n';
import { api } from '../../utils/api';
import { MAP_BASELAYERS, DEFAULT_BASELAYER, getBaseLayerConfig } from '../../utils/mapConfig';
import { FiEdit3, FiX, FiCheck, FiMap } from 'react-icons/fi';
import styles from './OpsMapPanel.module.css';
import SaveAreaModal from './SaveAreaModal';

// Custom vessel marker icons with status colors
function createVesselIcon(status, size = 20) {
  const colors = {
    INBOUND: '#f59e0b', // Amber
    IN_PORT: '#10b981', // Green
    AT_SEA: '#3b82f6', // Blue
    ANCHORED: '#8b5cf6', // Purple
  };
  
  const color = colors[status] || '#64748b';
  
  return L.divIcon({
    className: 'vessel-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/**
 * Normalize and validate vessel position coordinates
 * CRITICAL: Ensures AIS coordinates are plotted correctly on Leaflet maps
 * 
 * Leaflet requires: L.marker([latitude, longitude])
 * AIS coordinates: latitude (-90 to 90), longitude (-180 to 180)
 * 
 * This function handles:
 * - Various field name formats (lat/lon, latitude/longitude, Lat/Lon, etc.)
 * - String to number conversion
 * - Coordinate validation
 * - Coordinate swapping detection (only if lat is clearly out of range)
 */
function normalizeVesselPosition(position) {
  if (!position) {
    if (import.meta.env.DEV) {
      console.warn('[normalizeVesselPosition] Position is null/undefined');
    }
    return null;
  }
  
  // Extract coordinates from various field name formats (case-insensitive)
  // Priority: lat/lon > latitude/longitude > Lat/Lon > Latitude/Longitude
  const rawLat = position.lat ?? position.latitude ?? position.Lat ?? position.Latitude ?? null;
  const rawLon = position.lon ?? position.longitude ?? position.Lon ?? position.Longitude ?? null;
  
  // Debug logging in development mode
  if (import.meta.env.DEV) {
    console.log('[normalizeVesselPosition] Raw coordinates extracted:', {
      rawLat,
      rawLon,
      rawLatType: typeof rawLat,
      rawLonType: typeof rawLon,
      positionKeys: Object.keys(position),
      vesselName: position.vesselName || 'Unknown',
    });
  }
  
  if (rawLat === null || rawLon === null || rawLat === undefined || rawLon === undefined) {
    if (import.meta.env.DEV) {
      console.warn('[normalizeVesselPosition] Missing coordinates:', {
        hasLat: rawLat !== null && rawLat !== undefined,
        hasLon: rawLon !== null && rawLon !== undefined,
        position,
      });
    }
    return null;
  }
  
  // Convert to numbers if they're strings
  // Use parseFloat to preserve decimal precision (not parseInt!)
  let normalizedLat = typeof rawLat === 'string' ? parseFloat(rawLat) : Number(rawLat);
  let normalizedLon = typeof rawLon === 'string' ? parseFloat(rawLon) : Number(rawLon);
  
  // Validate coordinates are valid numbers (not NaN, not Infinity)
  if (!isFinite(normalizedLat) || !isFinite(normalizedLon)) {
    if (import.meta.env.DEV) {
      console.error('[normalizeVesselPosition] Invalid number conversion:', {
        rawLat,
        rawLon,
        normalizedLat,
        normalizedLon,
        position,
      });
    }
    return null;
  }
  
  // CRITICAL: Check if coordinates might be swapped
  // Only swap if lat is clearly out of valid range (-90 to 90) AND lon is within lat range
  // This prevents false positives for valid coordinates near poles
  const latOutOfRange = normalizedLat > 90 || normalizedLat < -90;
  const lonInLatRange = normalizedLon >= -90 && normalizedLon <= 90;
  
  if (latOutOfRange && lonInLatRange) {
    // Coordinates appear to be swapped - swap them back
    if (import.meta.env.DEV) {
      console.warn('[normalizeVesselPosition] Coordinates appear to be swapped, correcting:', { 
        original: { lat: normalizedLat, lon: normalizedLon },
        corrected: { lat: normalizedLon, lon: normalizedLat },
        vesselName: position.vesselName || 'Unknown',
      });
    }
    [normalizedLat, normalizedLon] = [normalizedLon, normalizedLat];
  }
  
  // Final validation - ensure coordinates are within valid ranges
  // Latitude: -90 to 90 (South to North)
  // Longitude: -180 to 180 (West to East)
  if (normalizedLat < -90 || normalizedLat > 90 || normalizedLon < -180 || normalizedLon > 180) {
    if (import.meta.env.DEV) {
      console.error('[normalizeVesselPosition] Invalid coordinate ranges:', { 
        lat: normalizedLat, 
        lon: normalizedLon,
        latRange: normalizedLat < -90 || normalizedLat > 90,
        lonRange: normalizedLon < -180 || normalizedLon > 180,
        vesselName: position.vesselName || 'Unknown',
        position,
      });
    }
    return null;
  }
  
  // Return normalized coordinates
  const result = {
    lat: normalizedLat,
    lon: normalizedLon,
  };
  
  if (import.meta.env.DEV) {
    console.log('[normalizeVesselPosition] Final normalized coordinates:', {
      ...result,
      vesselName: position.vesselName || 'Unknown',
      willPlotAt: `[${result.lat}, ${result.lon}]`, // Leaflet format
    });
  }
  
  return result;
}

function OpsMapPanel({ vessels, geofences, opsSites, onVesselClick }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const polylinesRef = useRef({});
  const polygonsRef = useRef({});
  const circlesRef = useRef({});
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [drawingPolygon, setDrawingPolygon] = useState(null);
  const [drawingPolyline, setDrawingPolyline] = useState(null);
  const [drawingMarkers, setDrawingMarkers] = useState([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSiteIds, setSelectedSiteIds] = useState(new Set());
  const mapClickHandlerRef = useRef(null);
  const hasUserInteractedRef = useRef(false); // Track if user has manually adjusted map
  const initialBoundsSetRef = useRef(false); // Track if initial bounds have been set
  const [baseLayer, setBaseLayer] = useState(DEFAULT_BASELAYER); // Current base layer
  const tileLayerRef = useRef(null); // Reference to current tile layer
  const overlayLayerRef = useRef(null); // Reference to overlay layer (for nautical charts)

  // Function to load a base layer
  const loadBaseLayer = (layerId) => {
    if (!mapInstanceRef.current) return;

    const layerConfig = getBaseLayerConfig(layerId);
    if (!layerConfig) {
      console.warn(`Invalid layer ID: ${layerId}, falling back to default`);
      return;
    }

    // Remove existing tile layer if present
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    // Remove existing overlay layer if present
    if (overlayLayerRef.current) {
      mapInstanceRef.current.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    // For nautical charts, we need both a base layer and an overlay
    if (layerId === 'nautical') {
      // Use OpenStreetMap as base for nautical charts
      const baseTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 3,
        maxZoom: 19,
        subdomains: 'abc',
      });
      baseTileLayer.addTo(mapInstanceRef.current);
      tileLayerRef.current = baseTileLayer;

      // Add OpenSeaMap seamark overlay for nautical features
      // This shows buoys, lighthouses, seamarks, and other navigation aids
      const nauticalOverlay = L.tileLayer(layerConfig.url, {
        attribution: layerConfig.attribution,
        minZoom: layerConfig.minZoom,
        maxZoom: layerConfig.maxZoom,
        subdomains: layerConfig.subdomains || 'abc',
        opacity: 0.8, // Slightly transparent so base map shows through
      });
      nauticalOverlay.addTo(mapInstanceRef.current);
      overlayLayerRef.current = nauticalOverlay;
    } else {
      // Standard layer - just use the configured base layer
      const tileLayer = L.tileLayer(layerConfig.url, {
        attribution: layerConfig.attribution,
        minZoom: layerConfig.minZoom,
        maxZoom: layerConfig.maxZoom,
        subdomains: layerConfig.subdomains || 'abc',
      });
      tileLayer.addTo(mapInstanceRef.current);
      tileLayerRef.current = tileLayer;
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const initializeMap = () => {
      if (mapInstanceRef.current) return;

      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([-22.9068, -43.1729], 6);

      // Use Google Maps if API key is available, otherwise use configured base layer
      const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      if (googleMapsApiKey && typeof window !== 'undefined') {
        // Dynamically load Google Maps plugin only in browser
        const loadGoogleMaps = async () => {
          try {
            // Dynamically import the plugin to avoid build-time issues
            await import('leaflet.gridlayer.googlemutant');
            
            // Check if Google Maps API is already loaded
            if (window.google && window.google.maps) {
              // Use Google Maps with Leaflet plugin
              try {
                if (L.gridLayer && L.gridLayer.googleMutant) {
                  const googleLayer = L.gridLayer.googleMutant({
                    type: 'roadmap', // Options: 'roadmap', 'satellite', 'hybrid', 'terrain'
                    maxZoom: 19,
                  });
                  googleLayer.addTo(mapInstanceRef.current);
                  tileLayerRef.current = googleLayer;
                  return;
                }
              } catch (error) {
                console.warn('Failed to initialize Google Maps, falling back to configured base layer:', error);
                loadBaseLayer(baseLayer);
                return;
              }
            } else {
              // Load Google Maps API script
              const script = document.createElement('script');
              script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}`;
              script.async = true;
              script.defer = true;
              script.onload = async () => {
                // Wait for Google Maps API and plugin to be ready
                setTimeout(async () => {
                  try {
                    if (mapInstanceRef.current && L.gridLayer && L.gridLayer.googleMutant) {
                      const googleLayer = L.gridLayer.googleMutant({
                        type: 'roadmap',
                        maxZoom: 19,
                      });
                      googleLayer.addTo(mapInstanceRef.current);
                      tileLayerRef.current = googleLayer;
                    } else {
                      loadBaseLayer(baseLayer);
                    }
                  } catch (error) {
                    console.warn('Failed to load Google Maps, falling back to configured base layer:', error);
                    loadBaseLayer(baseLayer);
                  }
                }, 100);
              };
              script.onerror = () => {
                console.warn('Failed to load Google Maps API, falling back to configured base layer');
                loadBaseLayer(baseLayer);
              };
              document.head.appendChild(script);
              return;
            }
          } catch (error) {
            console.warn('Failed to load Google Maps plugin, falling back to configured base layer:', error);
            loadBaseLayer(baseLayer);
          }
        };
        
        loadGoogleMaps();
        return;
      }
      
      // Load configured base layer (standard or nautical)
      loadBaseLayer(baseLayer);
    };

    initializeMap();

    const map = mapInstanceRef.current;

    // Track user interactions (zoom, pan, drag)
    if (map) {
      map.on('zoomstart', () => {
        hasUserInteractedRef.current = true;
      });

      map.on('dragstart', () => {
        hasUserInteractedRef.current = true;
      });

      map.on('moveend', () => {
        // Only mark as interacted if it wasn't a programmatic move
        if (!initialBoundsSetRef.current) {
          hasUserInteractedRef.current = true;
        }
        initialBoundsSetRef.current = false;
      });
    }

    return () => {
      // Cleanup
    };
  }, []);

  // Handle base layer switching
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    // Only switch if we're not using Google Maps
    const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!googleMapsApiKey || !tileLayerRef.current || !(tileLayerRef.current instanceof L.TileLayer)) {
      loadBaseLayer(baseLayer);
    }
  }, [baseLayer]);

  // Handler for layer switching
  const handleLayerSwitch = (layerId) => {
    setBaseLayer(layerId);
  };

  // Note: By default, no Ops Zones are visible. Users must manually select which ones to display.

  // Update map layers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear existing layers
    Object.values(markersRef.current).forEach((marker) => map.removeLayer(marker));
    Object.values(polylinesRef.current).forEach((polyline) => map.removeLayer(polyline));
    Object.values(polygonsRef.current).forEach((polygon) => map.removeLayer(polygon));
    Object.values(circlesRef.current).forEach((circle) => map.removeLayer(circle));
    markersRef.current = {};
    polylinesRef.current = {};
    polygonsRef.current = {};
    circlesRef.current = {};

    // Always clean up drawing polyline when map layers update (unless actively drawing)
    // This ensures no leftover lines persist on the map
    if (drawingPolyline) {
      try {
        if (map.hasLayer(drawingPolyline)) {
          map.removeLayer(drawingPolyline);
        }
      } catch (e) {
        // Layer might already be removed, ignore error
      }
      // Only clear state if we're not actively drawing
      if (!isDrawing) {
        setDrawingPolyline(null);
      }
    }

    // Filter geofences based on selected ops sites
    // If no sites are selected, show nothing. Otherwise, only show selected sites.
    const filteredGeofences = selectedSiteIds.size === 0 
      ? [] 
      : (geofences?.filter((geofence) => selectedSiteIds.has(geofence.id)) || []);

    // Add geofences as polygons (if they have polygon data) or circles
    if (filteredGeofences.length > 0) {
      filteredGeofences.forEach((geofence) => {
        if (geofence.polygon && geofence.polygon.length > 0) {
          // Draw polygon geofence
          const polygon = L.polygon(geofence.polygon.map(p => [p.lat, p.lon]), {
            color: geofence.type === 'PORT' ? '#10b981' : 
                   geofence.type === 'TERMINAL' ? '#3b82f6' :
                   geofence.type === 'BERTH' ? '#f59e0b' : '#8b5cf6',
            fillColor: geofence.type === 'PORT' ? '#10b981' : 
                       geofence.type === 'TERMINAL' ? '#3b82f6' :
                       geofence.type === 'BERTH' ? '#f59e0b' : '#8b5cf6',
            fillOpacity: 0.15,
            weight: 2,
            opacity: 0.7,
          }).addTo(map);
          
          polygon.bindTooltip(`${geofence.name} (${geofence.type})`, { permanent: false });
          polygonsRef.current[geofence.id] = polygon;
        } else if (geofence.center) {
          // Draw circular geofence (fallback)
          const circle = L.circle([geofence.center.lat, geofence.center.lon], {
            radius: geofence.radius || 5000,
            color: geofence.type === 'PORT' ? '#10b981' : 
                   geofence.type === 'TERMINAL' ? '#3b82f6' :
                   geofence.type === 'BERTH' ? '#f59e0b' : '#8b5cf6',
            fillColor: geofence.type === 'PORT' ? '#10b981' : 
                       geofence.type === 'TERMINAL' ? '#3b82f6' :
                       geofence.type === 'BERTH' ? '#f59e0b' : '#8b5cf6',
            fillOpacity: 0.1,
            weight: 2,
            opacity: 0.6,
          }).addTo(map);
          
          circle.bindTooltip(`${geofence.name} (${geofence.type})`, { permanent: false });
          circlesRef.current[geofence.id] = circle;
        }
      });
    }

    // Add vessel markers
    if (vessels) {
      const bounds = [];
      
      vessels.forEach((vessel) => {
        if (!vessel.position) {
          if (import.meta.env.DEV) {
            console.warn('[OpsMapPanel] Vessel has no position data:', {
              vesselId: vessel.id,
              vesselName: vessel.name,
            });
          }
          return;
        }
        
        // Debug: Log raw position data from API (development mode only)
        if (import.meta.env.DEV) {
          console.log('[OpsMapPanel] Raw vessel position from API:', {
            vesselId: vessel.id,
            vesselName: vessel.name,
            rawPosition: vessel.position,
            positionKeys: Object.keys(vessel.position),
          });
        }
        
        // Normalize and validate coordinates (same logic as MapView)
        const normalizedPos = normalizeVesselPosition({
          ...vessel.position,
          vesselName: vessel.name, // For logging
        });
        
        if (!normalizedPos) {
          if (import.meta.env.DEV) {
            console.warn('[OpsMapPanel] Skipping vessel due to invalid coordinates:', {
              vesselId: vessel.id,
              vesselName: vessel.name,
              position: vessel.position,
            });
          }
          return;
        }
        
        // Debug: Log normalized coordinates and Leaflet marker creation (development mode only)
        // CRITICAL: Verify we're using full-precision coordinates (not rounded/truncated)
        if (import.meta.env.DEV) {
          console.log('[OpsMapPanel] Creating Leaflet marker with full-precision coordinates:', {
            vesselId: vessel.id,
            vesselName: vessel.name,
            normalized: normalizedPos,
            latPrecision: normalizedPos.lat.toString().split('.')[1]?.length || 0,
            lonPrecision: normalizedPos.lon.toString().split('.')[1]?.length || 0,
            leafletFormat: [normalizedPos.lat, normalizedPos.lon], // [latitude, longitude]
            note: 'Using raw API coordinates - no rounding applied for map plotting',
          });
        }

        // CRITICAL: Leaflet marker requires [latitude, longitude] format
        // normalizedPos.lat = latitude (-90 to 90) - FULL PRECISION from API
        // normalizedPos.lon = longitude (-180 to 180) - FULL PRECISION from API
        // These coordinates are NEVER rounded - they preserve full decimal precision
        const icon = createVesselIcon(vessel.status, 16);
        const marker = L.marker([normalizedPos.lat, normalizedPos.lon], { icon })
          .addTo(map);

        // Create tooltip content for hover (shows on mouseover)
        const tooltipContent = `
          <div style="
            min-width: 220px;
            padding: 8px;
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(148, 163, 184, 0.3);
            border-radius: 6px;
            color: #f1f5f9;
            font-size: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
          ">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #60a5fa;">
              ${vessel.name}
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-size: 11px;">
              ${vessel.position.sog !== undefined ? `
                <span style="color: #94a3b8;">Speed:</span>
                <span style="color: #f1f5f9; font-weight: 500;">${vessel.position.sog.toFixed(1)} kn</span>
              ` : ''}
              ${vessel.position.cog !== undefined ? `
                <span style="color: #94a3b8;">Course:</span>
                <span style="color: #f1f5f9; font-weight: 500;">${vessel.position.cog.toFixed(0)}°</span>
              ` : ''}
              <span style="color: #94a3b8;">Lat:</span>
              <span style="color: #f1f5f9; font-weight: 500;">${normalizedPos.lat.toFixed(6)}</span>
              <span style="color: #94a3b8;">Long:</span>
              <span style="color: #f1f5f9; font-weight: 500;">${normalizedPos.lon.toFixed(6)}</span>
              ${vessel.portCall?.port?.name ? `
                <span style="color: #94a3b8;">Port:</span>
                <span style="color: #f1f5f9; font-weight: 500;">${vessel.portCall.port.name}</span>
              ` : ''}
              <span style="color: #94a3b8;">Status:</span>
              <span style="color: #f1f5f9; font-weight: 500;">${vessel.status || 'N/A'}</span>
            </div>
          </div>
        `;

        // Bind tooltip for hover (permanent, shows on mouseover)
        marker.bindTooltip(tooltipContent, {
          permanent: false,
          direction: 'top',
          offset: [0, -10],
          className: 'vessel-tooltip',
          opacity: 1,
        });

        // Keep popup for click (more detailed info)
        const popupContent = `
          <div style="min-width: 200px;">
            <strong>${vessel.name}</strong><br/>
            <small>${vessel.imo || 'N/A'}</small><br/>
            Status: ${vessel.status}<br/>
            ${vessel.position?.sog ? `SOG: ${vessel.position.sog.toFixed(1)} kn<br/>` : ''}
            ${vessel.position?.cog ? `COG: ${vessel.position.cog.toFixed(0)}°<br/>` : ''}
            Lat: ${normalizedPos.lat.toFixed(6)}<br/>
            Lon: ${normalizedPos.lon.toFixed(6)}<br/>
            ${vessel.portCall ? `<br/>Port: ${vessel.portCall.port?.name || 'N/A'}` : ''}
          </div>
        `;
        marker.bindPopup(popupContent);

        marker.on('click', () => {
          setSelectedVessel(vessel);
          if (onVesselClick) onVesselClick(vessel);
        });

        markersRef.current[vessel.id] = marker;
        bounds.push([normalizedPos.lat, normalizedPos.lon]);
      });

      // Only auto-fit bounds on initial load, not after user has interacted with the map
      if (bounds.length > 0 && !isDrawing && !hasUserInteractedRef.current) {
        initialBoundsSetRef.current = true;
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [vessels, geofences, selectedSiteIds, onVesselClick, isDrawing]);

  // Handle drawing mode
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (isDrawing) {
      // Enable drawing mode
      map.dragging.disable();
      map.doubleClickZoom.disable();
      map.getContainer().style.cursor = 'crosshair';

      // Handle map clicks for drawing
      const handleMapClick = (e) => {
        const { lat, lng } = e.latlng;
        const newPoints = [...drawingPoints, { lat, lon: lng }];
        setDrawingPoints(newPoints);

        // Remove old markers and polyline
        drawingMarkers.forEach(marker => map.removeLayer(marker));
        if (drawingPolyline) {
          map.removeLayer(drawingPolyline);
        }
        
        // Add marker for new point
        const newMarker = L.marker([lat, lng], {
          icon: L.divIcon({
            className: 'drawing-point',
            html: '<div style="width: 12px; height: 12px; background-color: #3b82f6; border: 2px solid white; border-radius: 50%;"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6],
          }),
        }).addTo(map);
        
        const updatedMarkers = [...drawingMarkers, newMarker];
        setDrawingMarkers(updatedMarkers);
        
        // Add polyline connecting all points
        if (newPoints.length > 1) {
          const polyline = L.polyline(
            newPoints.map(p => [p.lat, p.lon]),
            { color: '#3b82f6', weight: 2, opacity: 0.8, dashArray: '5, 5' }
          ).addTo(map);
          setDrawingPolyline(polyline);
        }
      };

      map.on('click', handleMapClick);
      mapClickHandlerRef.current = handleMapClick;
    } else {
      // Disable drawing mode
      map.dragging.enable();
      map.doubleClickZoom.enable();
      map.getContainer().style.cursor = '';

      if (mapClickHandlerRef.current) {
        map.off('click', mapClickHandlerRef.current);
        mapClickHandlerRef.current = null;
      }

      // Clean up drawing
      drawingMarkers.forEach(marker => map.removeLayer(marker));
      setDrawingMarkers([]);
      if (drawingPolyline) {
        map.removeLayer(drawingPolyline);
        setDrawingPolyline(null);
      }
      if (drawingPolygon) {
        map.removeLayer(drawingPolygon);
        setDrawingPolygon(null);
      }
      setDrawingPoints([]);
    }

    return () => {
      if (mapClickHandlerRef.current) {
        map.off('click', mapClickHandlerRef.current);
      }
    };
  }, [isDrawing, drawingPoints, drawingPolyline, drawingPolygon, drawingMarkers]);

  const handleStartDrawing = () => {
    setIsDrawing(true);
    setDrawingPoints([]);
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
    if (mapInstanceRef.current) {
      drawingMarkers.forEach(marker => mapInstanceRef.current.removeLayer(marker));
      if (drawingPolyline) {
        mapInstanceRef.current.removeLayer(drawingPolyline);
      }
      if (drawingPolygon) {
        mapInstanceRef.current.removeLayer(drawingPolygon);
      }
    }
    setDrawingMarkers([]);
    setDrawingPolyline(null);
    setDrawingPolygon(null);
  };

  const handleCompleteDrawing = () => {
    if (drawingPoints.length < 3) {
      alert('Please add at least 3 points to create an area');
      return;
    }

    // Close the polygon by connecting last point to first
    const closedPoints = [...drawingPoints, drawingPoints[0]];
    
    // Create polygon visualization
    if (mapInstanceRef.current) {
      drawingMarkers.forEach(marker => mapInstanceRef.current.removeLayer(marker));
      if (drawingPolyline) {
        mapInstanceRef.current.removeLayer(drawingPolyline);
      }
    }
    setDrawingMarkers([]);
    setDrawingPolyline(null);
    
    const polygon = L.polygon(
      closedPoints.map(p => [p.lat, p.lon]),
      { color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2, weight: 2 }
    ).addTo(mapInstanceRef.current);
    
    setDrawingPolygon(polygon);
    setShowSaveModal(true);
  };

  const handleSaveArea = async (formData) => {
    // Calculate center point from polygon
    const centerLat = drawingPoints.reduce((sum, p) => sum + p.lat, 0) / drawingPoints.length;
    const centerLon = drawingPoints.reduce((sum, p) => sum + p.lon, 0) / drawingPoints.length;

    const opsSiteData = {
      ...formData,
      latitude: centerLat,
      longitude: centerLon,
      polygon: drawingPoints, // Store polygon coordinates
    };

    try {
      await api.post('/ops-sites', opsSiteData);
      queryClient.invalidateQueries(['opsSites']);
      queryClient.invalidateQueries(['dashboard', 'geofences']);
      
      // Reset drawing state
      setIsDrawing(false);
      setDrawingPoints([]);
      setDrawingMarkers([]);
      setDrawingPolyline(null);
      if (drawingPolygon && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(drawingPolygon);
        setDrawingPolygon(null);
      }
      setShowSaveModal(false);
    } catch (error) {
      console.error('Failed to save ops site:', error);
      alert('Failed to save area. Please try again.');
    }
  };

  const handleCancelSave = () => {
    setShowSaveModal(false);
    if (mapInstanceRef.current) {
      if (drawingPolygon) {
        mapInstanceRef.current.removeLayer(drawingPolygon);
        setDrawingPolygon(null);
      }
    }
    setIsDrawing(false);
    setDrawingPoints([]);
    setDrawingMarkers([]);
    setDrawingPolyline(null);
  };

  // Note: Geofence monitoring is handled on the backend
  // The backend checks vessel positions against geofences and generates events

  const handleSiteToggle = (siteId) => {
    const newSelected = new Set(selectedSiteIds);
    if (newSelected.has(siteId)) {
      newSelected.delete(siteId);
    } else {
      newSelected.add(siteId);
    }
    setSelectedSiteIds(newSelected);
  };

  const handleSelectAll = () => {
    if (opsSites) {
      setSelectedSiteIds(new Set(opsSites.map(site => site.id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedSiteIds(new Set());
  };

  return (
    <div className={styles.mapPanel}>
      <div ref={mapRef} className={styles.map} />
      
      {/* Ops Sites Filter */}
      {opsSites && opsSites.length > 0 && (
        <div className={styles.filterPanel}>
          <button
            className={styles.filterToggle}
            onClick={() => setShowFilters(!showFilters)}
            title="Filter Ops Sites"
          >
            <span>Filter Ops Sites</span>
            <span className={styles.filterCount}>
              {selectedSiteIds.size > 0 ? `${selectedSiteIds.size}/${opsSites.length}` : '0'}
            </span>
          </button>
          
          {showFilters && (
            <div className={styles.filterDropdown}>
              <div className={styles.filterHeader}>
                <span>Select Ops Sites to Display</span>
                <div className={styles.filterActions}>
                  <button onClick={handleSelectAll} className={styles.filterActionBtn}>
                    Select All
                  </button>
                  <button onClick={handleDeselectAll} className={styles.filterActionBtn}>
                    Deselect All
                  </button>
                </div>
              </div>
              <div className={styles.filterList}>
                {opsSites.map((site) => (
                  <label key={site.id} className={styles.filterItem}>
                    <input
                      type="checkbox"
                      checked={selectedSiteIds.has(site.id)}
                      onChange={() => handleSiteToggle(site.id)}
                    />
                    <span>{site.name}</span>
                    <span className={styles.filterType}>{site.type}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Base Layer Switcher */}
      <div className={styles.layerSwitcher}>
        <div className={styles.layerSwitcherLabel}>
          <FiMap size={16} />
          <span>Mapa</span>
        </div>
        <div className={styles.layerButtons}>
          <button
            className={`${styles.layerButton} ${baseLayer === 'standard' ? styles.layerButtonActive : ''}`}
            onClick={() => handleLayerSwitch('standard')}
            title="Standard Map"
          >
            Padrão
          </button>
          <button
            className={`${styles.layerButton} ${baseLayer === 'nautical' ? styles.layerButtonActive : ''}`}
            onClick={() => handleLayerSwitch('nautical')}
            title="Nautical Chart"
          >
            Carta Náutica
          </button>
        </div>
      </div>

      {/* Drawing Controls */}
      <div className={styles.mapControls}>
        {!isDrawing ? (
          <button 
            className={styles.drawButton}
            onClick={handleStartDrawing}
            title="Draw Area"
          >
            <FiEdit3 size={18} />
            <span>Draw Area</span>
          </button>
        ) : (
          <>
            <div className={styles.drawingInfo}>
              <span>Click on map to add points ({drawingPoints.length} points)</span>
            </div>
            <button 
              className={styles.completeButton}
              onClick={handleCompleteDrawing}
              disabled={drawingPoints.length < 3}
              title="Complete Area"
            >
              <FiCheck size={18} />
              <span>Complete</span>
            </button>
            <button 
              className={styles.cancelButton}
              onClick={handleCancelDrawing}
              title="Cancel"
            >
              <FiX size={18} />
              <span>Cancel</span>
            </button>
          </>
        )}
      </div>

      {selectedVessel && (
        <div className={styles.vesselInfo}>
          <h4>{selectedVessel.name}</h4>
          <div className={styles.infoRow}>
            <span>Status:</span>
            <span className={styles[selectedVessel.status.toLowerCase()]}>{selectedVessel.status}</span>
          </div>
          {selectedVessel.position?.sog && (
            <div className={styles.infoRow}>
              <span>SOG:</span>
              <span>{selectedVessel.position.sog.toFixed(1)} kn</span>
            </div>
          )}
          {selectedVessel.position?.cog && (
            <div className={styles.infoRow}>
              <span>COG:</span>
              <span>{selectedVessel.position.cog.toFixed(0)}°</span>
            </div>
          )}
          <button 
            className={styles.closeButton}
            onClick={() => setSelectedVessel(null)}
          >
            ×
          </button>
        </div>
      )}

      {showSaveModal && (
        <SaveAreaModal
          points={drawingPoints}
          onSave={handleSaveArea}
          onCancel={handleCancelSave}
        />
      )}
    </div>
  );
}


export default OpsMapPanel;
