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
    queryFn: async () => {
      const response = await api.get('/dashboard/active-vessels');
      console.log('[Dashboard] API response for active-vessels:', {
        responseType: typeof response,
        isArray: Array.isArray(response),
        length: Array.isArray(response) ? response.length : 'N/A',
        sampleVessel: Array.isArray(response) && response.length > 0 ? response[0] : null,
        allVessels: Array.isArray(response) ? response.map(v => ({
          id: v.id,
          name: v.name,
          hasPosition: !!v.position,
          position: v.position,
          positionKeys: v.position ? Object.keys(v.position) : null,
        })) : null,
      });
      return response;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // STEP 2: Filter vessels to only those with valid positions (lat/lon)
  const vesselsWithPositions = (activeVessels || []).filter(vessel => {
    const pos = vessel.position;
    const hasValidPosition = pos && 
           (pos.lat != null || pos.latitude != null) && 
           (pos.lon != null || pos.longitude != null || pos.lng != null);
    
    if (!hasValidPosition && vessel) {
      console.log('[Dashboard] Filtering out vessel without position:', {
        id: vessel.id,
        name: vessel.name,
        hasPosition: !!vessel.position,
        position: vessel.position,
        positionType: typeof vessel.position,
        positionKeys: vessel.position ? Object.keys(vessel.position) : null,
      });
    }
    
    return hasValidPosition;
  });
  
  // Log filtering results
  useEffect(() => {
    console.log('[Dashboard] Vessel filtering results:', {
      totalVessels: activeVessels?.length || 0,
      vesselsWithPositions: vesselsWithPositions.length,
      vesselsWithoutPositions: (activeVessels?.length || 0) - vesselsWithPositions.length,
    });
  }, [activeVessels, vesselsWithPositions]);

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
