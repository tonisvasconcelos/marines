import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../utils/useI18n';
import { api } from '../utils/api';
import OpsMapPanel from '../modules/dashboard/OpsMapPanel';
import OpsKpiBar from '../modules/dashboard/OpsKpiBar';
import OpsEventFeed from '../modules/dashboard/OpsEventFeed';
import OpsStatsPanel from '../modules/dashboard/OpsStatsPanel';
import styles from './Dashboard.module.css';

function Dashboard() {
  const navigate = useNavigate();
  const { t } = useI18n();

  // Fetch tactical dashboard data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: activeVessels, isLoading: vesselsLoading } = useQuery({
    queryKey: ['dashboard', 'active-vessels'],
    queryFn: () => api.get('/dashboard/active-vessels'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

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
        <OpsMapPanel
          vessels={activeVessels}
          geofences={geofences}
          opsSites={opsSites}
          onVesselClick={handleVesselClick}
        />
      </div>

      {/* Overlay Content */}
      <div className={styles.overlayContent}>
        {/* Tactical Header */}
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

        {/* Mission-Critical KPIs */}
        <OpsKpiBar stats={stats} />

        {/* Right Sidebar: Stats + Events */}
        <div className={styles.sidebar}>
          {/* Situational Awareness Panel */}
          <div className={styles.statsSection}>
            <OpsStatsPanel stats={stats} vessels={activeVessels} />
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
