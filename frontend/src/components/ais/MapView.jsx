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
    if (position && position.lat && position.lon) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }

      markerRef.current = L.marker([position.lat, position.lon])
        .addTo(map)
        .bindPopup(vesselName || 'Vessel Position');

      map.setView([position.lat, position.lon], 10);
    }

    // Update track polyline
    if (track && track.length > 0) {
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
      }

      const trackPoints = track.map((p) => [p.lat, p.lon]);
      polylineRef.current = L.polyline(trackPoints, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.7,
      }).addTo(map);

      // Fit bounds to show entire track
      if (trackPoints.length > 0) {
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

