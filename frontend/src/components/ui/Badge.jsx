import styles from './Badge.module.css';

const statusColors = {
  PLANNED: 'gray',
  IN_PROGRESS: 'blue',
  COMPLETED: 'green',
  CANCELLED: 'red',
  OPEN: 'orange',
  CLEARED: 'green',
  DUE: 'orange',
  PAID: 'green',
  WAIVED: 'gray',
};

function Badge({ children, status, variant = 'default', className = '' }) {
  const colorClass = statusColors[status] || 'default';
  const classes = `${styles.badge} ${styles[colorClass]} ${styles[variant]} ${className}`;
  return <span className={classes}>{children}</span>;
}

export default Badge;

