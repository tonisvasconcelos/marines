/**
 * useMapController Hook
 * Manages map instance and interactions
 * Handles fit bounds, centering on vessels, zoom management
 */

import { useCallback, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Vessel } from './useStoredVessels';

export interface UseMapControllerResult {
  mapRef: React.MutableRefObject<maplibregl.Map | null>;
  centerOnVessel: (vessel: Vessel) => void;
  fitBoundsToVessels: (vessels: Vessel[]) => void;
  setMapInstance: (map: maplibregl.Map | null) => void;
}

export function useMapController(): UseMapControllerResult {
  const mapRef = useRef<maplibregl.Map | null>(null);

  const setMapInstance = useCallback((map: maplibregl.Map | null) => {
    mapRef.current = map;
  }, []);

  const centerOnVessel = useCallback(
    (vessel: Vessel) => {
      if (!mapRef.current || !vessel.position) return;

      const { lat, lon } = vessel.position;
      if (lat == null || lon == null) return;

      mapRef.current.easeTo({
        center: [lon, lat],
        zoom: 12,
        duration: 1000,
      });
    },
    []
  );

  const fitBoundsToVessels = useCallback((vessels: Vessel[]) => {
    if (!mapRef.current || vessels.length === 0) return;

    const bounds: [number, number][] = [];

    vessels.forEach((vessel) => {
      if (vessel.position?.lat != null && vessel.position?.lon != null) {
        bounds.push([vessel.position.lon, vessel.position.lat]);
      }
    });

    if (bounds.length === 0) return;

    const lons = bounds.map((b) => b[0]);
    const lats = bounds.map((b) => b[1]);

    const bbox: [[number, number], [number, number]] = [
      [Math.min(...lons), Math.min(...lats)],
      [Math.max(...lons), Math.max(...lats)],
    ];

    mapRef.current.fitBounds(bbox, {
      padding: 50,
      duration: 1000,
    });
  }, []);

  return {
    mapRef,
    centerOnVessel,
    fitBoundsToVessels,
    setMapInstance,
  };
}
