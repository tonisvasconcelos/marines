import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

  const { data: vessel, isLoading } = useQuery({
    queryKey: ['vessel', id],
    queryFn: () => api.get(`/vessels/${id}`),
  });

  const { data: portCalls } = useQuery({
    queryKey: ['vessel', id, 'portCalls'],
    queryFn: () => api.get(`/port-calls?vesselId=${id}&sort=eta:desc&limit=10`),
    enabled: !!vessel,
  });

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
        throw error;
      }
    },
    enabled: !!vessel && (!!vessel.imo || !!vessel.mmsi),
    refetchInterval: 60000,
    retry: 1,
  });

  // Get events for this vessel
  const { data: events } = useQuery({
    queryKey: ['vessel', id, 'events'],
    queryFn: () => api.get(`/dashboard/events`),
    enabled: !!vessel,
    select: (data) => {
      // Filter events for this vessel
      return data?.filter(event => event.vesselId === id) || [];
    },
  });

  if (isLoading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!vessel) {
    return <div className={styles.error}>{t('vessels.notFound')}</div>;
  }

  // Calculate trip summary from latest port call
  const latestPortCall = portCalls?.[0];
  const tripSummary = latestPortCall ? {
    origin: latestPortCall.port?.name || 'Unknown',
    originCode: latestPortCall.port?.unlocode || '',
    originCountry: latestPortCall.port?.countryCode || '',
    atd: latestPortCall.etd || latestPortCall.atd,
    destination: latestPortCall.port?.name || 'Unknown',
    destinationCode: latestPortCall.port?.unlocode || '',
    destinationCountry: latestPortCall.port?.countryCode || '',
    ata: latestPortCall.eta || latestPortCall.ata,
  } : null;

  // Calculate trip stats from position history
  const tripStats = position ? {
    tripTime: '8 h, 53 mins', // Will be calculated from position history
    tripDistance: '6.96 nm',
    avgSpeed: position.sog ? `${position.sog.toFixed(1)}` : '0',
    maxSpeed: '7.2',
    draught: '4.8 m',
    avgWind: '5 knots',
    maxWind: '7.8 knots',
    minTemp: '21°C / 69.8°F',
    maxTemp: '28.8°C / 83.84°F',
    positionReceived: '3 m ago',
  } : null;

  // Format vessel size if available
  const vesselSize = vessel.length && vessel.width 
    ? `${vessel.length} x ${vessel.width} m`
    : vessel.size || '---';

  return (
    <div className={styles.container}>
      {/* Top Navigation Bar */}
      <div className={styles.topNav}>
        <div className={styles.topNavLeft}>
          <h1 className={styles.vesselName}>{vessel.name}</h1>
          <p className={styles.vesselType}>{vessel.type || 'Other Type'}</p>
        </div>
        <div className={styles.topNavRight}>
          <button className={styles.navButton}>
            <FiMap size={18} />
            <span>Show on Live Map</span>
          </button>
          <button className={styles.navButton}>
            <FiAlertCircle size={18} />
            <span>Alerts</span>
          </button>
          <button className={styles.navButton}>
            <FiPlus size={18} />
            <span>Add to fleet</span>
            <span className={styles.dropdownArrow}>▼</span>
          </button>
          <button className={styles.menuButton}>☰</button>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className={styles.mainLayout}>
        {/* Left Sidebar - Vessel Details */}
        <div className={styles.sidebar}>
          {/* Upload Photo Section */}
          <div className={styles.photoSection}>
            {vessel.imageUrl ? (
              <img 
                src={vessel.imageUrl} 
                alt={vessel.name}
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

          {/* Vessel Details List */}
          <div className={styles.detailsList}>
            <DetailItem 
              label="Type" 
              value={vessel.type || '---'} 
              icon={<FiSearch size={16} />}
            />
            <DetailItem label="IMO" value={vessel.imo?.replace(/^IMO/i, '') || '---'} />
            <DetailItem label="MMSI" value={vessel.mmsi || '---'} />
            <DetailItem 
              label="Flag" 
              value={vessel.flag || '---'} 
              flagCode={vessel.flag}
            />
            <DetailItem label="Call Sign" value={vessel.callSign || '---'} />
            <DetailItem label="Size" value={vesselSize} />
            <DetailItem label="GT" value={vessel.grossTonnage || vessel.gt || '---'} />
            <DetailItem label="DWT" value={vessel.deadweightTonnage || vessel.dwt || '---'} />
            <DetailItem label="Build" value={vessel.buildYear || vessel.build || '---'} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className={styles.mainContent}>
          {/* Map Background */}
          {position && position.lat && position.lon && (
            <div className={styles.mapBackground}>
              <MapView
                position={position}
                vesselName={vessel.name}
              />
            </div>
          )}

          {/* Overlay Content */}
          <div className={styles.overlayContent}>
            {/* Trip Summary Bar */}
            {tripSummary && (
              <div className={styles.tripSummary}>
                <div className={styles.tripOrigin}>
                  <div className={styles.portInfo}>
                    {tripSummary.originCountry && (
                      <span className={styles.flagIcon}>{getFlagEmoji(tripSummary.originCountry)}</span>
                    )}
                    <span className={styles.portName}>{tripSummary.origin}</span>
                    {tripSummary.originCode && (
                      <span className={styles.portCode}>{tripSummary.originCode}</span>
                    )}
                  </div>
                  <div className={styles.tripLabel}>ATD</div>
                  <div className={styles.tripTime}>
                    {tripSummary.atd 
                      ? new Date(tripSummary.atd).toLocaleString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) + ' (LT)'
                      : '---'}
                  </div>
                </div>
                <div className={styles.tripDestination}>
                  <div className={styles.portInfo}>
                    {tripSummary.destinationCountry && (
                      <span className={styles.flagIcon}>{getFlagEmoji(tripSummary.destinationCountry)}</span>
                    )}
                    <span className={styles.portName}>{tripSummary.destination}</span>
                    {tripSummary.destinationCode && (
                      <span className={styles.portCode}>{tripSummary.destinationCode}</span>
                    )}
                  </div>
                  <div className={styles.tripLabel}>ATA</div>
                  <div className={styles.tripTime}>
                    {tripSummary.ata 
                      ? new Date(tripSummary.ata).toLocaleString('en-US', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) + ' (LT)'
                      : '---'}
                  </div>
                  {tripSummary.ata && (
                    <div className={styles.timeAgo}>
                      {formatTimeAgo(new Date(tripSummary.ata))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KPIs Grid */}
            {tripStats && (
              <div className={styles.kpisGrid}>
                <div className={styles.kpiColumn}>
                  <KpiItem label="Trip Time" value={tripStats.tripTime} />
                  <KpiItem label="Trip Distance" value={tripStats.tripDistance} />
                  <KpiItem label="AVG Speed" value={`${tripStats.avgSpeed} Knots`} />
                  <KpiItem label="MAX Speed" value={`${tripStats.maxSpeed} Knots`} />
                  <KpiItem label="Draught" value={tripStats.draught} />
                </div>
                <div className={styles.kpiColumn}>
                  <KpiItem label="AVG Wind" value={tripStats.avgWind} />
                  <KpiItem label="MAX Wind" value={tripStats.maxWind} />
                  <KpiItem label="MIN Temp" value={tripStats.minTemp} />
                  <KpiItem label="MAX Temp" value={tripStats.maxTemp} />
                  <KpiItem 
                    label="Position Received" 
                    value={tripStats.positionReceived}
                    icon={<span className={styles.infoIcon}>ⓘ</span>}
                  />
                </div>
              </div>
            )}

            {/* Right Panel - Situational Awareness */}
            <div className={styles.rightPanel}>
              <SituationalPanel vessel={vessel} position={position} />
            </div>
          </div>
        </div>
      </div>

      {/* Tables Section */}
      <div className={styles.tablesSection}>
        <div className={styles.tableGrid}>
          {/* Last Port Calls Table */}
          <Card className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3>Last Port Calls</h3>
            </div>
            <LastPortCallsTable portCalls={portCalls} />
          </Card>

          {/* Last Trips Table */}
          <Card className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3>Last Trips</h3>
              <span className={styles.infoIcon}>ⓘ</span>
            </div>
            <LastTripsTable portCalls={portCalls} />
          </Card>

          {/* Events Table */}
          <Card className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3>Events</h3>
            </div>
            <EventsTable events={events} navigate={navigate} />
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
        {flagCode && <span className={styles.flagIcon}>{getFlagEmoji(flagCode)}</span>}
        {value}
      </div>
    </div>
  );
}

// Helper component for KPI items
function KpiItem({ label, value, icon }) {
  return (
    <div className={styles.kpiItem}>
      <span className={styles.kpiLabel}>{label}:</span>
      <span className={styles.kpiValue}>
        {value}
        {icon && <span className={styles.kpiIcon}>{icon}</span>}
      </span>
    </div>
  );
}

// Situational Awareness Panel
function SituationalPanel({ vessel, position }) {
  return (
    <Card className={styles.situationalPanel}>
      <div className={styles.panelHeader}>
        <h3>Situational Awareness</h3>
      </div>
      <div className={styles.panelContent}>
        <div className={styles.situationalItem}>
          <span className={styles.situationalLabel}>Longitude:</span>
          <span className={styles.situationalValue}>
            {position?.lon ? position.lon.toFixed(5) : '---'}
          </span>
        </div>
        <div className={styles.situationalItem}>
          <span className={styles.situationalLabel}>Latitude:</span>
          <span className={styles.situationalValue}>
            {position?.lat ? position.lat.toFixed(5) : '---'}
          </span>
        </div>
        <div className={styles.situationalItem}>
          <span className={styles.situationalLabel}>Status:</span>
          <span className={styles.situationalValue}>
            {position?.navStatus || position?.status || 'Moored'}
          </span>
        </div>
        <div className={styles.situationalItem}>
          <span className={styles.situationalLabel}>Speed:</span>
          <span className={styles.situationalValue}>
            {position?.sog ? `${position.sog.toFixed(1)} kn` : '⚓'}
          </span>
        </div>
        <div className={styles.situationalItem}>
          <span className={styles.situationalLabel}>Course:</span>
          <span className={styles.situationalValue}>
            {position?.cog ? `${position.cog.toFixed(0)}°` : '---'}
          </span>
        </div>
        <div className={styles.situationalItem}>
          <span className={styles.situationalLabel}>Area:</span>
          <span className={styles.situationalValue}>South Atlantic Ocean</span>
        </div>
        <div className={styles.situationalItem}>
          <span className={styles.situationalLabel}>Station:</span>
          <span className={styles.situationalValue}>T-AIS</span>
        </div>
        <div className={styles.situationalItem}>
          <span className={styles.situationalLabel}>Position Received:</span>
          <span className={styles.situationalValue}>
            {position?.timestamp ? formatTimeAgo(new Date(position.timestamp)) : '---'}
            <span className={styles.infoIcon}>ⓘ</span>
          </span>
        </div>
      </div>
    </Card>
  );
}

// Last Port Calls Table
function LastPortCallsTable({ portCalls }) {
  if (!portCalls || portCalls.length === 0) {
    return <div className={styles.emptyTable}>No port calls available</div>;
  }

  const calculateTimeInPort = (arrival, departure) => {
    if (!arrival || !departure) return '';
    const diff = new Date(departure) - new Date(arrival);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} d`;
    return `${hours} h`;
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Port</th>
            <th>Arrival</th>
            <th>Departure</th>
            <th>Time In Port</th>
          </tr>
        </thead>
        <tbody>
          {portCalls.map((pc) => (
            <tr key={pc.id}>
              <td>
                {pc.port?.countryCode && (
                  <span className={styles.flagIcon}>{getFlagEmoji(pc.port.countryCode)}</span>
                )}
                {pc.port?.name || pc.portId}
              </td>
              <td>
                {pc.eta || pc.ata 
                  ? new Date(pc.eta || pc.ata).toLocaleString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '---'}
              </td>
              <td>
                {pc.etd || pc.atd
                  ? new Date(pc.etd || pc.atd).toLocaleString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '---'}
              </td>
              <td>{calculateTimeInPort(pc.eta || pc.ata, pc.etd || pc.atd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className={styles.showMoreButton}>Show More</button>
    </div>
  );
}

// Last Trips Table
function LastTripsTable({ portCalls }) {
  if (!portCalls || portCalls.length === 0) {
    return <div className={styles.emptyTable}>No trips available</div>;
  }

  // Group port calls into trips (simplified - each port call is a trip)
  const trips = portCalls.map((pc, index) => {
    const nextPc = portCalls[index + 1];
    return {
      origin: pc.port?.name || 'Unknown',
      originCode: pc.port?.countryCode,
      departure: pc.etd || pc.atd,
      destination: nextPc?.port?.name || pc.port?.name || 'Unknown',
      destinationCode: nextPc?.port?.countryCode || pc.port?.countryCode,
      arrival: nextPc?.eta || nextPc?.ata || pc.eta || pc.ata,
      distance: '6.96 nm', // Will be calculated from position history
    };
  }).filter(trip => trip.departure);

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Origin</th>
            <th>Departure</th>
            <th>Destination</th>
            <th>Arrival</th>
            <th>Distance</th>
          </tr>
        </thead>
        <tbody>
          {trips.map((trip, index) => (
            <tr key={index}>
              <td>
                <span className={styles.expandIcon}>+</span>
                {trip.originCode && (
                  <span className={styles.flagIcon}>{getFlagEmoji(trip.originCode)}</span>
                )}
                <span className={styles.portLink}>{trip.origin}</span>
              </td>
              <td>
                {trip.departure 
                  ? new Date(trip.departure).toLocaleString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '---'}
              </td>
              <td>
                {trip.destinationCode && (
                  <span className={styles.flagIcon}>{getFlagEmoji(trip.destinationCode)}</span>
                )}
                <span className={styles.portLink}>{trip.destination}</span>
              </td>
              <td>
                {trip.arrival
                  ? new Date(trip.arrival).toLocaleString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '---'}
              </td>
              <td>{trip.distance}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className={styles.showMoreButton}>Show More</button>
    </div>
  );
}

// Events Table
function EventsTable({ events, navigate }) {
  if (!events || events.length === 0) {
    return <div className={styles.emptyTable}>No events available</div>;
  }

  const getEventIcon = (type) => {
    switch (type) {
      case 'AIS_UPDATE':
      case 'IN_COVERAGE':
        return '📶';
      case 'OUT_OF_COVERAGE':
        return '📵';
      case 'STATUS_CHANGED':
        return '⚙️';
      case 'STOP_MOVING':
      case 'AT_ANCHOR':
        return '⚓';
      case 'START_MOVING':
      case 'PORT_ARRIVAL':
      case 'DEPARTURE':
        return '🚢';
      default:
        return '📋';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'AIS_UPDATE':
      case 'IN_COVERAGE':
        return 'var(--success)';
      case 'OUT_OF_COVERAGE':
        return 'var(--danger)';
      case 'STATUS_CHANGED':
        return 'var(--primary)';
      case 'PORT_ARRIVAL':
        return 'var(--warning)';
      default:
        return 'var(--text-secondary)';
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Time</th>
            <th>Event</th>
            <th>Details</th>
            <th>Position / Dest</th>
            <th>Info</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr 
              key={event.id}
              className={styles.eventRow}
              onClick={() => {
                if (event.portCallId) navigate(`/port-calls/${event.portCallId}`);
                else if (event.vesselId) navigate(`/vessels/${event.vesselId}`);
              }}
            >
              <td>
                {event.timestamp 
                  ? new Date(event.timestamp).toLocaleString('en-US', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '---'}
              </td>
              <td>
                <span 
                  className={styles.eventIcon}
                  style={{ color: getEventColor(event.type) }}
                >
                  {getEventIcon(event.type)}
                </span>
                {event.type?.replace(/_/g, ' ')}
              </td>
              <td>
                {event.message || event.data?.port?.name || '---'}
              </td>
              <td>
                {event.data?.lat && event.data?.lon 
                  ? `${event.data.lat.toFixed(5)} / ${event.data.lon.toFixed(5)}`
                  : event.data?.port?.name || '---'}
              </td>
              <td>
                {event.data?.sog && `Speed: ${event.data.sog.toFixed(1)} kn`}
                {event.data?.cog && `, Course: ${event.data.cog.toFixed(1)}°`}
                {!event.data?.sog && !event.data?.cog && '⚓'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className={styles.showMoreButton}>Show More</button>
    </div>
  );
}

// Helper functions
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function formatTimeAgo(date) {
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
