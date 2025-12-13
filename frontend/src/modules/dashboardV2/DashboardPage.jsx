/**
 * DashboardPage Component
 * 
 * This dashboard visualizes vessels using the latest positions already recorded in the system.
 * It does not fetch live AIS data and does not create new position records.
 * 
 * Data Source:
 * - GET /api/dashboard/active-vessels
 * - Returns vessels with stored positions from vessel_position_history
 * - Vessels without positions are shown in sidebar but not plotted on map
 * 
 * Behavior:
 * - Polls /api/dashboard/active-vessels every 60 seconds
 * - Only vessels with position !== null are rendered on map
 * - All vessels (including those without positions) are shown in sidebar
 * - No AIS API calls are made from this dashboard
 * - No position records are created or updated
 */

import { useNavigate } from 'react-router-dom';
import { useStoredVessels } from './hooks/useStoredVessels';
import { useVesselSelection } from './hooks/useVesselSelection';
import { DashboardLayout } from './DashboardLayout';
import styles from './styles/dashboard.module.css';

export function DashboardPage() {
  const navigate = useNavigate();
  const { allVessels, vesselsWithPositions, isLoading, error } =
    useStoredVessels();
  const { selectVessel, selectedVesselId, clearSelection } =
    useVesselSelection();

  const handleVesselClick = (vessel) => {
    // Navigate to vessel detail page
    navigate(`/vessels/${vessel.id}`);
  };

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error loading vessels</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      allVessels={allVessels}
      vesselsWithPositions={vesselsWithPositions}
      selectedVesselId={selectedVesselId}
      onVesselClick={handleVesselClick}
      onVesselSelect={selectVessel}
    />
  );
}

export default DashboardPage;
