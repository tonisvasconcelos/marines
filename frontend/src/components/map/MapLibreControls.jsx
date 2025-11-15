/**
 * MapLibreControls Component
 * MapLibre-specific controls (coordinate readout, scale bar, zoom controls)
 * MyShipTracking-style controls
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { FiMaximize2, FiMinimize2, FiCrosshair, FiZoomIn } from 'react-icons/fi';
import styles from './MapLibreControls.module.css';

/**
 * Coordinate Readout Control
 * Shows live mouse position coordinates (bottom right)
 */
export function CoordinateReadout({ map }) {
  const [coordinates, setCoordinates] = useState({ lat: null, lon: null });
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!map) return;
    
    const updateCoordinates = (e) => {
      if (e.lngLat) {
        setCoordinates({
          lat: e.lngLat.lat.toFixed(6),
          lon: e.lngLat.lng.toFixed(6),
        });
      }
    };
    
    map.on('mousemove', updateCoordinates);
    map.on('mouseout', () => {
      setCoordinates({ lat: null, lon: null });
    });
    
    return () => {
      map.off('mousemove', updateCoordinates);
      map.off('mouseout', updateCoordinates);
    };
  }, [map]);
  
  if (!coordinates.lat && !coordinates.lon) return null;
  
  return (
    <div ref={containerRef} className={styles.coordinateReadout}>
      <div className={styles.coordinateRow}>
        <span className={styles.coordinateLabel}>Lat:</span>
        <span className={styles.coordinateValue}>{coordinates.lat}</span>
      </div>
      <div className={styles.coordinateRow}>
        <span className={styles.coordinateLabel}>Lon:</span>
        <span className={styles.coordinateValue}>{coordinates.lon}</span>
      </div>
    </div>
  );
}

/**
 * Map Control Buttons
 * Zoom to fleet, auto-center, fullscreen, etc.
 */
export function MapControlButtons({ map, vessels, onZoomToFleet }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const handleZoomToFleet = () => {
    if (!map || !vessels || vessels.length === 0) return;
    
    const bounds = [];
    vessels.forEach((vessel) => {
      if (vessel.position) {
        const rawLat = vessel.position.lat ?? vessel.position.latitude ?? null;
        const rawLon = vessel.position.lon ?? vessel.position.longitude ?? null;
        
        if (rawLat && rawLon) {
          const lat = typeof rawLat === 'string' ? parseFloat(rawLat) : Number(rawLat);
          const lon = typeof rawLon === 'string' ? parseFloat(rawLon) : Number(rawLon);
          
          if (isFinite(lat) && isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            bounds.push([lon, lat]); // MapLibre uses [lon, lat]
          }
        }
      }
    });
    
    if (bounds.length > 0) {
      // Calculate bounding box
      const lons = bounds.map(b => b[0]);
      const lats = bounds.map(b => b[1]);
      const bbox = [
        [Math.min(...lons), Math.min(...lats)],
        [Math.max(...lons), Math.max(...lats)],
      ];
      
      map.fitBounds(bbox, { padding: 50 });
      if (onZoomToFleet) onZoomToFleet();
    }
  };
  
  const handleAutoCenter = () => {
    if (!map) return;
    // Center on default operational area (Rio de Janeiro)
    map.easeTo({
      center: [-43.1729, -22.9068], // [lon, lat]
      zoom: 8,
    });
  };
  
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  return (
    <div className={styles.mapControlButtons}>
      <button
        className={styles.controlButton}
        onClick={handleZoomToFleet}
        title="Zoom to Fleet"
      >
        <FiZoomIn size={18} />
        <span>Zoom to Fleet</span>
      </button>
      
      <button
        className={styles.controlButton}
        onClick={handleAutoCenter}
        title="Auto Center"
      >
        <FiCrosshair size={18} />
        <span>Center</span>
      </button>
      
      <button
        className={styles.controlButton}
        onClick={handleFullscreen}
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
      >
        {isFullscreen ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
        <span>{isFullscreen ? "Exit" : "Fullscreen"}</span>
      </button>
    </div>
  );
}

/**
 * Scale Bar Control
 * Shows nautical/metric scale (MapLibre doesn't have built-in scale, so we create one)
 */
export function ScaleBar({ map }) {
  const [scale, setScale] = useState(null);
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (!map) return;
    
    const updateScale = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      
      // Calculate scale at center latitude
      const metersPerPixel = (156543.03392 * Math.cos(center.lat * Math.PI / 180)) / Math.pow(2, zoom);
      const pixels = 100; // 100px bar
      const meters = metersPerPixel * pixels;
      const nauticalMiles = meters / 1852;
      
      setScale({
        nauticalMiles: nauticalMiles.toFixed(nauticalMiles >= 1 ? 1 : 2),
        kilometers: (meters / 1000).toFixed(meters >= 1000 ? 1 : 2),
      });
    };
    
    map.on('move', updateScale);
    map.on('zoom', updateScale);
    updateScale();
    
    return () => {
      map.off('move', updateScale);
      map.off('zoom', updateScale);
    };
  }, [map]);
  
  if (!scale) return null;
  
  return (
    <div ref={containerRef} className={styles.scaleBar}>
      <div className={styles.scaleBarLine}></div>
      <div className={styles.scaleBarLabel}>
        {scale.nauticalMiles} NM / {scale.kilometers} km
      </div>
    </div>
  );
}

export default { CoordinateReadout, MapControlButtons, ScaleBar };

