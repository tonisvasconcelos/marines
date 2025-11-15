/**
 * MiniPopup Component
 * MyShipTracking-style vessel popup card
 * Shows on vessel click with essential AIS data
 */

import { useNavigate } from 'react-router-dom';
import { FiX, FiExternalLink } from 'react-icons/fi';
import styles from './MiniPopup.module.css';

export function MiniPopup({ vessel, position, onClose }) {
  const navigate = useNavigate();

  if (!vessel) return null;

  const pos = vessel.position || position || {};
  const status = vessel.status || 'AT_SEA';
  const vesselType = vessel.type || vessel.ship_type || vessel.vessel_type || 'Unknown';

  // Format coordinates for display (not used for plotting)
  const displayLat = pos.lat ? pos.lat.toFixed(6) : '---';
  const displayLon = pos.lon ? pos.lon.toFixed(6) : '---';

  const handleViewDetails = () => {
    if (vessel.portCallId) {
      navigate(`/port-calls/${vessel.portCallId}`);
    } else {
      navigate(`/vessels/${vessel.id}`);
    }
    onClose();
  };

  return (
    <div className={styles.miniPopup}>
      <div className={styles.popupHeader}>
        <div className={styles.popupTitle}>
          <h3>{vessel.name || 'Unknown Vessel'}</h3>
          <span className={styles.popupType}>{vesselType}</span>
        </div>
        <button className={styles.popupClose} onClick={onClose}>
          <FiX size={18} />
        </button>
      </div>

      <div className={styles.popupContent}>
        <div className={styles.popupRow}>
          <span className={styles.popupLabel}>IMO:</span>
          <span className={styles.popupValue}>{vessel.imo || '---'}</span>
        </div>
        <div className={styles.popupRow}>
          <span className={styles.popupLabel}>MMSI:</span>
          <span className={styles.popupValue}>{vessel.mmsi || '---'}</span>
        </div>

        {pos.sog !== undefined && (
          <div className={styles.popupRow}>
            <span className={styles.popupLabel}>Speed:</span>
            <span className={styles.popupValue}>{pos.sog.toFixed(1)} kn</span>
          </div>
        )}

        {pos.cog !== undefined && (
          <div className={styles.popupRow}>
            <span className={styles.popupLabel}>Course:</span>
            <span className={styles.popupValue}>{pos.cog.toFixed(0)}°</span>
          </div>
        )}

        <div className={styles.popupRow}>
          <span className={styles.popupLabel}>Status:</span>
          <span className={`${styles.popupValue} ${styles[`status${status}`]}`}>
            {status.replace('_', ' ')}
          </span>
        </div>

        <div className={styles.popupRow}>
          <span className={styles.popupLabel}>Position:</span>
          <span className={styles.popupValue}>
            {displayLat}, {displayLon}
          </span>
        </div>

        {vessel.portCall?.port?.name && (
          <div className={styles.popupRow}>
            <span className={styles.popupLabel}>Port:</span>
            <span className={styles.popupValue}>{vessel.portCall.port.name}</span>
          </div>
        )}

        {pos.timestamp && (
          <div className={styles.popupRow}>
            <span className={styles.popupLabel}>Last Update:</span>
            <span className={styles.popupValue}>
              {new Date(pos.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      <div className={styles.popupActions}>
        <button className={styles.popupButton} onClick={handleViewDetails}>
          <FiExternalLink size={14} />
          <span>View Details</span>
        </button>
      </div>
    </div>
  );
}

export default MiniPopup;

