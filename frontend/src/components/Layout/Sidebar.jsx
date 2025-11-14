import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../modules/auth/AuthContext';
import { useI18n } from '../../utils/useI18n';
import {
  FiLayout,
  FiAnchor,
  FiMap,
  FiUsers,
  FiShield,
  FiDollarSign,
  FiSettings,
  FiUser,
  FiRadio,
  FiLogOut,
  FiMapPin,
  FiBriefcase,
  FiUserCheck,
  FiChevronUp,
  FiChevronDown,
} from 'react-icons/fi';
import styles from './Sidebar.module.css';

function Sidebar({ isOpen, isCollapsed, onClose, isMobile }) {
  const { logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);
  const [showUpArrow, setShowUpArrow] = useState(false);
  const [showDownArrow, setShowDownArrow] = useState(false);

  const menuItems = [
    {
      section: t('nav.operations'),
      items: [
        { path: '/dashboard', labelKey: 'nav.dashboard', icon: FiLayout },
        { path: '/port-calls', labelKey: 'nav.portCalls', icon: FiAnchor },
        { path: '/fleet-map', labelKey: 'nav.fleetMap', icon: FiMap },
      ],
    },
    {
      section: t('nav.vesselsPeople'),
      items: [
        { path: '/vessels', labelKey: 'nav.vessels', icon: FiAnchor },
        { path: '/people', labelKey: 'nav.people', icon: FiUsers },
      ],
    },
    {
      section: t('nav.compliance'),
      items: [
        { path: '/security', labelKey: 'nav.security', icon: FiShield },
        { path: '/fees', labelKey: 'nav.fees', icon: FiDollarSign },
      ],
    },
    {
      section: t('nav.administration'),
      items: [
        { path: '/agents', labelKey: 'nav.agents', icon: FiUserCheck },
        { path: '/customers', labelKey: 'nav.customers', icon: FiBriefcase },
        { path: '/ops-sites', labelKey: 'nav.opsSites', icon: FiMapPin },
        { path: '/settings/tenant', labelKey: 'nav.tenantSettings', icon: FiSettings },
        { path: '/settings/users', labelKey: 'nav.users', icon: FiUser },
        { path: '/settings/ais', labelKey: 'nav.aisConfig', icon: FiRadio },
      ],
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check scroll position and update arrow visibility
  const checkScrollPosition = () => {
    if (!sidebarRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = sidebarRef.current;
    setShowUpArrow(scrollTop > 0);
    setShowDownArrow(scrollTop < scrollHeight - clientHeight - 1);
  };

  // Scroll handlers
  const scrollUp = () => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollBy({ top: -100, behavior: 'smooth' });
    }
  };

  const scrollDown = () => {
    if (sidebarRef.current) {
      sidebarRef.current.scrollBy({ top: 100, behavior: 'smooth' });
    }
  };

  // Check scroll position on mount and when sidebar state changes
  useEffect(() => {
    // Delay to ensure DOM is fully rendered
    const timeoutId = setTimeout(() => {
      checkScrollPosition();
    }, 100);
    
    const sidebar = sidebarRef.current;
    if (sidebar) {
      sidebar.addEventListener('scroll', checkScrollPosition);
      window.addEventListener('resize', checkScrollPosition);
    }
    
    return () => {
      if (sidebar) {
        sidebar.removeEventListener('scroll', checkScrollPosition);
        window.removeEventListener('resize', checkScrollPosition);
      }
      clearTimeout(timeoutId);
    };
  }, [isOpen, isCollapsed]);

  const sidebarClass = `${styles.sidebar} ${isOpen ? styles.open : ''} ${isMobile ? styles.mobile : ''} ${isCollapsed ? styles.collapsed : ''}`;

  return (
    <>
      <aside className={sidebarClass} ref={sidebarRef}>
        {/* Scroll Up Arrow */}
        {showUpArrow && (
          <button 
            className={styles.scrollArrow} 
            onClick={scrollUp}
            aria-label="Scroll up"
          >
            <FiChevronUp size={20} />
          </button>
        )}
        
        <nav className={styles.nav}>
          {menuItems.map((section, sectionIdx) => (
            <div key={sectionIdx} className={styles.section}>
              {!isCollapsed && <h3 className={styles.sectionTitle}>{section.section}</h3>}
              <ul className={styles.menuList}>
                {section.items.map((item) => {
                  const label = t(item.labelKey);
                  return (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `${styles.menuItem} ${isActive ? styles.active : ''}`
                        }
                        onClick={isMobile ? onClose : undefined}
                        title={isCollapsed ? label : ''}
                      >
                        <span className={styles.icon}>
                          <item.icon size={20} />
                        </span>
                        {!isCollapsed && <span className={styles.label}>{label}</span>}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className={styles.footer}>
          <button 
            className={styles.logoutButton} 
            onClick={handleLogout}
            title={isCollapsed ? t('nav.logout') : ''}
          >
            <span className={styles.icon}>
              <FiLogOut size={20} />
            </span>
            {!isCollapsed && <span className={styles.label}>{t('nav.logout')}</span>}
          </button>
        </div>
        
        {/* Scroll Down Arrow */}
        {showDownArrow && (
          <button 
            className={`${styles.scrollArrow} ${styles.scrollArrowDown}`} 
            onClick={scrollDown}
            aria-label="Scroll down"
          >
            <FiChevronDown size={20} />
          </button>
        )}
      </aside>
    </>
  );
}

export default Sidebar;

