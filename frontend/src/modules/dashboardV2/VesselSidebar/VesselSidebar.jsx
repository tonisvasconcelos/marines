/**
 * VesselSidebar Component
 * Floating left sidebar showing active vessels
 * Flightradar24-style sidebar
 */

import { useMemo, useState, useCallback } from 'react';
import { VesselSearch } from './VesselSearch';
import { VesselListItem } from './VesselListItem';
import styles from '../styles/sidebar.module.css';

/**
 * Filter vessels by search term
 */
function filterVessels(vessels, searchTerm) {
  if (!searchTerm.trim()) return vessels;

  const term = searchTerm.toLowerCase();
  return vessels.filter((vessel) => {
    const nameMatch = vessel.name.toLowerCase().includes(term);
    const mmsiMatch = vessel.mmsi?.toLowerCase().includes(term);
    const imoMatch = vessel.imo?.toLowerCase().includes(term);
    const typeMatch = vessel.type?.toLowerCase().includes(term);
    const statusMatch = vessel.status.toLowerCase().includes(term);

    return nameMatch || mmsiMatch || imoMatch || typeMatch || statusMatch;
  });
}

export function VesselSidebar({
  vessels,
  selectedVesselId,
  onVesselClick,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredVessels = useMemo(() => {
    return filterVessels(vessels, searchTerm);
  }, [vessels, searchTerm]);

  const handleSearchChange = useCallback((term) => {
    setSearchTerm(term);
  }, []);

  const handleVesselClick = useCallback(
    (vessel) => {
      onVesselClick(vessel);
    },
    [onVesselClick]
  );

  // Group vessels by status for better organization
  const groupedVessels = useMemo(() => {
    const groups = {
      AT_SEA: [],
      INBOUND: [],
      IN_PORT: [],
      ANCHORED: [],
      OTHER: [],
    };

    filteredVessels.forEach((vessel) => {
      const status = vessel.status || 'OTHER';
      if (groups[status]) {
        groups[status].push(vessel);
      } else {
        groups.OTHER.push(vessel);
      }
    });

    return groups;
  }, [filteredVessels]);

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>Active Vessels (Live)</h2>
        <div className={styles.vesselCount}>{vessels.length} vessels</div>
      </div>

      <VesselSearch onSearchChange={handleSearchChange} />

      <div className={styles.vesselList}>
        {filteredVessels.length === 0 ? (
          <div className={styles.emptyState}>
            {searchTerm ? 'No vessels match your search' : 'No vessels found'}
          </div>
        ) : (
          <>
            {groupedVessels.AT_SEA.length > 0 && (
              <div className={styles.statusGroup}>
                <div className={styles.statusGroupHeader}>At Sea</div>
                {groupedVessels.AT_SEA.map((vessel) => (
                  <VesselListItem
                    key={vessel.id}
                    vessel={vessel}
                    isSelected={selectedVesselId === vessel.id}
                    onClick={handleVesselClick}
                  />
                ))}
              </div>
            )}

            {groupedVessels.INBOUND.length > 0 && (
              <div className={styles.statusGroup}>
                <div className={styles.statusGroupHeader}>Inbound</div>
                {groupedVessels.INBOUND.map((vessel) => (
                  <VesselListItem
                    key={vessel.id}
                    vessel={vessel}
                    isSelected={selectedVesselId === vessel.id}
                    onClick={handleVesselClick}
                  />
                ))}
              </div>
            )}

            {groupedVessels.IN_PORT.length > 0 && (
              <div className={styles.statusGroup}>
                <div className={styles.statusGroupHeader}>In Port</div>
                {groupedVessels.IN_PORT.map((vessel) => (
                  <VesselListItem
                    key={vessel.id}
                    vessel={vessel}
                    isSelected={selectedVesselId === vessel.id}
                    onClick={handleVesselClick}
                  />
                ))}
              </div>
            )}

            {groupedVessels.ANCHORED.length > 0 && (
              <div className={styles.statusGroup}>
                <div className={styles.statusGroupHeader}>Anchored</div>
                {groupedVessels.ANCHORED.map((vessel) => (
                  <VesselListItem
                    key={vessel.id}
                    vessel={vessel}
                    isSelected={selectedVesselId === vessel.id}
                    onClick={handleVesselClick}
                  />
                ))}
              </div>
            )}

            {groupedVessels.OTHER.length > 0 && (
              <div className={styles.statusGroup}>
                {groupedVessels.OTHER.map((vessel) => (
                  <VesselListItem
                    key={vessel.id}
                    vessel={vessel}
                    isSelected={selectedVesselId === vessel.id}
                    onClick={handleVesselClick}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default VesselSidebar;
