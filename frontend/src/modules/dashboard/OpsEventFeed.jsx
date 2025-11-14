import { useI18n } from '../../utils/useI18n';
import { useNavigate } from 'react-router-dom';
import {
  FiRadio,
  FiAnchor,
  FiNavigation,
  FiAlertCircle,
  FiClock,
  FiMapPin,
} from 'react-icons/fi';
import styles from './OpsEventFeed.module.css';

const eventIcons = {
  AIS_UPDATE: FiRadio,
  ARRIVAL: FiAnchor,
  DEPARTURE: FiNavigation,
  SECURITY_PENDENCY: FiAlertCircle,
  PORT_CALL_WARNING: FiAlertCircle,
  GEOFENCE_ENTRY: FiMapPin,
  GEOFENCE_EXIT: FiNavigation,
};

const eventColors = {
  AIS_UPDATE: 'var(--primary)',
  ARRIVAL: 'var(--warning)',
  DEPARTURE: 'var(--primary-light)',
  SECURITY_PENDENCY: 'var(--danger)',
  PORT_CALL_WARNING: 'var(--warning)',
  GEOFENCE_ENTRY: 'var(--success)',
  GEOFENCE_EXIT: 'var(--primary-light)',
};

function OpsEventFeed({ events, isLoading }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleEventClick = (event) => {
    if (event.portCallId) {
      navigate(`/port-calls/${event.portCallId}`);
    } else if (event.vesselId) {
      navigate(`/vessels/${event.vesselId}`);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.feed}>
        <div className={styles.header}>
          <h3>OPS LOG</h3>
        </div>
        <div className={styles.loading}>Loading events...</div>
      </div>
    );
  }

  return (
    <div className={styles.feed}>
      <div className={styles.header}>
        <h3>{t('dashboard.opsLog')}</h3>
        <span className={styles.count}>{events?.length || 0}</span>
      </div>
      <div className={styles.events}>
        {events && events.length > 0 ? (
          events.map((event) => {
            const Icon = eventIcons[event.type] || FiClock;
            const color = eventColors[event.type] || 'var(--text-muted)';
            const severityClass = event.severity || 'info';
            
            return (
              <div
                key={event.id}
                className={`${styles.event} ${styles[severityClass]} ${event.portCallId || event.vesselId ? styles.clickable : ''}`}
                onClick={() => handleEventClick(event)}
              >
                <div className={styles.eventIcon} style={{ color }}>
                  <Icon size={16} />
                </div>
                <div className={styles.eventContent}>
                  <div className={styles.eventHeader}>
                    <span className={styles.eventType}>{event.type.replace('_', ' ')}</span>
                    <span className={styles.eventTime}>{formatTime(event.timestamp)}</span>
                  </div>
                  <div className={styles.eventMessage}>{event.message}</div>
                  {event.vessel && (
                    <div className={styles.eventVessel}>{event.vessel}</div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className={styles.empty}>{t('dashboard.noEvents')}</div>
        )}
      </div>
    </div>
  );
}

export default OpsEventFeed;

