import { useI18n } from '../../utils/useI18n';
import {
  FiAnchor,
  FiNavigation,
  FiMapPin,
  FiAlertCircle,
  FiPackage,
  FiClock,
  FiTrendingUp,
} from 'react-icons/fi';
import styles from './OpsKpiBar.module.css';

function OpsKpiBar({ stats }) {
  const { t } = useI18n();

  if (!stats) return null;

  const kpis = [
    {
      key: 'activePortCalls',
      label: t('dashboard.activePortCalls'),
      value: stats.activePortCalls || 0,
      icon: <FiAnchor size={20} />,
      color: 'var(--primary)',
    },
    {
      key: 'vesselsAtSea',
      label: t('dashboard.shipsAtSea'),
      value: stats.vesselsAtSea || 0,
      icon: <FiNavigation size={20} />,
      color: 'var(--primary-light)',
    },
    {
      key: 'vesselsInPort',
      label: t('dashboard.vesselsInPort'),
      value: stats.vesselsInPort || 0,
      icon: <FiMapPin size={20} />,
      color: 'var(--success)',
    },
    {
      key: 'vesselsAnchored',
      label: t('dashboard.vesselsAnchored'),
      value: stats.vesselsAnchored || 0,
      icon: <FiAnchor size={20} />,
      color: '#8b5cf6',
    },
    {
      key: 'arrivalsNext24h',
      label: t('dashboard.arrivals24h'),
      value: stats.arrivalsNext24h || 0,
      icon: <FiClock size={20} />,
      color: 'var(--warning)',
    },
    {
      key: 'departuresNext24h',
      label: t('dashboard.departures24h'),
      value: stats.departuresNext24h || 0,
      icon: <FiTrendingUp size={20} />,
      color: 'var(--primary-light)',
    },
    {
      key: 'pendingIssues',
      label: t('dashboard.pendingIssues'),
      value: stats.pendingIssues || 0,
      icon: <FiAlertCircle size={20} />,
      color: stats.pendingIssues > 0 ? 'var(--danger)' : 'var(--text-muted)',
    },
    {
      key: 'totalCargo',
      label: t('dashboard.totalCargo'),
      value: stats.totalCargo || 0,
      icon: <FiPackage size={20} />,
      color: 'var(--text-secondary)',
    },
  ];

  return (
    <div className={styles.kpiBar}>
      {kpis.map((kpi) => (
        <div key={kpi.key} className={styles.kpiItem}>
          <div className={styles.kpiIcon} style={{ color: kpi.color }}>
            {kpi.icon}
          </div>
          <div className={styles.kpiContent}>
            <div className={styles.kpiValue} style={{ color: kpi.color }}>
              {kpi.value}
            </div>
            <div className={styles.kpiLabel}>{kpi.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default OpsKpiBar;

