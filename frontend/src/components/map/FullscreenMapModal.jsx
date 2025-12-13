import React, { useEffect, useRef } from 'react';
import DashboardMapMapLibre from './DashboardMapMapLibre';
import { FiX } from 'react-icons/fi';
import styles from './FullscreenMapModal.module.css';

/**
 * Fullscreen map modal
 * Shows only the map and vessels in fullscreen mode
 */
function FullscreenMapModal({ vessels, tenantVessels, onVesselClick, onClose }) {
  const modalContentRef = useRef(null);

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

  // Ensure modal content has proper dimensions and trigger map resize
  useEffect(() => {
    if (modalContentRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        // Trigger window resize event for map to recalculate dimensions
        window.dispatchEvent(new Event('resize'));
      }, 100);

      // Also observe resize changes
      const resizeObserver = new ResizeObserver(() => {
        window.dispatchEvent(new Event('resize'));
      });
      resizeObserver.observe(modalContentRef.current);
      
      return () => {
        clearTimeout(timer);
        resizeObserver.disconnect();
      };
    }
  }, []);

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
      <div ref={modalContentRef} className={styles.modalContent}>
        <DashboardMapMapLibre
          vessels={vessels}
          tenantVessels={tenantVessels}
          geofences={null}
          opsSites={null}
          onVesselClick={onVesselClick}
          showControls={true}
          isDashboardWidget={false}
        />
      </div>
    </div>
  );
}

export default FullscreenMapModal;

