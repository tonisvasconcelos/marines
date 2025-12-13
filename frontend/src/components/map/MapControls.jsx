/**
 * MapControls Component
 * Professional map controls similar to MarineTraffic/VesselFinder
 * - Coordinate readout (bottom right)
 * - Scale bar
 * - Zoom to fleet button
 * - Auto-center button
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { FiMaximize2, FiMinimize2, FiCrosshair, FiZoomIn } from 'react-icons/fi';
import styles from './MapControls.module.css';

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
      if (e.latlng) {
        setCoordinates({
          lat: e.latlng.lat.toFixed(6),
          lon: e.latlng.lng.toFixed(6),
        });
      }
    };
    
    map.on('mousemove', updateCoordinates);
    map.on('mouseout', () => setCoordinates({ lat: null, lon: null }));
    
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
            bounds.push([lat, lon]);
          }
        }
      }
    });
    
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
      if (onZoomToFleet) onZoomToFleet();
    }
  };
  
  const handleAutoCenter = () => {
    if (!map) return;
    // Center on default operational area (Rio de Janeiro)
    map.setView([-22.9068, -43.1729], 8);
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
 * Shows nautical/metric scale
 */
export function ScaleBar({ map }) {
  useEffect(() => {
    if (!map) return;
    
    // Add Leaflet scale control
    const scaleControl = L.control.scale({
      imperial: false, // Use metric
      metric: true,
      position: 'bottomleft',
    });
    
    scaleControl.addTo(map);
    
    return () => {
      map.removeControl(scaleControl);
    };
  }, [map]);
  
  return null;
}

export default { CoordinateReadout, MapControlButtons, ScaleBar };

