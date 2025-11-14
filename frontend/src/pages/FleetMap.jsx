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
        // Fetch AIS position for each vessel
        api
          .get(`/ais/vessels/${portCall.vesselId}/last-position`)
          .then((position) => {
            if (position && position.lat && position.lon) {
              const color = portCall.status === 'IN_PROGRESS' ? 'blue' : 'orange';
              const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              });

              const marker = L.marker([position.lat, position.lon], { icon })
                .addTo(map)
                .bindPopup(
                  `<strong>${portCall.vessel?.name || 'Unknown'}</strong><br/>${portCall.port?.name || portCall.portId}`
                )
                .on('click', () => navigate(`/port-calls/${portCall.id}`));

              markersRef.current[portCall.id] = marker;
              bounds.push([position.lat, position.lon]);
            }
            processedCount++;
            if (processedCount === portCalls.length && bounds.length > 0) {
              map.fitBounds(bounds, { padding: [50, 50] });
            }
          })
          .catch(() => {
            // If no AIS data, use port coordinates if available
            if (portCall.port?.coordinates) {
              const { lat, lon } = portCall.port.coordinates;
              const color = portCall.status === 'IN_PROGRESS' ? 'blue' : 'orange';
              const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              });

              const marker = L.marker([lat, lon], { icon })
                .addTo(map)
                .bindPopup(
                  `<strong>${portCall.vessel?.name || 'Unknown'}</strong><br/>${portCall.port?.name || portCall.portId}`
                )
                .on('click', () => navigate(`/port-calls/${portCall.id}`));

              markersRef.current[portCall.id] = marker;
              bounds.push([lat, lon]);
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

