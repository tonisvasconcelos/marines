/**
 * DashboardLayout Component
 * Full-screen layout with map and floating sidebar
 * Flightradar24-style layout
 */

import React from 'react';
import { VesselMap } from './VesselMap/VesselMap';
import { VesselSidebar } from './VesselSidebar/VesselSidebar';
import styles from './styles/dashboard.module.css';

export function DashboardLayout({
  allVessels = [],
  vesselsWithPositions = [],
  selectedVesselId = null,
  onVesselClick,
  onVesselSelect,
}) {
  const handleVesselClick = (vessel) => {
    if (onVesselSelect) {
      onVesselSelect(vessel);
    }
    if (onVesselClick) {
      onVesselClick(vessel);
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Full-screen map */}
      <div className={styles.mapWrapper}>
        <VesselMap
          vessels={vesselsWithPositions}
          selectedVesselId={selectedVesselId}
          onVesselClick={handleVesselClick}
        />
      </div>

      {/* Floating sidebar */}
      <div className={styles.sidebarWrapper}>
        <VesselSidebar
          vessels={allVessels}
          selectedVesselId={selectedVesselId}
          onVesselClick={handleVesselClick}
        />
      </div>
    </div>
  );
}

export default DashboardLayout;
