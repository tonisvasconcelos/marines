/**
 * useStoredVessels Hook
 * Fetches vessels from /api/dashboard/active-vessels
 * Returns all vessels and filtered vessels with positions
 * 
 * CRITICAL: This hook does NOT call AIS APIs and does NOT store positions.
 * It only reads from the existing stored positions in vessel_position_history.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../../../utils/api';

export interface VesselPosition {
  lat: number;
  lon: number;
  cog?: number;
  heading?: number;
  timestamp: string;
  source: 'stored';
}

export interface Vessel {
  id: string;
  name: string;
  mmsi?: string;
  imo?: string;
  type: string;
  status: 'AT_SEA' | 'IN_PORT' | 'INBOUND' | 'ANCHORED';
  position: VesselPosition | null;
}

export interface UseStoredVesselsResult {
  allVessels: Vessel[];
  vesselsWithPositions: Vessel[];
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch stored vessel positions
 * Polls every 60 seconds to reflect newly recorded positions
 */
export function useStoredVessels(): UseStoredVesselsResult {
  const { data: allVessels = [], isLoading, error } = useQuery({
    queryKey: ['dashboard', 'active-vessels'],
    queryFn: async () => {
      const response = await api.get('/dashboard/active-vessels');
      return response as Vessel[];
    },
    refetchInterval: 60000, // Poll every 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Filter vessels with valid positions for map rendering
  const vesselsWithPositions = allVessels.filter((vessel) => {
    const pos = vessel.position;
    return (
      pos &&
      pos.lat != null &&
      pos.lon != null &&
      isFinite(pos.lat) &&
      isFinite(pos.lon) &&
      pos.lat >= -90 &&
      pos.lat <= 90 &&
      pos.lon >= -180 &&
      pos.lon <= 180
    );
  });

  return {
    allVessels,
    vesselsWithPositions,
    isLoading,
    error: error as Error | null,
  };
}
