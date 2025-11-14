import { useI18n } from '../../utils/useI18n';
import Card from '../../components/ui/Card';
import styles from './OpsStatsPanel.module.css';

function OpsStatsPanel({ stats, vessels }) {
  const { t } = useI18n();

  if (!stats) return null;

  const statusBreakdown = vessels?.reduce((acc, vessel) => {
    acc[vessel.status] = (acc[vessel.status] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <Card className={styles.panel}>
      <div className={styles.header}>
        <h3>{t('dashboard.situationalAwareness')}</h3>
      </div>
      <div className={styles.content}>
        <div className={styles.section}>
          <h4>{t('dashboard.vesselStatus')}</h4>
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>{t('dashboard.inbound')}</span>
              <span className={styles.statValue} style={{ color: 'var(--warning)' }}>
                {statusBreakdown.INBOUND || 0}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>{t('dashboard.inPort')}</span>
              <span className={styles.statValue} style={{ color: 'var(--success)' }}>
                {statusBreakdown.IN_PORT || 0}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>{t('dashboard.atSea')}</span>
              <span className={styles.statValue} style={{ color: 'var(--primary)' }}>
                {statusBreakdown.AT_SEA || 0}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>{t('dashboard.anchored')}</span>
              <span className={styles.statValue} style={{ color: '#8b5cf6' }}>
                {statusBreakdown.ANCHORED || 0}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h4>{t('dashboard.portOperations')}</h4>
          <div className={styles.statsList}>
            <div className={styles.listItem}>
              <span>{t('dashboard.activePortCalls')}</span>
              <span className={styles.listValue}>{stats.activePortCalls || 0}</span>
            </div>
            <div className={styles.listItem}>
              <span>{t('dashboard.arrivals24h')}</span>
              <span className={styles.listValue} style={{ color: 'var(--warning)' }}>
                {stats.arrivalsNext24h || 0}
              </span>
            </div>
            <div className={styles.listItem}>
              <span>{t('dashboard.departures24h')}</span>
              <span className={styles.listValue} style={{ color: 'var(--primary-light)' }}>
                {stats.departuresNext24h || 0}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h4>{t('dashboard.alerts')}</h4>
          <div className={styles.statsList}>
            <div className={styles.listItem}>
              <span>{t('dashboard.securityIssues')}</span>
              <span className={styles.listValue} style={{ 
                color: stats.pendingIssues > 0 ? 'var(--danger)' : 'var(--text-muted)' 
              }}>
                {stats.pendingIssues || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default OpsStatsPanel;

