import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useI18n } from '../../utils/useI18n';
import { api } from '../../utils/api';
import Card from '../../components/ui/Card';
import MapView from '../../components/ais/MapView';
import { FiSearch, FiCamera, FiMap, FiAlertCircle, FiPlus } from 'react-icons/fi';
import styles from './VesselDetail.module.css';

function VesselDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  // Fetch vessel data (includes AIS enrichment)
  const { data: vessel, isLoading } = useQuery({
    queryKey: ['vessel', id],
    queryFn: () => api.get(`/vessels/${id}`),
  });

  // Fetch AIS position data
  const { data: position, isLoading: positionLoading } = useQuery({
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

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!vessel) {
    return <div className={styles.error}>{t('vessels.notFound')}</div>;
  }

  // Calculate trip metrics from position history (AIS-driven)
  const tripMetrics = useMemo(() => {
    if (!positionHistory || positionHistory.length < 2) {
      return {
        tripDistance: null,
        avgSpeed: position?.sog || null,
        maxSpeed: position?.sog || null,
        tripTime: null,
      };
    }

    // Sort by timestamp
    const sorted = [...positionHistory].sort(
      (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Calculate total distance (nautical miles)
    let totalDistance = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      if (prev.lat && prev.lon && curr.lat && curr.lon) {
        const dist = calculateDistance(
          prev.lat || prev.Lat,
          prev.lon || prev.Lon,
          curr.lat || curr.Lat,
          curr.lon || curr.Lon
        );
        totalDistance += dist;
      }
    }

    // Calculate speeds
    const speeds = sorted
      .map(p => p.sog || p.speed)
      .filter(s => s != null && s > 0);
    const avgSpeed = speeds.length > 0
      ? speeds.reduce((a, b) => a + b, 0) / speeds.length
      : null;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : null;

    // Calculate trip time
    const startTime = new Date(sorted[0].timestamp);
    const endTime = new Date(sorted[sorted.length - 1].timestamp);
    const tripTimeMs = endTime - startTime;
    const tripTimeHours = Math.floor(tripTimeMs / (1000 * 60 * 60));
    const tripTimeMins = Math.floor((tripTimeMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      tripDistance: totalDistance > 0 ? totalDistance : null,
      avgSpeed,
      maxSpeed,
      tripTime: tripTimeMs > 0 ? { hours: tripTimeHours, mins: tripTimeMins } : null,
    };
  }, [positionHistory, position]);

  // Extract AIS data from vessel (enriched by API)
  const aisVesselData = {
    name: vessel.name || '---',
    type: vessel.type || vessel.ship_type || vessel.vessel_type || '---',
    imo: vessel.imo?.replace(/^IMO/i, '') || '---',
    mmsi: vessel.mmsi || '---',
    flag: vessel.flag || vessel.flag_code || '---',
    callSign: vessel.callSign || vessel.callsign || vessel.call_sign || '---',
    length: vessel.length || null,
    width: vessel.width || vessel.beam || null,
    size: vessel.length && vessel.width 
      ? `${vessel.length} x ${vessel.width} m`
      : vessel.size || '---',
    grossTonnage: vessel.grossTonnage || vessel.gt || vessel.gross_tonnage || null,
    deadweightTonnage: vessel.deadweightTonnage || vessel.dwt || vessel.deadweight_tonnage || null,
    buildYear: vessel.buildYear || vessel.build || vessel.build_year || null,
    draught: vessel.draught || vessel.draft || position?.draught || position?.draft || null,
  };

  // Extract AIS position data
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

  // Format environmental data from AIS (if available)
  const environmentalData = {
    wind: {
      avg: position?.wind?.avg || position?.wind_avg || null,
      max: position?.wind?.max || position?.wind_max || position?.wind?.speed || null,
      min: position?.wind?.min || position?.wind_min || null,
    },
    temperature: {
      avg: position?.temperature || position?.temp || null,
      max: position?.temperature_max || position?.temp_max || null,
      min: position?.temperature_min || position?.temp_min || null,
    },
    waterTemp: position?.water_temperature || position?.water_temp || null,
  };

  return (
    <div className={styles.container}>
      {/* Strava-Style 3-Column Layout */}
      <div className={styles.stravaLayout}>
        {/* Left Column - Vessel Profile */}
        <div className={styles.leftColumn}>
          <Card className={styles.profileCard}>
            {/* Vessel Photo */}
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
                <FiCamera size={24} />
                <span>Upload Photo</span>
              </div>
            </div>

            {/* Vessel Identity (AIS-driven) */}
            <div className={styles.identitySection}>
              <h2 className={styles.vesselNameProfile}>{aisVesselData.name}</h2>
              <p className={styles.vesselTypeProfile}>{aisVesselData.type}</p>
            </div>

            {/* AIS Identity Details */}
            <div className={styles.detailsList}>
              <DetailItem 
                label="Type" 
                value={aisVesselData.type} 
                icon={<FiSearch size={16} />}
              />
              <DetailItem label="IMO" value={aisVesselData.imo} />
              <DetailItem label="MMSI" value={aisVesselData.mmsi} />
              <DetailItem 
                label="Flag" 
                value={aisVesselData.flag} 
                flagCode={aisVesselData.flag}
              />
              <DetailItem label="Call Sign" value={aisVesselData.callSign} />
              <DetailItem label="Size" value={aisVesselData.size} />
              <DetailItem 
                label="GT" 
                value={aisVesselData.grossTonnage ? `${aisVesselData.grossTonnage}` : '---'} 
              />
              <DetailItem 
                label="DWT" 
                value={aisVesselData.deadweightTonnage ? `${aisVesselData.deadweightTonnage}` : '---'} 
              />
              <DetailItem 
                label="Build" 
                value={aisVesselData.buildYear ? `${aisVesselData.buildYear}` : '---'} 
              />
            </div>
          </Card>
        </div>

        {/* Center Column - Activity Header + Metrics + Map */}
        <div className={styles.centerColumn}>
          {/* Strava-Style Activity Header */}
          <div className={styles.activityHeader}>
            <div className={styles.headerLeft}>
              <h1 className={styles.activityTitle}>{aisVesselData.name}</h1>
              <p className={styles.activitySubtitle}>{aisVesselData.type}</p>
            </div>
            <div className={styles.headerRight}>
              <button className={styles.actionButton}>
                <FiMap size={18} />
                <span>Show on Live Map</span>
              </button>
              <button className={styles.actionButton}>
                <FiAlertCircle size={18} />
                <span>Alerts</span>
              </button>
              <button className={styles.actionButton}>
                <FiPlus size={18} />
                <span>Add to Fleet</span>
                <span className={styles.dropdownArrow}>▼</span>
              </button>
              <button className={styles.menuButton}>☰</button>
            </div>
          </div>

          {/* Strava-Style Metrics Grid */}
          <div className={styles.metricsGrid}>
            <MetricCard 
              label="Trip Distance" 
              value={tripMetrics.tripDistance ? `${tripMetrics.tripDistance.toFixed(2)} nm` : '---'}
            />
            <MetricCard 
              label="Average Speed" 
              value={tripMetrics.avgSpeed ? `${tripMetrics.avgSpeed.toFixed(1)} kn` : (aisPositionData.speed ? `${aisPositionData.speed.toFixed(1)} kn` : '---')}
            />
            <MetricCard 
              label="Max Speed" 
              value={tripMetrics.maxSpeed ? `${tripMetrics.maxSpeed.toFixed(1)} kn` : (aisPositionData.speed ? `${aisPositionData.speed.toFixed(1)} kn` : '---')}
            />
            <MetricCard 
              label="Draught" 
              value={aisVesselData.draught ? `${aisVesselData.draught} m` : '---'}
            />
            <MetricCard 
              label="Position Received" 
              value={aisPositionData.timestamp ? formatTimeAgo(new Date(aisPositionData.timestamp)) : '---'}
            />
            <MetricCard 
              label="Max Wind" 
              value={environmentalData.wind.max ? `${environmentalData.wind.max} knots` : '---'}
            />
            <MetricCard 
              label="Min Wind" 
              value={environmentalData.wind.min ? `${environmentalData.wind.min} knots` : '---'}
            />
            <MetricCard 
              label="Max Temp" 
              value={environmentalData.temperature.max ? `${environmentalData.temperature.max}°C` : '---'}
            />
            <MetricCard 
              label="Min Temp" 
              value={environmentalData.temperature.min ? `${environmentalData.temperature.min}°C` : '---'}
            />
          </div>

          {/* Map Section - Fills remaining space */}
          {aisPositionData.latitude && aisPositionData.longitude && (
            <div className={styles.mapSection}>
              <MapView
                position={{
                  lat: aisPositionData.latitude,
                  lon: aisPositionData.longitude,
                }}
                vesselName={aisVesselData.name}
              />
            </div>
          )}
        </div>

        {/* Right Column - AIS Telemetry Panel */}
        <div className={styles.rightColumn}>
          <Card className={styles.telemetryCard}>
            <div className={styles.telemetryHeader}>
              <h3>AIS Telemetry</h3>
            </div>
            <div className={styles.telemetryContent}>
              <TelemetryItem 
                label="Longitude" 
                value={aisPositionData.longitude ? aisPositionData.longitude.toFixed(5) : '---'}
              />
              <TelemetryItem 
                label="Latitude" 
                value={aisPositionData.latitude ? aisPositionData.latitude.toFixed(5) : '---'}
              />
              <TelemetryItem 
                label="Speed" 
                value={aisPositionData.speed ? `${aisPositionData.speed.toFixed(1)} kn` : '⚓'}
              />
              <TelemetryItem 
                label="Course" 
                value={aisPositionData.course ? `${aisPositionData.course.toFixed(0)}°` : '---'}
              />
              <TelemetryItem 
                label="Heading" 
                value={aisPositionData.heading ? `${aisPositionData.heading.toFixed(0)}°` : '---'}
              />
              <TelemetryItem 
                label="Navigation Status" 
                value={aisPositionData.navStatus || '---'}
              />
              <TelemetryItem 
                label="Area" 
                value={aisPositionData.area || '---'}
              />
              <TelemetryItem 
                label="AIS Station" 
                value={aisPositionData.station || '---'}
              />
              <TelemetryItem 
                label="Last Position Received" 
                value={aisPositionData.timestamp ? formatTimeAgo(new Date(aisPositionData.timestamp)) : '---'}
              />
              <TelemetryItem 
                label="AIS Source" 
                value={aisPositionData.source || '---'}
              />
            </div>
          </Card>
        </div>
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

// Strava-style metric card
function MetricCard({ label, value, subValue }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
      {subValue && <div className={styles.metricSubValue}>{subValue}</div>}
    </div>
  );
}

// Telemetry item
function TelemetryItem({ label, value }) {
  return (
    <div className={styles.telemetryItem}>
      <span className={styles.telemetryLabel}>{label}:</span>
      <span className={styles.telemetryValue}>{value}</span>
    </div>
  );
}

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
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
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function formatTimeAgo(date) {
  if (!date || isNaN(date.getTime())) return '---';
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
}

export default VesselDetail;
