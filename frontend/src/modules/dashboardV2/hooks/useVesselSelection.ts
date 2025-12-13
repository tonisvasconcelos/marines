/**
 * useVesselSelection Hook
 * Manages selected vessel state
 * Coordinates between sidebar and map
 */

import { useState, useCallback } from 'react';
import { Vessel } from './useStoredVessels';

export interface UseVesselSelectionResult {
  selectedVesselId: string | null;
  selectVessel: (vessel: Vessel | null) => void;
  clearSelection: () => void;
  isSelected: (vesselId: string) => boolean;
}

export function useVesselSelection(): UseVesselSelectionResult {
  const [selectedVesselId, setSelectedVesselId] = useState<string | null>(null);

  const selectVessel = useCallback((vessel: Vessel | null) => {
    setSelectedVesselId(vessel?.id || null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedVesselId(null);
  }, []);

  const isSelected = useCallback(
    (vesselId: string) => {
      return selectedVesselId === vesselId;
    },
    [selectedVesselId]
  );

  return {
    selectedVesselId,
    selectVessel,
    clearSelection,
    isSelected,
  };
}
