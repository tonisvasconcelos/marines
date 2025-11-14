import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import styles from './Layout.module.css';

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      // On mobile: toggle open/closed
      setSidebarOpen(!sidebarOpen);
    } else {
      // On desktop: toggle collapsed/expanded
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const closeSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className={styles.layout}>
      <Topbar onMenuClick={toggleSidebar} />
      <div className={styles.container}>
        <Sidebar 
          isOpen={sidebarOpen} 
          isCollapsed={sidebarCollapsed}
          onClose={closeSidebar} 
          isMobile={isMobile} 
        />
        {isMobile && sidebarOpen && (
          <div className={styles.overlay} onClick={closeSidebar} />
        )}
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

export default Layout;

