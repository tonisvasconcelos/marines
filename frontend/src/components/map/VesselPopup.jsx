/**
 * VesselPopup Component
 * MarineTraffic-style mini info card for vessel details
 */

import { useNavigate } from 'react-router-dom';
import styles from './VesselPopup.module.css';

function VesselPopup({ vessel, onClose }) {
  const navigate = useNavigate();
  
  if (!vessel) return null;
  
  const position = vessel.position || {};
  const status = vessel.status || 'AT_SEA';
  const vesselType = vessel.type || vessel.ship_type || vessel.vessel_type || 'Unknown';
  
  // Format coordinates for display (but NOT used for plotting)
  const displayLat = position.lat ? position.lat.toFixed(6) : '---';
  const displayLon = position.lon ? position.lon.toFixed(6) : '---';
  
  const handleViewDetails = () => {
    if (vessel.portCallId) {
      navigate(`/port-calls/${vessel.portCallId}`);
    } else {
      navigate(`/vessels/${vessel.id}`);
    }
    onClose();
  };
  
  return (
    <div className={styles.popup}>
      <div className={styles.popupHeader}>
        <div className={styles.popupTitle}>
          <h3>{vessel.name || 'Unknown Vessel'}</h3>
          <span className={styles.popupType}>{vesselType}</span>
        </div>
        <button className={styles.popupClose} onClick={onClose}>×</button>
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
        
        {position.sog !== undefined && (
          <div className={styles.popupRow}>
            <span className={styles.popupLabel}>Speed:</span>
            <span className={styles.popupValue}>{position.sog.toFixed(1)} kn</span>
          </div>
        )}
        
        {position.cog !== undefined && (
          <div className={styles.popupRow}>
            <span className={styles.popupLabel}>Course:</span>
            <span className={styles.popupValue}>{position.cog.toFixed(0)}°</span>
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
        
        {position.timestamp && (
          <div className={styles.popupRow}>
            <span className={styles.popupLabel}>Last Update:</span>
            <span className={styles.popupValue}>
              {new Date(position.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
      
      <div className={styles.popupActions}>
        <button className={styles.popupButton} onClick={handleViewDetails}>
          View Full Details →
        </button>
      </div>
    </div>
  );
}

export default VesselPopup;

