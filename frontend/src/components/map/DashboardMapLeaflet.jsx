import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './DashboardMapLeaflet.module.css';

// Fix for default marker icons in Leaflet with Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom vessel icon
const createVesselIcon = (color = '#3b82f6') => {
  return L.divIcon({
    className: 'vessel-marker',
    html: `<div style="
      width: 20px;
      height: 20px;
      background-color: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

function DashboardMapLeaflet({ vessels = [], onVesselClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Initialize map effect
  useEffect(() => {
    if (!mapRef.current) return;

    // Check if container has dimensions
    const container = mapRef.current;
    const hasDimensions = container.offsetWidth > 0 && container.offsetHeight > 0;
    
    if (!hasDimensions) {
      console.warn('[DashboardMapLeaflet] Map container has no dimensions, retrying...');
      const timeoutId = setTimeout(() => {
        if (mapRef.current && mapRef.current.offsetWidth > 0 && mapRef.current.offsetHeight > 0) {
          if (!mapInstanceRef.current) {
            initializeMap();
          }
        }
      }, 200);
      return () => clearTimeout(timeoutId);
    }

    // Initialize map function
    const initializeMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      
      console.log('[DashboardMapLeaflet] Initializing map with container dimensions:', {
        width: mapRef.current.offsetWidth,
        height: mapRef.current.offsetHeight,
      });
      
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([-23.5505, -46.6333], 3);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
      
      // Invalidate size after map is loaded
      mapInstanceRef.current.whenReady(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          console.log('[DashboardMapLeaflet] Map initialized and size invalidated');
        }
      });
    };

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      initializeMap();
    }

    return () => {
      // Cleanup handled by map instance
    };
  }, []); // Only run once on mount

  // Update markers effect
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Invalidate size to ensure map renders correctly
    setTimeout(() => {
      if (map) {
        map.invalidateSize();
      }
    }, 100);

    // Clear existing markers
    markersRef.current.forEach(marker => {
      map.removeLayer(marker);
    });
    markersRef.current = [];

    // Add markers for each vessel with valid position
    const validPositions = [];
    
    vessels.forEach((vessel) => {
      if (!vessel.position) {
        if (import.meta.env.DEV) {
          console.log('[DashboardMapLeaflet] Vessel without position:', vessel.name || vessel.id);
        }
        return;
      }

      // Extract coordinates from various field name formats
      let lat = vessel.position.lat ?? vessel.position.latitude ?? vessel.position.Lat ?? vessel.position.Latitude ?? null;
      let lon = vessel.position.lon ?? vessel.position.longitude ?? vessel.position.Lon ?? vessel.position.Longitude ?? vessel.position.lng ?? null;
      
      // Convert to numbers if they're strings (preserve full precision)
      if (typeof lat === 'string') lat = parseFloat(lat);
      if (typeof lon === 'string') lon = parseFloat(lon);
      
      // Convert to numbers if not already
      if (lat !== null) lat = Number(lat);
      if (lon !== null) lon = Number(lon);
      
      // Validate coordinates
      if (lat != null && lon != null && isFinite(lat) && isFinite(lon) &&
          lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        
        if (import.meta.env.DEV) {
          console.log('[DashboardMapLeaflet] Adding marker for vessel:', {
            name: vessel.name,
            lat,
            lon,
            position: vessel.position,
          });
        }
        
        // Create marker
        const marker = L.marker([lat, lon], {
          icon: createVesselIcon('#3b82f6'),
        })
          .addTo(map)
          .bindPopup(vessel.name || 'Vessel');
        
        // Add click handler
        if (onVesselClick) {
          marker.on('click', () => {
            onVesselClick(vessel);
          });
        }
        
        markersRef.current.push(marker);
        validPositions.push([lat, lon]);
      } else {
        if (import.meta.env.DEV) {
          console.warn('[DashboardMapLeaflet] Invalid coordinates for vessel:', {
            name: vessel.name,
            lat,
            lon,
            position: vessel.position,
          });
        }
      }
    });

    // Fit bounds to show all vessels if we have positions
    if (validPositions.length > 0) {
      const group = new L.featureGroup(markersRef.current);
      const bounds = group.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.1), { maxZoom: 10 });
      }
    } else {
      if (import.meta.env.DEV) {
        console.warn('[DashboardMapLeaflet] No valid vessel positions to display');
      }
    }
  }, [vessels, onVesselClick]);

  return (
    <div className={styles.mapContainer}>
      <div ref={mapRef} className={styles.map} />
    </div>
  );
}

export default DashboardMapLeaflet;
