import { useEffect } from 'react';
import DashboardMapMapLibre from './DashboardMapMapLibre';
import { FiX, FiMinimize2 } from 'react-icons/fi';
import styles from './FullscreenMapModal.module.css';

/**
 * Fullscreen map modal
 * Shows only the map and vessels in fullscreen mode
 */
function FullscreenMapModal({ vessels, onVesselClick, onClose }) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className={styles.fullscreenModal}>
      <div className={styles.modalHeader}>
        <h2 className={styles.modalTitle}>Mapa Completo</h2>
        <button
          className={styles.closeButton}
          onClick={onClose}
          title="Close fullscreen map"
          aria-label="Close fullscreen map"
        >
          <FiX />
        </button>
      </div>
      <div className={styles.modalContent}>
        <DashboardMapMapLibre
          vessels={vessels}
          geofences={null}
          opsSites={null}
          onVesselClick={onVesselClick}
        />
      </div>
    </div>
  );
}

export default FullscreenMapModal;

