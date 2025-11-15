/**
 * VesselMarker Component
 * Professional AIS vessel marker with arrow shape, rotation, and color coding
 * Similar to MarineTraffic/VesselFinder style
 */

import { useEffect, useRef } from 'react';
import L from 'leaflet';

/**
 * Get vessel type color (similar to MarineTraffic color scheme)
 */
function getVesselTypeColor(vesselType, status) {
  // Status-based colors (primary)
  if (status === 'IN_PORT') return '#10b981'; // Green
  if (status === 'INBOUND') return '#f59e0b'; // Amber
  if (status === 'AT_SEA') return '#3b82f6'; // Blue
  if (status === 'ANCHORED') return '#8b5cf6'; // Purple
  
  // Type-based colors (fallback)
  const typeColors = {
    'CARGO': '#3b82f6',      // Blue
    'TANKER': '#ef4444',     // Red
    'CONTAINER': '#8b5cf6',  // Purple
    'PASSENGER': '#10b981',  // Green
    'FISHING': '#f59e0b',    // Amber
    'TUG': '#f97316',        // Orange
    'TUG SUPPLY': '#f97316', // Orange
    'SUPPLY': '#06b6d4',     // Cyan
    'OFFSHORE': '#06b6d4',   // Cyan
  };
  
  const normalizedType = (vesselType || '').toUpperCase();
  return typeColors[normalizedType] || '#64748b'; // Default grey
}

/**
 * Create professional arrow-shaped vessel marker
 * Rotates based on COG (Course Over Ground) or Heading
 */
export function createVesselMarkerIcon(vessel, zoom = 10) {
  const status = vessel.status || 'AT_SEA';
  const vesselType = vessel.type || vessel.ship_type || vessel.vessel_type || '';
  const color = getVesselTypeColor(vesselType, status);
  
  // Get rotation angle from COG (preferred) or heading
  const cog = vessel.position?.cog ?? vessel.position?.course ?? null;
  const heading = vessel.position?.heading ?? null;
  const rotation = cog ?? heading ?? 0;
  
  // Scale marker size based on zoom level
  const baseSize = 16;
  const zoomScale = Math.max(0.8, Math.min(1.5, (zoom - 6) / 10));
  const size = baseSize * zoomScale;
  
  // Professional vessel arrow shape (pointing up, rotated by COG/Heading)
  // Similar to MarineTraffic/VesselFinder hull-shaped markers
  const arrowPath = `
    M ${size * 0.5} 0
    L ${size * 0.85} ${size * 0.5}
    L ${size * 0.75} ${size * 0.7}
    L ${size * 0.65} ${size * 0.85}
    L ${size * 0.35} ${size * 0.85}
    L ${size * 0.25} ${size * 0.7}
    L ${size * 0.15} ${size * 0.5}
    Z
  `;
  
  // Create SVG icon with rotation
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3"/>
        </filter>
      </defs>
      <g transform="rotate(${rotation} ${size / 2} ${size / 2})">
        <path d="${arrowPath}" fill="${color}" stroke="white" stroke-width="1.5" opacity="0.95" filter="url(#shadow)"/>
        <circle cx="${size * 0.5}" cy="${size * 0.3}" r="${size * 0.12}" fill="white" opacity="0.9"/>
      </g>
    </svg>
  `;
  
  return L.divIcon({
    className: 'vessel-marker-arrow',
    html: svg,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

/**
 * VesselMarker Component
 * Wraps Leaflet marker with vessel-specific logic
 */
export function VesselMarker({ vessel, map, onClick, onHover }) {
  const markerRef = useRef(null);
  
  useEffect(() => {
    if (!map || !vessel || !vessel.position) return;
    
    // CRITICAL: Extract full-precision coordinates
    const rawLat = vessel.position.lat ?? vessel.position.latitude ?? vessel.position.Lat ?? vessel.position.Latitude ?? null;
    const rawLon = vessel.position.lon ?? vessel.position.longitude ?? vessel.position.Lon ?? vessel.position.Longitude ?? null;
    
    if (!rawLat || !rawLon) return;
    
    // Convert to numbers (preserve full precision)
    const lat = typeof rawLat === 'string' ? parseFloat(rawLat) : Number(rawLat);
    const lon = typeof rawLon === 'string' ? parseFloat(rawLon) : Number(rawLon);
    
    // Validate coordinates
    if (!isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return;
    }
    
    // Get current zoom for icon sizing
    const zoom = map.getZoom();
    
    // Create marker with full-precision coordinates
    const icon = createVesselMarkerIcon(vessel, zoom);
    const marker = L.marker([lat, lon], { icon });
    
    // Add hover effect
    if (onHover) {
      marker.on('mouseover', () => onHover(vessel, true));
      marker.on('mouseout', () => onHover(vessel, false));
    }
    
    // Add click handler
    if (onClick) {
      marker.on('click', () => onClick(vessel));
    }
    
    // Add to map
    marker.addTo(map);
    markerRef.current = marker;
    
    // Update icon on zoom change (for size scaling)
    const updateIcon = () => {
      const newZoom = map.getZoom();
      const newIcon = createVesselMarkerIcon(vessel, newZoom);
      marker.setIcon(newIcon);
    };
    
    map.on('zoomend', updateIcon);
    
    // Cleanup
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        map.off('zoomend', updateIcon);
      }
    };
  }, [map, vessel, onClick, onHover]);
  
  return null; // This component doesn't render anything directly
}

export default VesselMarker;

