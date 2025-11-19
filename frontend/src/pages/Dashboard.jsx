import { useState } from 'react';
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
import FullscreenMapModal from '../components/map/FullscreenMapModal';
import styles from './Dashboard.module.css';

function Dashboard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { tenant } = useAuth();
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Fetch tactical dashboard data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: activeVessels, isLoading: vesselsLoading, error: vesselsError } = useQuery({
    queryKey: ['dashboard', 'active-vessels'],
    queryFn: () => api.get('/dashboard/active-vessels'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Debug logging
  if (import.meta.env.DEV) {
    console.log('[Dashboard] Active vessels:', {
      activeVessels,
      isLoading: vesselsLoading,
      error: vesselsError,
      count: activeVessels?.length,
    });
  }

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['dashboard', 'events'],
    queryFn: () => api.get('/dashboard/events'),
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // CRITICAL: Client-side tenant filtering as defensive measure
  // Backend already filters by tenantId, but this ensures no cross-tenant data leaks
  const filteredVessels = activeVessels?.filter((vessel) => {
    if (!tenant?.id) return false;
    // Filter by tenantId - ensure vessel belongs to current tenant
    return vessel.tenantId === tenant.id;
  }) || [];

  const handleVesselClick = (vessel) => {
    if (vessel.portCallId) {
      navigate(`/port-calls/${vessel.portCallId}`);
    } else {
      navigate(`/vessels/${vessel.id}`);
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Main Dashboard Layout */}
      <div className={styles.dashboardContent}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{t('dashboard.operationsCenter')}</h1>
            <p className={styles.subtitle}>{t('dashboard.maritimeAwareness')}</p>
          </div>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDot}></span>
            <span>{t('dashboard.live')}</span>
          </div>
        </div>

        {/* KPI Bar */}
        <OpsKpiBar stats={stats} />

        {/* Main Content Grid */}
        <div className={styles.contentGrid}>
          {/* Left Column: Map Widget */}
          <div className={styles.mapWidgetContainer}>
            <DashboardMapWidget
              vessels={filteredVessels}
              onVesselClick={handleVesselClick}
              onExpand={() => setIsMapFullscreen(true)}
            />
          </div>

          {/* Right Panel: Stats + Events */}
          <div className={styles.rightPanel}>
            {/* Situational Awareness Panel */}
            <div className={styles.statsSection}>
              <OpsStatsPanel stats={stats} vessels={filteredVessels} />
            </div>

            {/* Tactical Event Feed (Ops Log) */}
            <div className={styles.eventsSection}>
              <OpsEventFeed events={events} isLoading={eventsLoading} />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Map Modal */}
      {isMapFullscreen && (
        <FullscreenMapModal
          vessels={filteredVessels}
          onVesselClick={handleVesselClick}
          onClose={() => setIsMapFullscreen(false)}
        />
      )}
    </div>
  );
}

export default Dashboard;
