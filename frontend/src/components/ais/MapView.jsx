import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './MapView.module.css';

// Fix for default marker icons in Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapView({ position, track, vesselName }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Update position marker
    if (position) {
      // Extract coordinates from various field name formats
      let lat = position.lat ?? position.latitude ?? position.Lat ?? position.Latitude ?? null;
      let lon = position.lon ?? position.longitude ?? position.Lon ?? position.Longitude ?? null;
      
      // Convert to numbers if they're strings (use parseFloat to preserve decimals)
      if (typeof lat === 'string') lat = parseFloat(lat);
      if (typeof lon === 'string') lon = parseFloat(lon);
      
      // Convert to numbers if not already
      if (lat !== null) lat = Number(lat);
      if (lon !== null) lon = Number(lon);
      
      // Validate coordinates are valid numbers and within valid ranges
      if (lat != null && lon != null && isFinite(lat) && isFinite(lon)) {
        // Validate latitude is between -90 and 90
        if (lat < -90 || lat > 90) {
          if (import.meta.env.DEV) {
            console.error('[MapView] Invalid latitude:', lat, 'Position data:', position);
          }
          return;
        }
        // Validate longitude is between -180 and 180
        if (lon < -180 || lon > 180) {
          if (import.meta.env.DEV) {
            console.error('[MapView] Invalid longitude:', lon, 'Position data:', position);
          }
          return;
        }
        
        // Remove existing marker
        if (markerRef.current) {
          map.removeLayer(markerRef.current);
        }

        // CRITICAL: Create marker with validated coordinates
        // Leaflet expects [latitude, longitude] format
        // lat = latitude (-90 to 90), lon = longitude (-180 to 180)
        if (import.meta.env.DEV) {
          console.log('[MapView] Creating marker at:', {
            lat,
            lon,
            leafletFormat: [lat, lon],
            vesselName: vesselName || 'Unknown',
          });
        }
        
        markerRef.current = L.marker([lat, lon])
          .addTo(map)
          .bindPopup(vesselName || 'Vessel Position');

        // Center map on vessel position (also [lat, lon] format)
        map.setView([lat, lon], 10);
      } else {
        if (import.meta.env.DEV) {
          console.warn('[MapView] Invalid position coordinates:', { lat, lon, position });
        }
      }
    }

    // Update track polyline
    if (track && track.length > 0) {
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
      }

      // Normalize and validate track points
      const trackPoints = track
        .map((p) => {
          // Extract coordinates from various formats
          let lat = p.lat ?? p.latitude ?? p.Lat ?? p.Latitude ?? null;
          let lon = p.lon ?? p.longitude ?? p.Lon ?? p.Longitude ?? null;
          
          // Convert to numbers if strings (use parseFloat to preserve decimals)
          if (typeof lat === 'string') lat = parseFloat(lat);
          if (typeof lon === 'string') lon = parseFloat(lon);
          
          // Convert to numbers if not already
          if (lat !== null) lat = Number(lat);
          if (lon !== null) lon = Number(lon);
          
          // Validate coordinates are valid numbers and within valid ranges
          // CRITICAL: Return [lat, lon] format for Leaflet polyline
          if (lat != null && lon != null && isFinite(lat) && isFinite(lon) &&
              lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            return [lat, lon]; // Leaflet format: [latitude, longitude]
          }
          return null;
        })
        .filter(p => p !== null); // Remove invalid points
      
      if (trackPoints.length > 0) {
        polylineRef.current = L.polyline(trackPoints, {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.7,
        }).addTo(map);

        // Fit bounds to show entire track
        map.fitBounds(trackPoints);
      }
    }

    return () => {
      // Cleanup handled by map instance
    };
  }, [position, track, vesselName]);

  return (
    <div className={styles.mapContainer}>
      <div ref={mapRef} className={styles.map} />
      {position && (
        <div className={styles.info}>
          <div className={styles.infoRow}>
            <span>Last AIS update:</span>
            <span>
              {position.timestamp
                ? new Date(position.timestamp).toLocaleString()
                : 'Unknown'}
            </span>
          </div>
          {position.sog !== undefined && (
            <div className={styles.infoRow}>
              <span>Speed:</span>
              <span>{position.sog.toFixed(1)} kn</span>
            </div>
          )}
          {position.cog !== undefined && (
            <div className={styles.infoRow}>
              <span>Course:</span>
              <span>{position.cog.toFixed(0)}°</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MapView;

