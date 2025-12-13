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
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors (authentication/authorization issues)
      if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
        return false;
      }
      return failureCount < 1;
    },
  });

  // Demo data based on provided vessel positions (only in development)
  const demoVessels = import.meta.env.DEV ? [
    {
      id: 'demo-akofs-santos',
      name: 'AKOFS SANTOS',
      imo: '9423437',
      mmsi: '710005865',
      type: 'OFFSHORE',
      status: 'AT_SEA',
      tenantId: tenant?.id || 'demo-tenant',
      position: {
        lat: -24.481873,
        lon: -44.217957,
        latitude: -24.481873,
        longitude: -44.217957,
        course: 200,
        heading: 200,
        speed: null,
        timestamp: new Date('2025-12-12T20:50:19').toISOString(),
      },
    },
  ] : [];

  const { data: activeVessels, isLoading: vesselsLoading, error: vesselsError } = useQuery({
    queryKey: ['dashboard', 'active-vessels'],
    queryFn: () => api.get('/dashboard/active-vessels'),
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
        return false;
      }
      return failureCount < 1;
    },
  });

  // Use demo data if API fails or returns empty, only in development mode
  const vesselsToDisplay = (activeVessels && activeVessels.length > 0) 
    ? activeVessels 
    : (import.meta.env.DEV ? demoVessels : []);

  // Always log to diagnose issues
  console.log('[Dashboard] Active vessels:', {
    activeVessels,
    vesselsToDisplay,
    isLoading: vesselsLoading,
    error: vesselsError,
    count: activeVessels?.length,
    demoCount: demoVessels.length,
    vesselsWithPositions: vesselsToDisplay?.filter(v => {
      const pos = v.position;
      return pos && (pos.lat != null || pos.latitude != null) && (pos.lon != null || pos.longitude != null || pos.lng != null);
    }).length,
    sampleVessel: vesselsToDisplay?.[0],
    samplePosition: vesselsToDisplay?.[0]?.position,
    allVesselsWithPositions: vesselsToDisplay?.map(v => ({
      id: v.id,
      name: v.name,
      hasPosition: !!v.position,
      position: v.position,
    })),
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['dashboard', 'events'],
    queryFn: () => api.get('/dashboard/events'),
    refetchInterval: 15000, // Refresh every 15 seconds
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error?.message?.includes('Unauthorized') || error?.message?.includes('Forbidden')) {
        return false;
      }
      return failureCount < 1;
    },
  });

  // CRITICAL: Client-side tenant filtering as defensive measure
  // Backend already filters by tenantId, but this ensures no cross-tenant data leaks
  const filteredVessels = vesselsToDisplay?.filter((vessel) => {
    if (!tenant?.id && !vessel.tenantId) return true; // Allow demo vessels if no tenant
    if (!tenant?.id) return false;
    // Filter by tenantId - ensure vessel belongs to current tenant
    return vessel.tenantId === tenant.id || vessel.tenantId === 'demo-tenant';
  }) || [];
  
  // Log filtering results to diagnose issues
  console.log('[Dashboard] Vessel filtering:', {
    vesselsToDisplayCount: vesselsToDisplay?.length,
    filteredVesselsCount: filteredVessels.length,
    tenantId: tenant?.id,
    sampleVessel: vesselsToDisplay?.[0],
    sampleVesselTenantId: vesselsToDisplay?.[0]?.tenantId,
    filteredVessels: filteredVessels.map(v => ({
      id: v.id,
      name: v.name,
      tenantId: v.tenantId,
      hasPosition: !!v.position,
    })),
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
              tenantVessels={filteredVessels} // Pass tenant vessels for highlighting
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
          tenantVessels={filteredVessels} // Pass tenant vessels for highlighting
          onVesselClick={handleVesselClick}
          onClose={() => setIsMapFullscreen(false)}
        />
      )}
    </div>
  );
}

export default Dashboard;
