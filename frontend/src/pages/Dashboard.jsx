import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../utils/useI18n';
import { useAuth } from '../modules/auth/AuthContext';
import { api } from '../utils/api';
import DashboardMapMapLibre from '../components/map/DashboardMapMapLibre';
import OpsKpiBar from '../modules/dashboard/OpsKpiBar';
import OpsEventFeed from '../modules/dashboard/OpsEventFeed';
import OpsStatsPanel from '../modules/dashboard/OpsStatsPanel';
import DashboardMapWidget from '../components/map/DashboardMapWidget';
import styles from './Dashboard.module.css';

function Dashboard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // STEP 1: Fetch vessels with their latest positions for this tenant
  const { data: activeVessels = [], isLoading: vesselsLoading } = useQuery({
    queryKey: ['dashboard', 'active-vessels'],
    queryFn: () => api.get('/dashboard/active-vessels'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // STEP 2: Filter vessels to only those with valid positions (lat/lon)
  const vesselsWithPositions = (activeVessels || []).filter(vessel => {
    const pos = vessel.position;
    return pos && 
           (pos.lat != null || pos.latitude != null) && 
           (pos.lon != null || pos.longitude != null || pos.lng != null);
  });

  // Fetch other dashboard data
  const { data: stats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats'),
    refetchInterval: 30000,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['dashboard', 'events'],
    queryFn: () => api.get('/dashboard/events'),
    refetchInterval: 15000,
  });

  const handleVesselClick = (vessel) => {
    if (vessel.portCallId) {
      navigate(`/port-calls/${vessel.portCallId}`);
    } else {
      navigate(`/vessels/${vessel.id}`);
    }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1>{t('dashboard.title')}</h1>
        <span className={styles.liveIndicator}>AO VIVO</span>
      </div>

      <OpsKpiBar stats={stats} />

      <div className={styles.contentGrid}>
        {/* Left Column: Map Widget */}
        <div className={styles.mapWidgetContainer}>
          <DashboardMapWidget
            vessels={vesselsWithPositions} // STEP 3: Pass vessels with positions to map
            tenantVessels={vesselsWithPositions}
            onVesselClick={handleVesselClick}
            onExpand={() => setIsMapFullscreen(true)}
          />
        </div>

        {/* Right Column: Stats and Events */}
        <div className={styles.statsContainer}>
          <OpsStatsPanel stats={stats} vessels={vesselsWithPositions} />
          <OpsEventFeed events={events} />
        </div>
      </div>

      {/* Fullscreen Map Modal */}
      {isMapFullscreen && (
        <div className={styles.fullscreenMapOverlay} onClick={() => setIsMapFullscreen(false)}>
          <div className={styles.fullscreenMapContainer} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.closeMapButton}
              onClick={() => setIsMapFullscreen(false)}
            >
              ×
            </button>
            <DashboardMapMapLibre
              vessels={vesselsWithPositions}
              tenantVessels={vesselsWithPositions}
              onVesselClick={handleVesselClick}
              showControls={true}
              isDashboardWidget={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
