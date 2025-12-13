/**
 * MiniPopup Component
 * MyShipTracking-style vessel popup card
 * Shows on vessel click with essential AIS data
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// DISABLED: useQuery import not needed since we disabled automatic AIS queries
// import { useQuery } from '@tanstack/react-query';
import { FiX, FiExternalLink, FiMap, FiClock } from 'react-icons/fi';
// DISABLED: AIS API imports to save credits
// import { getVesselStatus, getVesselsNearby, getVesselTrack } from '../../api/ais';
import styles from './MiniPopup.module.css';

interface MiniPopupProps {
  vessel: {
    id?: string;
    name?: string;
    mmsi?: string;
    imo?: string;
    type?: string;
    status?: string;
    position?: {
      lat?: number;
      lon?: number;
      lng?: number;
      sog?: number;
      speed?: number;
      cog?: number;
      course?: number;
      navStatus?: string;
      timestamp?: string;
    };
  };
  position?: { lat?: number; lon?: number; lng?: number };
  onClose: () => void;
  apiKey?: string;
}

export function MiniPopup({ vessel, position, onClose, apiKey }: MiniPopupProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'nearby' | 'track'>('details');
  const [showHistory, setShowHistory] = useState(false);

  if (!vessel) return null;

  const mmsi = vessel.mmsi;
  const imo = vessel.imo;

  // CRITICAL: Disable automatic AIS API calls to save credits
  // These queries are now disabled by default - users must manually refresh if needed
  // Use stored vessel data from props instead of fetching from AIS API
  
  // DISABLED: Automatic vessel status fetch
  // const { data: vesselStatus, isLoading: statusLoading } = useQuery({
  //   queryKey: ['vessel-status', mmsi || imo],
  //   queryFn: () => getVesselStatus(mmsi, imo, true),
  //   enabled: false, // DISABLED to save credits
  //   staleTime: 30000,
  // });
  const vesselStatus = null; // Use vessel.position from props instead
  const statusLoading = false;

  // DISABLED: Automatic nearby vessels fetch
  // const { data: nearbyVessels, isLoading: nearbyLoading } = useQuery({
  //   queryKey: ['vessels-nearby', mmsi],
  //   queryFn: () => getVesselsNearby(mmsi!, 20, false),
  //   enabled: false, // DISABLED to save credits
  //   staleTime: 60000,
  // });
  const nearbyVessels = null;
  const nearbyLoading = false;

  // DISABLED: Automatic vessel track fetch
  // const { data: trackPoints, isLoading: trackLoading } = useQuery({
  //   queryKey: ['vessel-track', mmsi || imo, showHistory],
  //   queryFn: () => {
  //     const to = new Date();
  //     const from = new Date();
  //     from.setDate(from.getDate() - 1);
  //     return getVesselTrack(mmsi, imo, from, to, undefined, 1);
  //   },
  //   enabled: false, // DISABLED to save credits
  //   staleTime: 300000,
  // });
  const trackPoints = null;
  const trackLoading = false;

  // Use stored vessel data from props instead of AIS API response
  const status = vessel.position || position || {};
  const vesselType = vessel.type || 'Unknown';

  // Format coordinates for display (not used for plotting)
  const displayLat = status.lat ? status.lat.toFixed(6) : (status.lat || '---');
  const displayLon = (status.lng || status.lon) ? (status.lng || status.lon).toFixed(6) : '---';
  
  // Use status for position data (renamed from 'pos' for clarity)
  const pos = status;

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
          <span className={`${styles.popupValue} ${styles[`status${pos.navStatus || vessel.status || 'AT_SEA'}`]}`}>
            {(pos.navStatus || vessel.status || 'AT_SEA').replace('_', ' ')}
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

