import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../utils/useI18n';
import { useAuth } from '../modules/auth/AuthContext';
import { api } from '../utils/api';
import DashboardMapMapLibre from '../components/map/DashboardMapMapLibre';
import OpsKpiBar from '../modules/dashboard/OpsKpiBar';
import OpsEventFeed from '../modules/dashboard/OpsEventFeed';
import OpsStatsPanel from '../modules/dashboard/OpsStatsPanel';
import styles from './Dashboard.module.css';

function Dashboard() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { tenant } = useAuth();

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

  const { data: geofences } = useQuery({
    queryKey: ['dashboard', 'geofences'],
    queryFn: () => api.get('/dashboard/geofences'),
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: opsSites } = useQuery({
    queryKey: ['opsSites'],
    queryFn: () => api.get('/ops-sites'),
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
      {/* Full-screen Map Background */}
      <div className={styles.mapBackground}>
        <DashboardMapMapLibre
          vessels={filteredVessels}
          geofences={geofences}
          opsSites={opsSites}
          onVesselClick={handleVesselClick}
        />
      </div>

      {/* Overlay Content - 3 Column Layout */}
      <div className={styles.overlayContent}>
        {/* Main Content: Header + KPIs + Map */}
        <div className={styles.mainContent}>
          {/* Compact Header */}
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

          {/* Compact KPI Bar */}
          <OpsKpiBar stats={stats} />

          {/* Map Container - fills remaining space */}
          <div className={styles.mapContainer}>
            {/* Map is in background layer */}
          </div>
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
  );
}

export default Dashboard;
