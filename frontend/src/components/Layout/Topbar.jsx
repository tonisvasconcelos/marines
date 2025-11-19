import { useAuth } from '../../modules/auth/AuthContext';
import styles from './Topbar.module.css';

function Topbar({ onMenuClick }) {
  const { user, tenant } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className={styles.topbar}>
      <button className={styles.menuButton} onClick={onMenuClick} aria-label="Toggle menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      <div className={styles.center}>
        <img 
          src="/navomnis_logo_horizontal_branco.png" 
          alt="navomnis" 
          className={styles.logo}
        />
      </div>
      <div className={styles.right}>
        {tenant && <span className={styles.tenantName}>{tenant.name}</span>}
        <div className={styles.userAvatar}>
          {getInitials(user?.name)}
        </div>
      </div>
    </header>
  );
}

export default Topbar;

