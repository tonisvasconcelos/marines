/**
 * DashboardMapMapLibre Component
 * Simplified: Just plot vessels with lat/lon on the map
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapEngine } from './MapEngine';
import { VesselLayer } from './VesselLayer';
import { normalizeVesselPosition } from '../../utils/coordinateUtils';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - CSS module exists but TypeScript doesn't have type declarations
import styles from './DashboardMap.module.css';

function DashboardMapMapLibre({ vessels, onVesselClick, tenantVessels, showControls = true, isDashboardWidget = false }) {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [selectedLayers, setSelectedLayers] = useState(['standard']);
  const hasUserInteractedRef = useRef(false);
  const boundsFittedRef = useRef(false);

  // STEP 1: When map is ready, store reference
  const handleMapReady = useCallback((map) => {
    mapRef.current = map;
    console.log('[DashboardMapMapLibre] Map ready');
    
    // Track user interactions
    map.on('zoomstart', () => hasUserInteractedRef.current = true);
    map.on('dragstart', () => hasUserInteractedRef.current = true);
  }, []);

  // STEP 2: When vessels are loaded, fit map bounds to show them
  useEffect(() => {
    if (!mapRef.current || !vessels || vessels.length === 0 || boundsFittedRef.current || hasUserInteractedRef.current) {
      return;
    }

    // Wait for map style to be ready
    const fitBounds = () => {
      if (!mapRef.current) return;

      const bounds = [];
      vessels.forEach((vessel) => {
        if (vessel.position) {
          const pos = normalizeVesselPosition({
            ...vessel.position,
            vesselName: vessel.name,
          });
          if (pos) {
            bounds.push([pos.lon, pos.lat]); // [lon, lat] for MapLibre
          }
        }
      });

      if (bounds.length > 0) {
        const lons = bounds.map(b => b[0]);
        const lats = bounds.map(b => b[1]);
        const bbox = [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)],
        ];
        
        console.log('[DashboardMapMapLibre] Fitting bounds to', bounds.length, 'vessels');
        mapRef.current.fitBounds(bbox, { padding: 50, duration: 1000 });
        boundsFittedRef.current = true;
      }
    };

    if (mapRef.current.isStyleLoaded && mapRef.current.isStyleLoaded()) {
      fitBounds();
    } else {
      mapRef.current.once('load', fitBounds);
      mapRef.current.once('style.load', fitBounds);
    }
  }, [vessels]);

  const handleVesselClick = useCallback((vessel) => {
    if (onVesselClick) {
      onVesselClick(vessel);
    } else if (vessel.portCallId) {
      navigate(`/port-calls/${vessel.portCallId}`);
    } else {
      navigate(`/vessels/${vessel.id}`);
    }
  }, [onVesselClick, navigate]);

  const handleBaseLayerChange = useCallback((layerId) => {
    setSelectedLayers([layerId]);
  }, []);

  return (
    <div className={styles.dashboardMap}>
      <div ref={mapContainerRef} className={styles.map} />
      
      {/* Map Engine - initializes the map */}
      <MapEngine
        mapContainerRef={mapContainerRef}
        onMapReady={handleMapReady}
        initialCenter={[-46.6333, -23.5505]} // São Paulo
        initialZoom={3}
        baseLayer={selectedLayers[0] || 'standard'}
        selectedLayers={selectedLayers}
        onBaseLayerChange={handleBaseLayerChange}
        hideBuiltInControls={isDashboardWidget}
      />
      
      {/* STEP 3: Plot vessels on the map */}
      {mapRef.current && (
        <VesselLayer
          map={mapRef.current}
          vessels={vessels || []}
          tenantVessels={tenantVessels || []}
          onVesselClick={handleVesselClick}
          onVesselHover={() => {}}
        />
      )}
    </div>
  );
}

export default DashboardMapMapLibre;
