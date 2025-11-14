import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../../utils/useI18n';
import { api } from '../../utils/api';
import Card from '../../components/ui/Card';
import KpiCard from '../../components/ui/KpiCard';
import MapView from '../../components/ais/MapView';
import { FiSearch, FiCamera, FiTrash2 } from 'react-icons/fi';
import styles from './VesselDetail.module.css';

function VesselDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Fetch vessel data (includes AIS enrichment)
  const { data: vessel, isLoading } = useQuery({
    queryKey: ['vessel', id],
    queryFn: () => api.get(`/vessels/${id}`),
  });

  // Fetch AIS position data
  const { data: position } = useQuery({
    queryKey: ['vessel', id, 'position'],
    queryFn: async () => {
      try {
        const data = await api.get(`/vessels/${id}/position`);
        return {
          ...data,
          lat: data.lat || data.Lat || data.latitude || data.Latitude,
          lon: data.lon || data.Lon || data.longitude || data.Longitude,
        };
      } catch (error) {
        console.error('Failed to fetch vessel position:', error);
        return null;
      }
    },
    enabled: !!vessel && (!!vessel.imo || !!vessel.mmsi),
    refetchInterval: 60000,
    retry: 1,
  });

  // Fetch position history for trip calculations
  const { data: positionHistory } = useQuery({
    queryKey: ['vessel', id, 'position-history'],
    queryFn: () => api.get(`/vessels/${id}/position-history?limit=1000`),
    enabled: !!vessel && (!!vessel.imo || !!vessel.mmsi),
  });

  // Delete vessel mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/vessels/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['vessels']);
      navigate('/vessels');
    },
    onError: (error) => {
      alert(t('vessels.deleteError') || `Failed to delete vessel: ${error.message}`);
    },
  });

  const handleDelete = () => {
    if (window.confirm(t('vessels.deleteConfirm') || `Are you sure you want to delete ${vessel?.name || 'this vessel'}? This action cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  // Calculate trip metrics from position history (AIS-driven)
  // MUST be called before early returns to follow Rules of Hooks
  const tripMetrics = useMemo(() => {
    if (!positionHistory || !Array.isArray(positionHistory) || positionHistory.length < 2) {
      return {
        tripDistance: null,
        avgSpeed: position?.sog || position?.speed || null,
        maxSpeed: position?.sog || position?.speed || null,
        tripTime: null,
      };
    }

    try {
      // Sort by timestamp
      const sorted = [...positionHistory].sort(
        (a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0)
      );

      // Calculate total distance (nautical miles)
      let totalDistance = 0;
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const prevLat = prev.lat || prev.Lat;
        const prevLon = prev.lon || prev.Lon;
        const currLat = curr.lat || curr.Lat;
        const currLon = curr.lon || curr.Lon;
        
        if (prevLat && prevLon && currLat && currLon) {
          const dist = calculateDistance(prevLat, prevLon, currLat, currLon);
          totalDistance += dist;
        }
      }

      // Calculate speeds
      const speeds = sorted
        .map(p => p.sog || p.speed)
        .filter(s => s != null && s > 0 && !isNaN(s));
      const avgSpeed = speeds.length > 0
        ? speeds.reduce((a, b) => a + b, 0) / speeds.length
        : null;
      const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : null;

      // Calculate trip time
      const startTime = sorted[0].timestamp ? new Date(sorted[0].timestamp) : null;
      const endTime = sorted[sorted.length - 1].timestamp ? new Date(sorted[sorted.length - 1].timestamp) : null;
      
      let tripTime = null;
      if (startTime && endTime && !isNaN(startTime.getTime()) && !isNaN(endTime.getTime())) {
        const tripTimeMs = endTime - startTime;
        if (tripTimeMs > 0) {
          const tripTimeHours = Math.floor(tripTimeMs / (1000 * 60 * 60));
          const tripTimeMins = Math.floor((tripTimeMs % (1000 * 60 * 60)) / (1000 * 60));
          tripTime = { hours: tripTimeHours, mins: tripTimeMins };
        }
      }

      return {
        tripDistance: totalDistance > 0 ? totalDistance : null,
        avgSpeed,
        maxSpeed,
        tripTime,
      };
    } catch (error) {
      console.error('Error calculating trip metrics:', error);
      return {
        tripDistance: null,
        avgSpeed: position?.sog || position?.speed || null,
        maxSpeed: position?.sog || position?.speed || null,
        tripTime: null,
      };
    }
  }, [positionHistory, position]);

  // Early returns AFTER all hooks
  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!vessel) {
    return <div className={styles.error}>{t('vessels.notFound')}</div>;
  }

  // Extract AIS data from vessel (enriched by API) - safe access
  const aisVesselData = {
    name: vessel.name || '---',
    type: vessel.type || vessel.ship_type || vessel.vessel_type || '---',
    imo: vessel.imo ? vessel.imo.replace(/^IMO/i, '').trim() : '---',
    mmsi: vessel.mmsi || '---',
    flag: vessel.flag || vessel.flag_code || '---',
    callSign: vessel.callSign || vessel.callsign || vessel.call_sign || '---',
    length: vessel.length || null,
    width: vessel.width || vessel.beam || null,
    size: (vessel.length && vessel.width) 
      ? `${vessel.length} x ${vessel.width} m`
      : vessel.size || '---',
    grossTonnage: vessel.grossTonnage || vessel.gt || vessel.gross_tonnage || null,
    deadweightTonnage: vessel.deadweightTonnage || vessel.dwt || vessel.deadweight_tonnage || null,
    buildYear: vessel.buildYear || vessel.build || vessel.build_year || null,
    draught: vessel.draught || vessel.draft || position?.draught || position?.draft || null,
  };

  // Extract AIS position data - safe access
  const aisPositionData = {
    latitude: position?.lat || position?.Lat || position?.latitude || position?.Latitude || null,
    longitude: position?.lon || position?.Lon || position?.longitude || position?.Longitude || null,
    speed: position?.sog || position?.speed || position?.speedOverGround || null,
    course: position?.cog || position?.course || position?.courseOverGround || null,
    heading: position?.heading || null,
    navStatus: position?.navStatus || position?.status || position?.nav_status || null,
    timestamp: position?.timestamp || position?.last_position_time || null,
    source: position?.source || 'AIS',
    station: position?.station || (position?.source === 'myshiptracking' ? 'T-AIS' : 'AIS'),
    area: position?.area || position?.region || null,
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/vessels')}>
          ← {t('common.back')}
        </button>
        <div className={styles.headerContent}>
          <div>
            <h1>{aisVesselData.name}</h1>
            <p className={styles.subtitle}>
              {aisVesselData.type} • IMO: {aisVesselData.imo} • MMSI: {aisVesselData.mmsi}
            </p>
          </div>
          <button
            className={styles.deleteButton}
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            title={t('vessels.delete') || 'Delete vessel'}
          >
            <FiTrash2 />
            {t('vessels.delete') || 'Delete'}
          </button>
        </div>
      </div>

      {/* Hero Section - Map and KPIs */}
      <div className={styles.hero}>
        <div className={styles.mapContainer}>
          {aisPositionData.latitude && aisPositionData.longitude ? (
            <MapView
              position={{
                lat: aisPositionData.latitude,
                lon: aisPositionData.longitude,
              }}
              vesselName={aisVesselData.name}
            />
          ) : (
            <div className={styles.mapPlaceholder}>
              <p>No position data available</p>
            </div>
          )}
        </div>
        <div className={styles.kpis}>
          <KpiCard 
            title="Trip Distance" 
            value={tripMetrics.tripDistance ? `${tripMetrics.tripDistance.toFixed(2)} nm` : '---'} 
            icon="📊" 
          />
          <KpiCard 
            title="Average Speed" 
            value={tripMetrics.avgSpeed ? `${tripMetrics.avgSpeed.toFixed(1)} kn` : (aisPositionData.speed ? `${aisPositionData.speed.toFixed(1)} kn` : '---')} 
            icon="⚡" 
          />
          <KpiCard 
            title="Max Speed" 
            value={tripMetrics.maxSpeed ? `${tripMetrics.maxSpeed.toFixed(1)} kn` : (aisPositionData.speed ? `${aisPositionData.speed.toFixed(1)} kn` : '---')} 
            icon="🚀" 
          />
          <KpiCard 
            title="Position Received" 
            value={aisPositionData.timestamp ? formatTimeAgo(new Date(aisPositionData.timestamp)) : '---'} 
            icon="📍" 
          />
        </div>
      </div>

      {/* Vessel Details Section */}
      <div className={styles.section}>
        <Card>
          <h2>Vessel Information</h2>
          <div className={styles.detailsGrid}>
            <div className={styles.photoSection}>
              {vessel.imageUrl ? (
                <img 
                  src={vessel.imageUrl} 
                  alt={aisVesselData.name}
                  className={styles.vesselPhoto}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={styles.photoPlaceholder}
                style={{ display: vessel.imageUrl ? 'none' : 'flex' }}
              >
                <FiCamera size={32} />
                <span>Upload Photo</span>
              </div>
            </div>
            <div className={styles.detailsList}>
              <DetailItem label="Type" value={aisVesselData.type} icon={<FiSearch size={16} />} />
              <DetailItem label="IMO" value={aisVesselData.imo} />
              <DetailItem label="MMSI" value={aisVesselData.mmsi} />
              <DetailItem label="Flag" value={aisVesselData.flag} flagCode={aisVesselData.flag} />
              <DetailItem label="Call Sign" value={aisVesselData.callSign} />
              <DetailItem label="Size" value={aisVesselData.size} />
              <DetailItem label="GT" value={aisVesselData.grossTonnage ? `${aisVesselData.grossTonnage}` : '---'} />
              <DetailItem label="DWT" value={aisVesselData.deadweightTonnage ? `${aisVesselData.deadweightTonnage}` : '---'} />
              <DetailItem label="Build" value={aisVesselData.buildYear ? `${aisVesselData.buildYear}` : '---'} />
              <DetailItem label="Draught" value={aisVesselData.draught ? `${aisVesselData.draught} m` : '---'} />
            </div>
          </div>
        </Card>
      </div>

      {/* AIS Telemetry Section */}
      <div className={styles.section}>
        <Card>
          <h2>AIS Telemetry</h2>
          <div className={styles.detailsGrid}>
            <TelemetryItem label="Longitude" value={aisPositionData.longitude ? aisPositionData.longitude.toFixed(5) : '---'} />
            <TelemetryItem label="Latitude" value={aisPositionData.latitude ? aisPositionData.latitude.toFixed(5) : '---'} />
            <TelemetryItem label="Speed" value={aisPositionData.speed ? `${aisPositionData.speed.toFixed(1)} kn` : '⚓'} />
            <TelemetryItem label="Course" value={aisPositionData.course ? `${aisPositionData.course.toFixed(0)}°` : '---'} />
            <TelemetryItem label="Heading" value={aisPositionData.heading ? `${aisPositionData.heading.toFixed(0)}°` : '---'} />
            <TelemetryItem label="Navigation Status" value={aisPositionData.navStatus || '---'} />
            <TelemetryItem label="Area" value={aisPositionData.area || '---'} />
            <TelemetryItem label="AIS Station" value={aisPositionData.station || '---'} />
            <TelemetryItem label="Last Position Received" value={aisPositionData.timestamp ? formatTimeAgo(new Date(aisPositionData.timestamp)) : '---'} />
            <TelemetryItem label="AIS Source" value={aisPositionData.source || '---'} />
          </div>
        </Card>
      </div>
    </div>
  );
}

// Helper component for detail items
function DetailItem({ label, value, icon, flagCode }) {
  return (
    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>
        {icon && <span className={styles.detailIcon}>{icon}</span>}
        {label}:
      </div>
      <div className={styles.detailValue}>
        {flagCode && flagCode !== '---' && (
          <span className={styles.flagIcon}>{getFlagEmoji(flagCode)}</span>
        )}
        {value}
      </div>
    </div>
  );
}

// Telemetry item
function TelemetryItem({ label, value }) {
  return (
    <div className={styles.detailItem}>
      <div className={styles.detailLabel}>{label}:</div>
      <div className={styles.detailValue}>{value}</div>
    </div>
  );
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2 || isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return 0;
  }
  const R = 3440; // Earth radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper functions
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2 || countryCode === '---') return '🏳️';
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  } catch (error) {
    return '🏳️';
  }
}

function formatTimeAgo(date) {
  if (!date || isNaN(date.getTime())) return '---';
  try {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
  } catch (error) {
    return '---';
  }
}

export default VesselDetail;
