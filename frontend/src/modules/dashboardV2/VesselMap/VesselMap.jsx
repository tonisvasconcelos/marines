/**
 * VesselMap Component
 * MapLibre map wrapper for Dashboard V2
 * Integrates with existing VesselLayer for rendering
 */

import React, { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { MapEngine } from '../../../components/map/MapEngine';
import { VesselLayer } from '../../../components/map/VesselLayer';
import { addShipIconToMap } from './vesselIcons';
import { useMapController } from '../hooks/useMapController';
import styles from '../styles/map.module.css';

export function VesselMap({
  vessels,
  selectedVesselId,
  onVesselClick,
  onVesselHover,
}) {
  const mapContainerRef = useRef(null);
  const {
    mapRef,
    setMapInstance,
    fitBoundsToVessels,
    centerOnVessel,
  } = useMapController();
  const boundsFittedRef = useRef(false);
  const hasUserInteractedRef = useRef(false);

  // Handle map ready
  const handleMapReady = useCallback(
    (map) => {
      setMapInstance(map);

      // Track user interactions
      map.on('zoomstart', () => {
        hasUserInteractedRef.current = true;
      });
      map.on('dragstart', () => {
        hasUserInteractedRef.current = true;
      });

      // Add ship icon when map is ready
      if (map.isStyleLoaded()) {
        addShipIconToMap(map).catch((error) => {
          console.error('Error adding ship icon:', error);
        });
      } else {
        map.once('style.load', () => {
          addShipIconToMap(map).catch((error) => {
            console.error('Error adding ship icon:', error);
          });
        });
      }
    },
    [setMapInstance]
  );

  // Fit bounds to vessels on initial load
  useEffect(() => {
    if (
      !mapRef.current ||
      !vessels ||
      vessels.length === 0 ||
      boundsFittedRef.current ||
      hasUserInteractedRef.current
    ) {
      return;
    }

    const fitBounds = () => {
      if (!mapRef.current) return;
      fitBoundsToVessels(vessels);
      boundsFittedRef.current = true;
    };

    if (mapRef.current.isStyleLoaded()) {
      fitBounds();
    } else {
      mapRef.current.once('style.load', fitBounds);
      mapRef.current.once('load', fitBounds);
    }
  }, [vessels, mapRef, fitBoundsToVessels]);

  // Center on selected vessel
  useEffect(() => {
    if (!selectedVesselId) return;

    const selectedVessel = vessels.find((v) => v.id === selectedVesselId);
    if (selectedVessel) {
      centerOnVessel(selectedVessel);
    }
  }, [selectedVesselId, vessels, centerOnVessel]);

  const handleVesselClick = useCallback(
    (vessel) => {
      onVesselClick(vessel);
    },
    [onVesselClick]
  );

  const handleVesselHover = useCallback(
    (vessel) => {
      if (onVesselHover) {
        onVesselHover(vessel);
      }
    },
    [onVesselHover]
  );

  return (
    <div className={styles.vesselMap}>
      <div ref={mapContainerRef} className={styles.mapContainer} />
      <MapEngine
        mapContainerRef={mapContainerRef}
        onMapReady={handleMapReady}
        initialCenter={[-46.6333, -23.5505]} // São Paulo default
        initialZoom={3}
        baseLayer="standard"
        selectedLayers={['standard']}
        onBaseLayerChange={() => {}}
        hideBuiltInControls={false}
      />
      {mapRef.current && (
        <VesselLayer
          map={mapRef.current}
          vessels={vessels || []}
          tenantVessels={[]}
          onVesselClick={handleVesselClick}
          onVesselHover={handleVesselHover}
        />
      )}
    </div>
  );
}

export default VesselMap;
