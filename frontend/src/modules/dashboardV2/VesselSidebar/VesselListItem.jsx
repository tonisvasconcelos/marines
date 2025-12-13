/**
 * VesselListItem Component
 * Individual vessel list item in sidebar
 * Shows vessel info, handles missing positions
 */

import { useCallback } from 'react';
import { getVesselStatusColor } from '../VesselMap/vesselIcons';
import styles from '../styles/sidebar.module.css';

/**
 * Format timestamp to "X min ago" format
 */
function formatTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now.getTime() - time.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 min ago';
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

export function VesselListItem({
  vessel,
  isSelected,
  onClick,
}) {
  const handleClick = useCallback(() => {
    onClick(vessel);
  }, [vessel, onClick]);

  const statusColor = getVesselStatusColor(vessel.status);
  const hasPosition = vessel.position !== null;

  return (
    <div
      className={`${styles.vesselListItem} ${isSelected ? styles.selected : ''}`}
      onClick={handleClick}
    >
      <div className={styles.vesselHeader}>
        <h3 className={styles.vesselName}>{vessel.name}</h3>
        <div
          className={styles.statusBadge}
          style={{ backgroundColor: statusColor }}
        >
          {vessel.status}
        </div>
      </div>

      <div className={styles.vesselDetails}>
        {(vessel.mmsi || vessel.imo) && (
          <div className={styles.vesselId}>
            {vessel.mmsi && <span>MMSI: {vessel.mmsi}</span>}
            {vessel.imo && <span>IMO: {vessel.imo}</span>}
          </div>
        )}

        {vessel.type && (
          <div className={styles.vesselType}>{vessel.type}</div>
        )}

        {hasPosition ? (
          <div className={styles.lastUpdate}>
            Last update: {formatTimeAgo(vessel.position.timestamp)}
          </div>
        ) : (
          <div className={styles.noPosition}>No position recorded</div>
        )}
      </div>
    </div>
  );
}

export default VesselListItem;
