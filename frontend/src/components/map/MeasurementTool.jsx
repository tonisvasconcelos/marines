/**
 * MeasurementTool Component
 * MyShipTracking-style distance measurement tool
 * Allows users to measure distances on the map
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { FiMaximize2 } from 'react-icons/fi';
import styles from './MeasurementTool.module.css';

/**
 * Calculate distance between two points (Haversine formula)
 * Returns distance in nautical miles
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3440; // Earth radius in nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function MeasurementTool({ map, enabled, onToggle }) {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [points, setPoints] = useState([]);
  const [distance, setDistance] = useState(0);
  const lineRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!map || !enabled) return;

    const handleMapClick = (e) => {
      if (!isMeasuring) return;

      const { lng, lat } = e.lngLat;
      const newPoints = [...points, [lng, lat]];
      setPoints(newPoints);

      // Calculate total distance
      if (newPoints.length > 1) {
        let totalDistance = 0;
        for (let i = 1; i < newPoints.length; i++) {
          const [lon1, lat1] = newPoints[i - 1];
          const [lon2, lat2] = newPoints[i];
          totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
        }
        setDistance(totalDistance);
      }

      // Update line
      if (newPoints.length > 1) {
        if (lineRef.current) {
          map.getSource('measurement-line').setData({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: newPoints,
            },
          });
        } else {
          // Add line source and layer
          map.addSource('measurement-line', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: newPoints,
              },
            },
          });

          map.addLayer({
            id: 'measurement-line',
            type: 'line',
            source: 'measurement-line',
            paint: {
              'line-color': '#3b82f6',
              'line-width': 2,
              'line-dasharray': [2, 2],
            },
          });

          lineRef.current = true;
        }
      }

      // Add marker at click point
      const marker = new maplibregl.Marker({
        color: '#3b82f6',
        draggable: false,
      })
        .setLngLat([lng, lat])
        .addTo(map);

      markersRef.current.push(marker);
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, enabled, isMeasuring, points]);

  const handleStart = () => {
    setIsMeasuring(true);
    setPoints([]);
    setDistance(0);
    // Clear existing measurement
    if (lineRef.current && map.getSource('measurement-line')) {
      map.removeLayer('measurement-line');
      map.removeSource('measurement-line');
      lineRef.current = null;
    }
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  };

  const handleClear = () => {
    setIsMeasuring(false);
    setPoints([]);
    setDistance(0);
    if (lineRef.current && map.getSource('measurement-line')) {
      map.removeLayer('measurement-line');
      map.removeSource('measurement-line');
      lineRef.current = null;
    }
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
  };

  return (
    <div className={styles.measurementTool}>
      <button
        className={`${styles.toggleButton} ${isMeasuring ? styles.active : ''}`}
        onClick={isMeasuring ? handleClear : handleStart}
        title={isMeasuring ? 'Stop Measuring' : 'Start Measuring'}
      >
        <FiMaximize2 size={18} />
      </button>
      {isMeasuring && distance > 0 && (
        <div className={styles.distanceDisplay}>
          {distance.toFixed(2)} NM
        </div>
      )}
    </div>
  );
}

export default MeasurementTool;

