import Card from './Card';
import styles from './KpiCard.module.css';

function KpiCard({ title, value, subtitle, icon, trend, className = '' }) {
  return (
    <Card className={`${styles.kpiCard} ${className}`}>
      <div className={styles.header}>
        <span className={styles.icon} style={{ color: 'var(--primary-light)' }}>
          {icon}
        </span>
        <h3 className={styles.title}>{title}</h3>
      </div>
      <div className={styles.value}>{value}</div>
      {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      {trend && (
        <div className={`${styles.trend} ${trend.positive ? styles.positive : styles.negative}`}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </div>
      )}
    </Card>
  );
}

export default KpiCard;

