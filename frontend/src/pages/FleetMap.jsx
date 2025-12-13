import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../utils/useI18n';
import { api } from '../utils/api';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './FleetMap.module.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function FleetMap() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const { data: portCalls } = useQuery({
    queryKey: ['portCalls', 'active'],
    queryFn: () => api.get('/port-calls?status=IN_PROGRESS,PLANNED'),
  });

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([0, 0], 2);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach((marker) => {
      map.removeLayer(marker);
    });
    markersRef.current = {};

    // Add markers for each port call
    if (portCalls && portCalls.length > 0) {
      const bounds = [];
      let processedCount = 0;

      portCalls.forEach((portCall) => {
        // CRITICAL: Use stored positions from database to save AIS API credits
        // Only fetch from AIS API if user explicitly requests it (manual refresh)
        // For automatic display, use stored positions from vessel_position_history
        api
          .get(`/vessels/${portCall.vesselId}/position-history?limit=1`)
          .then((history) => {
            // Get latest stored position (first item in history is most recent)
            const position = history && history.length > 0 ? history[0] : null;
            // CRITICAL: Extract full-precision coordinates from API response
            // DO NOT round, truncate, or format these values - they are used for map markers
            const rawLat = position?.lat ?? position?.latitude ?? position?.Lat ?? position?.Latitude ?? null;
            const rawLon = position?.lon ?? position?.longitude ?? position?.Lon ?? position?.Longitude ?? null;
            
            // Convert to numbers if strings (use parseFloat to preserve full decimal precision)
            let lat = rawLat != null ? (typeof rawLat === 'string' ? parseFloat(rawLat) : Number(rawLat)) : null;
            let lon = rawLon != null ? (typeof rawLon === 'string' ? parseFloat(rawLon) : Number(rawLon)) : null;
            
            // Validate coordinates are finite numbers
            if (lat != null && lon != null && isFinite(lat) && isFinite(lon) &&
                lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
              
              if (import.meta.env.DEV) {
                console.log('[FleetMap] Creating marker with full-precision coordinates:', {
                  vesselId: portCall.vesselId,
                  vesselName: portCall.vessel?.name || 'Unknown',
                  lat,
                  lon,
                  latPrecision: lat.toString().split('.')[1]?.length || 0,
                  lonPrecision: lon.toString().split('.')[1]?.length || 0,
                  note: 'Using raw API coordinates - no rounding applied',
                });
              }
              
              const color = portCall.status === 'IN_PROGRESS' ? 'blue' : 'orange';
              const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              });

              // CRITICAL: Use full-precision coordinates for Leaflet marker
              // Leaflet expects [latitude, longitude] format with full decimal precision
              const marker = L.marker([lat, lon], { icon })
                .addTo(map)
                .bindPopup(
                  `<strong>${portCall.vessel?.name || 'Unknown'}</strong><br/>${portCall.port?.name || portCall.portId}`
                )
                .on('click', () => navigate(`/port-calls/${portCall.id}`));

              markersRef.current[portCall.id] = marker;
              bounds.push([lat, lon]); // Use full-precision coordinates for bounds
            }
            processedCount++;
            if (processedCount === portCalls.length && bounds.length > 0) {
              map.fitBounds(bounds, { padding: [50, 50] });
            }
          })
          .catch(() => {
            // If no stored position data, use port coordinates if available
            // CRITICAL: Port coordinates should also preserve full precision
            if (portCall.port?.coordinates) {
              const rawLat = portCall.port.coordinates.lat ?? portCall.port.coordinates.latitude ?? null;
              const rawLon = portCall.port.coordinates.lon ?? portCall.port.coordinates.longitude ?? null;
              
              // Convert to numbers if strings (preserve full precision)
              let lat = rawLat != null ? (typeof rawLat === 'string' ? parseFloat(rawLat) : Number(rawLat)) : null;
              let lon = rawLon != null ? (typeof rawLon === 'string' ? parseFloat(rawLon) : Number(rawLon)) : null;
              
              // Validate coordinates
              if (lat != null && lon != null && isFinite(lat) && isFinite(lon) &&
                  lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
                
                const color = portCall.status === 'IN_PROGRESS' ? 'blue' : 'orange';
                const icon = L.divIcon({
                  className: 'custom-marker',
                  html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                });

                // CRITICAL: Use full-precision port coordinates for Leaflet marker
                const marker = L.marker([lat, lon], { icon })
                  .addTo(map)
                  .bindPopup(
                    `<strong>${portCall.vessel?.name || 'Unknown'}</strong><br/>${portCall.port?.name || portCall.portId}`
                  )
                  .on('click', () => navigate(`/port-calls/${portCall.id}`));

                markersRef.current[portCall.id] = marker;
                bounds.push([lat, lon]); // Use full-precision coordinates for bounds
              }
            }
            processedCount++;
            if (processedCount === portCalls.length && bounds.length > 0) {
              map.fitBounds(bounds, { padding: [50, 50] });
            }
          });
      });
    }
  }, [portCalls, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{t('fleetMap.title')}</h1>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: 'blue' }}></div>
            <span>{t('fleetMap.inProgress')}</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: 'orange' }}></div>
            <span>{t('fleetMap.planned')}</span>
          </div>
        </div>
      </div>
      <div ref={mapRef} className={styles.map} />
    </div>
  );
}

export default FleetMap;

